import { Injectable } from '@nestjs/common';

import { ContactRepository } from '../domain/contact.repository';
import { Contact } from '../domain/contact.types';
import { ContactLoanReadPort } from '../domain/contact-loan-read.port';

export class ContactLifecyclePolicyError extends Error {
  constructor(
    public readonly code:
      | 'CONTACT_NOT_FOUND'
      | 'FORBIDDEN_RESOURCE'
      | 'CONTACT_HAS_ACTIVE_LOAN'
      | 'CONTACT_HAS_LOAN_HISTORY',
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ContactNotFoundError extends ContactLifecyclePolicyError {
  constructor() {
    super('CONTACT_NOT_FOUND', 'Contact not found');
  }
}

export class ForbiddenContactResourceError extends ContactLifecyclePolicyError {
  constructor() {
    super('FORBIDDEN_RESOURCE', 'Forbidden resource');
  }
}

export class ContactHasActiveLoanError extends ContactLifecyclePolicyError {
  constructor() {
    super(
      'CONTACT_HAS_ACTIVE_LOAN',
      'Contact cannot be archived while it has an active loan',
    );
  }
}

export class ContactHasLoanHistoryError extends ContactLifecyclePolicyError {
  constructor() {
    super(
      'CONTACT_HAS_LOAN_HISTORY',
      'Contact cannot be deleted while it has loan history',
    );
  }
}

@Injectable()
export class ContactLifecyclePolicyService {
  constructor(
    private readonly contactRepository: ContactRepository,
    private readonly contactLoanReadPort: ContactLoanReadPort,
  ) {}

  async archiveContact(userId: string, contactId: string): Promise<Contact> {
    await this.ensureContactExists(userId, contactId);
    await this.ensureContactHasNoActiveLoan(userId, contactId);

    const archived = await this.contactRepository.archive(
      contactId,
      userId,
      new Date(),
    );

    if (!archived) {
      throw new ContactNotFoundError();
    }

    return archived;
  }

  async reactivateContact(userId: string, contactId: string): Promise<Contact> {
    await this.ensureContactExists(userId, contactId);

    const reactivated = await this.contactRepository.reactivate(
      contactId,
      userId,
    );

    if (!reactivated) {
      throw new ContactNotFoundError();
    }

    return reactivated;
  }

  async deleteContact(userId: string, contactId: string): Promise<void> {
    await this.ensureContactExists(userId, contactId);
    await this.ensureContactHasNoLoanHistory(userId, contactId);

    const deleted = await this.contactRepository.delete(contactId, userId);

    if (!deleted) {
      throw new ContactNotFoundError();
    }
  }

  private async ensureContactExists(
    userId: string,
    contactId: string,
  ): Promise<Contact> {
    const contact = await this.contactRepository.findByIdForUser(
      contactId,
      userId,
    );

    if (!contact) {
      const existingContact = await this.contactRepository.findById(contactId);

      if (existingContact) {
        throw new ForbiddenContactResourceError();
      }

      throw new ContactNotFoundError();
    }

    return contact;
  }

  private async ensureContactHasNoActiveLoan(
    userId: string,
    contactId: string,
  ): Promise<void> {
    const hasActiveLoan =
      await this.contactLoanReadPort.hasActiveLoanForContact(contactId, userId);

    if (hasActiveLoan) {
      throw new ContactHasActiveLoanError();
    }
  }

  private async ensureContactHasNoLoanHistory(
    userId: string,
    contactId: string,
  ): Promise<void> {
    const hasLoanHistory =
      await this.contactLoanReadPort.hasLoanHistoryForContact(contactId, userId);

    if (hasLoanHistory) {
      throw new ContactHasLoanHistoryError();
    }
  }
}
