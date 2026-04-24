import { Injectable } from '@nestjs/common';

import { InstallmentRepository } from '../../loans/domain/installment.repository';
import { Installment } from '../../loans/domain/installment.types';
import { LoanRepository } from '../../loans/domain/loan.repository';
import { Loan } from '../../loans/domain/loan.types';
import { PaymentRepository } from '../domain/payment.repository';
import { Payment } from '../domain/payment.types';
import { PaymentView } from '../presentation/payments.types';
import { PaymentRecalculationService } from './payment-recalculation.service';

export interface RegisterPaymentInput {
  loanId: string;
  installmentId: string;
  amountCents: number;
  paidAt: string;
  method?: string;
  note?: string;
}

export class PaymentApplicationError extends Error {
  constructor(
    public readonly code:
      | 'LOAN_NOT_FOUND'
      | 'INSTALLMENT_NOT_FOUND'
      | 'PAYMENT_NOT_FOUND'
      | 'FORBIDDEN_RESOURCE'
      | 'INVALID_PAYMENT_AMOUNT'
      | 'INVALID_PAYMENT_SEQUENCE'
      | 'LOAN_CANCELED'
      | 'PAYMENT_ALREADY_CANCELED',
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class LoanNotFoundError extends PaymentApplicationError {
  constructor() {
    super('LOAN_NOT_FOUND', 'Loan not found');
  }
}

export class InstallmentNotFoundError extends PaymentApplicationError {
  constructor() {
    super('INSTALLMENT_NOT_FOUND', 'Installment not found');
  }
}

export class PaymentNotFoundError extends PaymentApplicationError {
  constructor() {
    super('PAYMENT_NOT_FOUND', 'Payment not found');
  }
}

export class ForbiddenPaymentResourceError extends PaymentApplicationError {
  constructor() {
    super('FORBIDDEN_RESOURCE', 'Forbidden resource');
  }
}

export class InvalidPaymentAmountError extends PaymentApplicationError {
  constructor() {
    super('INVALID_PAYMENT_AMOUNT', 'Payment amount is invalid');
  }
}

export class InvalidPaymentSequenceError extends PaymentApplicationError {
  constructor() {
    super('INVALID_PAYMENT_SEQUENCE', 'Payment must target the next open installment');
  }
}

export class LoanCanceledError extends PaymentApplicationError {
  constructor() {
    super('LOAN_CANCELED', 'Loan is canceled');
  }
}

export class PaymentAlreadyCanceledError extends PaymentApplicationError {
  constructor() {
    super('PAYMENT_ALREADY_CANCELED', 'Payment is already canceled');
  }
}

@Injectable()
export class PaymentsApplicationService {
  constructor(
    private readonly loanRepository: LoanRepository,
    private readonly installmentRepository: InstallmentRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly paymentRecalculationService: PaymentRecalculationService,
  ) {}

  async register(
    userId: string,
    input: RegisterPaymentInput,
  ): Promise<PaymentView> {
    const loan = await this.assertLoanAccessible(userId, input.loanId);

    if (loan.status === 'canceled') {
      throw new LoanCanceledError();
    }

    const installment = await this.assertInstallmentAccessible(
      userId,
      input.installmentId,
    );

    if (installment.loanId !== loan.id) {
      throw new InstallmentNotFoundError();
    }

    const nextOpenInstallment = await this.installmentRepository.findNextOpenForLoan(
      loan.id,
      userId,
    );

    if (!nextOpenInstallment || nextOpenInstallment.id !== installment.id) {
      throw new InvalidPaymentSequenceError();
    }

    const activePayments = await this.paymentRepository.listActiveByInstallmentId(
      installment.id,
      userId,
    );
    const paidAmountCents = activePayments.reduce(
      (total, payment) => total + payment.amountCents,
      0,
    );
    const remainingAmountCents =
      installment.expectedAmountCents - paidAmountCents;

    if (input.amountCents <= 0 || input.amountCents > remainingAmountCents) {
      throw new InvalidPaymentAmountError();
    }

    const payment = await this.paymentRepository.register({
      userId,
      loanId: loan.id,
      installmentId: installment.id,
      amountCents: input.amountCents,
      paidAt: new Date(input.paidAt),
      method: input.method ?? null,
      note: input.note ?? null,
    });

    await this.paymentRecalculationService.recalculateForLoan(
      userId,
      loan.id,
      installment.id,
      payment.paidAt,
    );

    return this.toView(payment);
  }

  async cancel(userId: string, paymentId: string): Promise<PaymentView> {
    const payment = await this.assertPaymentAccessible(userId, paymentId);

    if (payment.status === 'canceled') {
      throw new PaymentAlreadyCanceledError();
    }

    const canceledAt = new Date();
    const canceledPayment = await this.paymentRepository.cancel(
      paymentId,
      userId,
      canceledAt,
    );

    if (!canceledPayment) {
      throw new PaymentNotFoundError();
    }

    await this.paymentRecalculationService.recalculateForLoan(
      userId,
      canceledPayment.loanId,
      canceledPayment.installmentId,
      canceledAt,
    );

    return this.toView(canceledPayment);
  }

  private async assertLoanAccessible(userId: string, loanId: string): Promise<Loan> {
    const loan = await this.loanRepository.findByIdForUser(loanId, userId);

    if (!loan) {
      const existingLoan = await this.loanRepository.findById(loanId);

      if (existingLoan) {
        throw new ForbiddenPaymentResourceError();
      }

      throw new LoanNotFoundError();
    }

    return loan;
  }

  private async assertInstallmentAccessible(
    userId: string,
    installmentId: string,
  ): Promise<Installment> {
    const installment = await this.installmentRepository.findByIdForUser(
      installmentId,
      userId,
    );

    if (!installment) {
      const existingInstallment = await this.installmentRepository.findById(
        installmentId,
      );

      if (existingInstallment) {
        throw new ForbiddenPaymentResourceError();
      }

      throw new InstallmentNotFoundError();
    }

    return installment;
  }

  private async assertPaymentAccessible(
    userId: string,
    paymentId: string,
  ): Promise<Payment> {
    const payment = await this.paymentRepository.findByIdForUser(
      paymentId,
      userId,
    );

    if (!payment) {
      const existingPayment = await this.paymentRepository.findById(paymentId);

      if (existingPayment) {
        throw new ForbiddenPaymentResourceError();
      }

      throw new PaymentNotFoundError();
    }

    return payment;
  }

  private toView(payment: Payment): PaymentView {
    return {
      id: payment.id,
      loanId: payment.loanId,
      installmentId: payment.installmentId,
      amountCents: payment.amountCents,
      paidAt: payment.paidAt,
      method: payment.method,
      note: payment.note,
      status: payment.status,
      createdAt: payment.createdAt,
      canceledAt: payment.canceledAt,
    };
  }
}
