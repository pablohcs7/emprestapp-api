export abstract class LoanPaymentReadPort {
  abstract hasPaymentsForLoan(
    loanId: string,
    userId: string,
  ): Promise<boolean>;
}
