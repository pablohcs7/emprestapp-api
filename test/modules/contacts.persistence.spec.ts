import { ContactRepository } from '../../src/modules/contacts/domain/contact.repository';
import {
  Contact,
  ContactStatus,
} from '../../src/modules/contacts/domain/contact.types';
import { contactSchema } from '../../src/modules/contacts/infrastructure/persistence/contact.schema';

describe('contacts persistence foundation', () => {
  it('defines the expected contact repository contract methods', async () => {
    class InMemoryContactRepository extends ContactRepository {
      async create(input: Parameters<ContactRepository['create']>[0]) {
        return createContact({
          id: 'ctc_1',
          userId: input.userId,
          fullName: input.fullName,
          documentId: input.documentId ?? null,
          phone: input.phone ?? null,
          notes: input.notes ?? null,
          status: 'active',
          archivedAt: null,
        });
      }

      async findByIdForUser(contactId: string, userId: string) {
        return createContact({ id: contactId, userId });
      }

      async findById(contactId: string) {
        return createContact({ id: contactId });
      }

      async listForUser() {
        return {
          items: [createContact()],
          total: 1,
        };
      }

      async update(contact: Contact) {
        return contact;
      }

      async archive(contactId: string, userId: string, archivedAt: Date) {
        return createContact({
          id: contactId,
          userId,
          status: 'archived',
          archivedAt,
        });
      }

      async reactivate(contactId: string, userId: string) {
        return createContact({
          id: contactId,
          userId,
          status: 'active',
          archivedAt: null,
        });
      }

      async delete(contactId: string, userId: string) {
        return contactId === 'ctc_1' && userId === 'usr_1';
      }
    }

    const repository = new InMemoryContactRepository();

    await expect(repository.findByIdForUser('ctc_1', 'usr_1')).resolves.toMatchObject({
      id: 'ctc_1',
      userId: 'usr_1',
    });
    expect(typeof repository.create).toBe('function');
    expect(typeof repository.listForUser).toBe('function');
    expect(typeof repository.update).toBe('function');
    expect(typeof repository.archive).toBe('function');
    expect(typeof repository.reactivate).toBe('function');
    expect(typeof repository.delete).toBe('function');
  });

  it('creates the contact schema with ownership, defaults, and timestamps', () => {
    const statusPath = contactSchema.path('status');
    const archivedAtPath = contactSchema.path('archivedAt');

    expect(contactSchema.path('userId')).toBeDefined();
    expect(statusPath.options.default).toBe('active');
    expect(archivedAtPath.options.default).toBeNull();
    expect(contactSchema.get('timestamps')).toBe(true);
  });

  it('declares the indexes required by the contacts data model', () => {
    const indexes = contactSchema.indexes();

    expect(indexes).toEqual(
      expect.arrayContaining([
        [{ userId: 1, status: 1, fullName: 1 }, { background: true }],
        [{ userId: 1, documentId: 1 }, { background: true }],
      ]),
    );
  });

  it('supports archive and reactivate state transitions in repository contract outputs', async () => {
    class InMemoryContactRepository extends ContactRepository {
      async create() {
        return createContact();
      }

      async findByIdForUser() {
        return createContact();
      }

      async findById() {
        return createContact();
      }

      async listForUser() {
        return {
          items: [createContact()],
          total: 1,
        };
      }

      async update(contact: Contact) {
        return contact;
      }

      async archive(contactId: string, userId: string, archivedAt: Date) {
        return createContact({
          id: contactId,
          userId,
          status: 'archived',
          archivedAt,
        });
      }

      async reactivate(contactId: string, userId: string) {
        return createContact({
          id: contactId,
          userId,
          status: 'active',
          archivedAt: null,
        });
      }

      async delete() {
        return true;
      }
    }

    const repository = new InMemoryContactRepository();
    const archivedAt = new Date('2026-04-23T00:00:00.000Z');

    await expect(repository.archive('ctc_1', 'usr_1', archivedAt)).resolves.toMatchObject({
      status: 'archived',
      archivedAt,
    });
    await expect(repository.reactivate('ctc_1', 'usr_1')).resolves.toMatchObject({
      status: 'active',
      archivedAt: null,
    });
  });
});

const createContact = (
  overrides: Partial<Contact> = {},
): Contact => ({
  id: 'ctc_1',
  userId: 'usr_1',
  fullName: 'John Smith',
  documentId: '12345678900',
  phone: '+5511999999999',
  notes: 'School friend',
  status: 'active' as ContactStatus,
  createdAt: new Date('2026-04-23T00:00:00.000Z'),
  updatedAt: new Date('2026-04-23T00:00:00.000Z'),
  archivedAt: null,
  ...overrides,
});
