export abstract class ContactLoanReadPort {
  abstract hasActiveLoanForContact(
    contactId: string,
    userId: string,
  ): Promise<boolean>;

  abstract hasLoanHistoryForContact(
    contactId: string,
    userId: string,
  ): Promise<boolean>;
}
