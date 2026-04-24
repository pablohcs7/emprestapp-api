import { Injectable } from '@nestjs/common';

import { InstallmentRepository } from '../../loans/domain/installment.repository';
import { Installment } from '../../loans/domain/installment.types';
import { LoanCalculationService } from '../../loans/domain/loan-calculation.service';
import {
  LoanInstallmentPayment,
  LoanInstallmentScheduleItem,
} from '../../loans/domain/loan-calculation.types';
import { LoanRepository } from '../../loans/domain/loan.repository';
import { Loan, LoanStatus } from '../../loans/domain/loan.types';
import { PaymentRepository } from '../domain/payment.repository';
import { Payment } from '../domain/payment.types';

export interface PaymentRecalculationResult {
  loan: Loan;
  installment: Installment;
}

@Injectable()
export class PaymentRecalculationService {
  constructor(
    private readonly loanRepository: LoanRepository,
    private readonly installmentRepository: InstallmentRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly loanCalculationService: LoanCalculationService,
  ) {}

  async recalculateForLoan(
    userId: string,
    loanId: string,
    installmentId: string,
    referenceDate: Date = new Date(),
  ): Promise<PaymentRecalculationResult> {
    const [loan, installments, activePayments] = await Promise.all([
      this.loanRepository.findByIdForUser(loanId, userId),
      this.installmentRepository.findByLoanId(loanId, userId),
      this.paymentRepository.listActiveByLoanId(loanId, userId),
    ]);

    if (!loan) {
      throw new Error('Loan not found for recalculation');
    }

    if (!installments.length) {
      throw new Error('Installments not found for recalculation');
    }

    const installmentById = new Map(
      installments.map((installment) => [installment.id, installment]),
    );

    const targetInstallment = installmentById.get(installmentId);

    if (!targetInstallment) {
      throw new Error('Installment not found for recalculation');
    }

    const recalculatedState = this.loanCalculationService.recalculateLoanState({
      installments: installments.map<LoanInstallmentScheduleItem>((installment) => ({
        sequence: installment.sequence,
        dueDate: installment.dueDate,
        expectedAmountCents: installment.expectedAmountCents,
      })),
      payments: this.toCalculationPayments(activePayments, installmentById),
      referenceDate,
    });

    const targetInstallmentState = recalculatedState.installments.find(
      (installment) => installment.sequence === targetInstallment.sequence,
    );

    if (!targetInstallmentState) {
      throw new Error('Target installment state not found after recalculation');
    }

    if (targetInstallmentState.status === 'canceled') {
      throw new Error('Canceled installment state is not valid for payment recalculation');
    }

    const [updatedInstallment, updatedLoan] = await Promise.all([
      this.installmentRepository.updateDerivedState({
        installmentId,
        userId,
        paidAmountCents: targetInstallmentState.paidAmountCents,
        remainingAmountCents: targetInstallmentState.remainingAmountCents,
        status: targetInstallmentState.status,
      }),
      this.loanRepository.updateDerivedState({
        loanId,
        userId,
        status: recalculatedState.status as Exclude<LoanStatus, 'canceled'>,
        currentBalanceCents: recalculatedState.currentBalanceCents,
        totalPaidCents: recalculatedState.totalPaidCents,
      }),
    ]);

    if (!updatedInstallment || !updatedLoan) {
      throw new Error('Failed to persist recalculated payment state');
    }

    return {
      loan: updatedLoan,
      installment: updatedInstallment,
    };
  }

  private toCalculationPayments(
    payments: Payment[],
    installmentById: Map<string, Installment>,
  ): LoanInstallmentPayment[] {
    const calculationPayments: LoanInstallmentPayment[] = [];

    for (const payment of payments) {
      const installment = installmentById.get(payment.installmentId);

      if (!installment) {
        continue;
      }

      calculationPayments.push({
        installmentSequence: installment.sequence,
        amountCents: payment.amountCents,
        status: payment.status,
      });
    }

    return calculationPayments;
  }
}
