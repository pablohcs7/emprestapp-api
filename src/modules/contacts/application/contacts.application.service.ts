import { Injectable } from '@nestjs/common';

import { ContactRepository } from '../domain/contact.repository';
import {
  Contact,
  ContactListFilters,
  CreateContactRecord,
} from '../domain/contact.types';
import {
  ContactListView,
  ContactView,
} from '../presentation/contacts.types';

export type CreateContactInput = Omit<CreateContactRecord, 'userId'>;

export interface UpdateContactInput {
  fullName?: string;
  documentId?: string;
  phone?: string;
  notes?: string;
}

export class ContactAccessError extends Error {
  constructor(
    public readonly code: 'CONTACT_NOT_FOUND',
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class ContactNotFoundError extends ContactAccessError {
  constructor() {
    super('CONTACT_NOT_FOUND', 'Contact not found');
  }
}

@Injectable()
export class ContactsApplicationService {
  constructor(private readonly contactRepository: ContactRepository) {}

  async create(
    userId: string,
    input: CreateContactInput,
  ): Promise<ContactView> {
    const created = await this.contactRepository.create({
      userId,
      ...input,
    });

    return this.toView(created);
  }

  async update(
    userId: string,
    contactId: string,
    input: UpdateContactInput,
  ): Promise<ContactView> {
    const existing = await this.contactRepository.findByIdForUser(
      contactId,
      userId,
    );

    if (!existing) {
      throw await this.resolveMissingScopedContact(contactId);
    }

    const updated = await this.contactRepository.update({
      ...existing,
      fullName: input.fullName ?? existing.fullName,
      documentId:
        input.documentId !== undefined ? input.documentId : existing.documentId,
      phone: input.phone !== undefined ? input.phone : existing.phone,
      notes: input.notes !== undefined ? input.notes : existing.notes,
      userId,
    });

    return this.toView(updated);
  }

  async list(
    userId: string,
    filters: ContactListFilters,
  ): Promise<ContactListView> {
    const result = await this.contactRepository.listForUser(userId, filters);

    return {
      items: result.items.map((contact) => this.toView(contact)),
      page: filters.page,
      pageSize: filters.pageSize,
      total: result.total,
    };
  }

  async detail(
    userId: string,
    contactId: string,
  ): Promise<ContactView> {
    const contact = await this.contactRepository.findByIdForUser(
      contactId,
      userId,
    );

    if (!contact) {
      throw await this.resolveMissingScopedContact(contactId);
    }

    return this.toView(contact);
  }

  private async resolveMissingScopedContact(
    contactId: string,
  ): Promise<ContactAccessError> {
    const contact = await this.contactRepository.findById(contactId);

    if (!contact) {
      return new ContactNotFoundError();
    }

    return new ContactNotFoundError();
  }

  private toView(contact: Contact): ContactView {
    return {
      id: contact.id,
      fullName: contact.fullName,
      documentId: contact.documentId,
      phone: contact.phone,
      notes: contact.notes,
      status: contact.status,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
      archivedAt: contact.archivedAt,
    };
  }
}
