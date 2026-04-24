import { Injectable } from '@nestjs/common';

import { LoanPaymentReadPort } from '../domain/loan-payment-read.port';

@Injectable()
export class InMemoryLoanPaymentReadAdapter implements LoanPaymentReadPort {
  private readonly loanIdsWithPayments = new Set<string>();

  async hasPaymentsForLoan(
    loanId: string,
    _userId: string,
  ): Promise<boolean> {
    return this.loanIdsWithPayments.has(loanId);
  }

  setLoansWithPayments(loanIds: string[]): void {
    this.loanIdsWithPayments.clear();
    loanIds.forEach((loanId) => this.loanIdsWithPayments.add(loanId));
  }

  reset(): void {
    this.loanIdsWithPayments.clear();
  }
}
