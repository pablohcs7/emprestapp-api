import { Injectable } from '@nestjs/common';

import { InstallmentRepository } from '../domain/installment.repository';
import { LoanPaymentReadPort } from '../domain/loan-payment-read.port';
import { LoanRepository } from '../domain/loan.repository';
import { Loan } from '../domain/loan.types';

export class LoanLifecyclePolicyError extends Error {
  constructor(
    public readonly code:
      | 'LOAN_NOT_FOUND'
      | 'FORBIDDEN_RESOURCE'
      | 'LOAN_HAS_PAYMENTS',
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class LoanNotFoundError extends LoanLifecyclePolicyError {
  constructor() {
    super('LOAN_NOT_FOUND', 'Loan not found');
  }
}

export class ForbiddenLoanResourceError extends LoanLifecyclePolicyError {
  constructor() {
    super('FORBIDDEN_RESOURCE', 'Forbidden resource');
  }
}

export class LoanHasPaymentsError extends LoanLifecyclePolicyError {
  constructor() {
    super('LOAN_HAS_PAYMENTS', 'Loan cannot be changed while it has payments');
  }
}

@Injectable()
export class LoanLifecyclePolicyService {
  constructor(
    private readonly loanRepository: LoanRepository,
    private readonly installmentRepository: InstallmentRepository,
    private readonly loanPaymentReadPort: LoanPaymentReadPort,
  ) {}

  async cancelLoan(userId: string, loanId: string): Promise<Loan> {
    await this.ensureLoanExists(userId, loanId);
    await this.ensureLoanHasNoPayments(userId, loanId);

    const canceledAt = new Date();
    const canceledLoan = await this.loanRepository.cancel(
      loanId,
      userId,
      canceledAt,
    );

    if (!canceledLoan) {
      throw new LoanNotFoundError();
    }

    await this.installmentRepository.cancelByLoan(loanId, userId, canceledAt);

    return canceledLoan;
  }

  async deleteLoan(userId: string, loanId: string): Promise<void> {
    await this.ensureLoanExists(userId, loanId);
    await this.ensureLoanHasNoPayments(userId, loanId);

    const deleted = await this.loanRepository.delete(loanId, userId);

    if (!deleted) {
      throw new LoanNotFoundError();
    }

    await this.installmentRepository.deleteByLoan(loanId, userId);
  }

  async cancel(userId: string, loanId: string): Promise<Loan> {
    return this.cancelLoan(userId, loanId);
  }

  async delete(userId: string, loanId: string): Promise<void> {
    await this.deleteLoan(userId, loanId);
  }

  private async ensureLoanExists(
    userId: string,
    loanId: string,
  ): Promise<Loan> {
    const loan = await this.loanRepository.findByIdForUser(loanId, userId);

    if (!loan) {
      const existingLoan = await this.loanRepository.findById(loanId);

      if (existingLoan) {
        throw new ForbiddenLoanResourceError();
      }

      throw new LoanNotFoundError();
    }

    return loan;
  }

  private async ensureLoanHasNoPayments(
    userId: string,
    loanId: string,
  ): Promise<void> {
    const hasPayments = await this.loanPaymentReadPort.hasPaymentsForLoan(
      loanId,
      userId,
    );

    if (hasPayments) {
      throw new LoanHasPaymentsError();
    }
  }
}
