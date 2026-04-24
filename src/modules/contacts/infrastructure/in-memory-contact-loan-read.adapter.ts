import { Injectable } from '@nestjs/common';

import { ContactLoanReadPort } from '../domain/contact-loan-read.port';

@Injectable()
export class InMemoryContactLoanReadAdapter implements ContactLoanReadPort {
  private activeLoanContacts = new Set<string>();
  private loanHistoryContacts = new Set<string>();

  async hasActiveLoanForContact(contactId: string): Promise<boolean> {
    return this.activeLoanContacts.has(contactId);
  }

  async hasLoanHistoryForContact(contactId: string): Promise<boolean> {
    return this.loanHistoryContacts.has(contactId);
  }

  setActiveLoanContacts(contactIds: string[]): void {
    this.activeLoanContacts = new Set(contactIds);
  }

  setLoanHistoryContacts(contactIds: string[]): void {
    this.loanHistoryContacts = new Set(contactIds);
  }

  reset(): void {
    this.activeLoanContacts.clear();
    this.loanHistoryContacts.clear();
  }
}
