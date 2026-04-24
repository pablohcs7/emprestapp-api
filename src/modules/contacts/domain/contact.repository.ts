import {
  Contact,
  ContactListFilters,
  ContactListResult,
  CreateContactRecord,
} from './contact.types';

export abstract class ContactRepository {
  abstract create(input: CreateContactRecord): Promise<Contact>;
  abstract findById(contactId: string): Promise<Contact | null>;
  abstract findByIdForUser(contactId: string, userId: string): Promise<Contact | null>;
  abstract listForUser(userId: string, filters: ContactListFilters): Promise<ContactListResult>;
  abstract update(contact: Contact): Promise<Contact>;
  abstract archive(contactId: string, userId: string, archivedAt: Date): Promise<Contact | null>;
  abstract reactivate(contactId: string, userId: string): Promise<Contact | null>;
  abstract delete(contactId: string, userId: string): Promise<boolean>;
}
