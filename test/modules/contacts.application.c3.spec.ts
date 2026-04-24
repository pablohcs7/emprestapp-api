import {
  Contact,
  ContactListFilters,
  ContactListResult,
  CreateContactRecord,
} from '../../src/modules/contacts/domain/contact.types';
import { ContactRepository } from '../../src/modules/contacts/domain/contact.repository';
import {
  ContactNotFoundError,
  ContactsApplicationService,
  CreateContactInput,
  UpdateContactInput,
} from '../../src/modules/contacts/application/contacts.application.service';

describe('contacts application service C3', () => {
  it('creates a contact for the authenticated user', async () => {
    const repository = new FakeContactRepository();
    repository.createResult = buildContact({
      id: 'ctc_2',
      userId: 'usr_1',
      fullName: 'John Smith',
      documentId: '12345678900',
      phone: '+5511999999999',
      notes: 'School friend',
    });

    const service = new ContactsApplicationService(repository);
    const input: CreateContactInput = {
      fullName: 'John Smith',
      documentId: '12345678900',
      phone: '+5511999999999',
      notes: 'School friend',
    };

    const result = await service.create('usr_1', input);

    expect(repository.createInput).toEqual({
      userId: 'usr_1',
      ...input,
    });
    expect(result).toMatchObject({
      id: 'ctc_2',
      fullName: 'John Smith',
      documentId: '12345678900',
      phone: '+5511999999999',
      notes: 'School friend',
      status: 'active',
    });
  });

  it('updates only the owned contact and preserves unrelated fields', async () => {
    const repository = new FakeContactRepository();
    repository.findResult = buildContact({
      id: 'ctc_1',
      userId: 'usr_1',
      fullName: 'John Smith',
      documentId: '12345678900',
      phone: '+5511999999999',
      notes: 'School friend',
      status: 'archived',
      archivedAt: new Date('2026-04-22T00:00:00.000Z'),
    });
    repository.updateResult = buildContact({
      id: 'ctc_1',
      userId: 'usr_1',
      fullName: 'John Smith Jr.',
      documentId: '12345678900',
      phone: '+5511888888888',
      notes: 'Updated notes',
      status: 'archived',
      archivedAt: new Date('2026-04-22T00:00:00.000Z'),
      updatedAt: new Date('2026-04-23T12:00:00.000Z'),
    });

    const service = new ContactsApplicationService(repository);
    const input: UpdateContactInput = {
      fullName: 'John Smith Jr.',
      phone: '+5511888888888',
      notes: 'Updated notes',
    };

    const result = await service.update('usr_1', 'ctc_1', input);

    expect(repository.findCalls).toEqual([
      { contactId: 'ctc_1', userId: 'usr_1' },
    ]);
    expect(repository.updateInput).toMatchObject({
      id: 'ctc_1',
      userId: 'usr_1',
      fullName: 'John Smith Jr.',
      documentId: '12345678900',
      phone: '+5511888888888',
      notes: 'Updated notes',
      status: 'archived',
    });
    expect(result).toMatchObject({
      id: 'ctc_1',
      fullName: 'John Smith Jr.',
      phone: '+5511888888888',
      notes: 'Updated notes',
      status: 'archived',
    });
  });

  it('throws not-found when the contact does not exist', async () => {
    const repository = new FakeContactRepository();
    repository.findResult = null;

    const service = new ContactsApplicationService(repository);

    const updateAttempt = service.update('usr_1', 'ctc_1', {
      fullName: 'New Name',
    });

    await expect(updateAttempt).rejects.toBeInstanceOf(ContactNotFoundError);
    expect(repository.findCalls).toEqual([
      { contactId: 'ctc_1', userId: 'usr_1' },
    ]);
    expect(repository.updateInput).toBeUndefined();
  });

  it('lists only the authenticated user contacts with pagination metadata', async () => {
    const repository = new FakeContactRepository();
    repository.listResult = {
      items: [
        buildContact({
          id: 'ctc_1',
          userId: 'usr_1',
          fullName: 'John Smith',
        }),
        buildContact({
          id: 'ctc_2',
          userId: 'usr_1',
          fullName: 'Jane Doe',
        }),
      ],
      total: 2,
    };

    const service = new ContactsApplicationService(repository);
    const filters: ContactListFilters = {
      status: 'active',
      search: 'john',
      page: 2,
      pageSize: 10,
    };

    const result = await service.list('usr_1', filters);

    expect(repository.listCalls).toEqual([
      { userId: 'usr_1', filters },
    ]);
    expect(result.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'ctc_1',
          fullName: 'John Smith',
        }),
        expect.objectContaining({
          id: 'ctc_2',
          fullName: 'Jane Doe',
        }),
      ]),
    );
    expect(result).toMatchObject({
      page: 2,
      pageSize: 10,
      total: 2,
    });
  });

  it('retrieves contact details only through the ownership-scoped lookup', async () => {
    const repository = new FakeContactRepository();
    repository.findResult = buildContact({
      id: 'ctc_1',
      userId: 'usr_1',
      fullName: 'John Smith',
    });

    const service = new ContactsApplicationService(repository);

    const result = await service.detail('usr_1', 'ctc_1');

    expect(repository.findCalls).toEqual([
      { contactId: 'ctc_1', userId: 'usr_1' },
    ]);
    expect(result).toMatchObject({
      id: 'ctc_1',
      fullName: 'John Smith',
    });
  });
});

class FakeContactRepository extends ContactRepository {
  createInput?: CreateContactRecord;
  createResult: Contact = buildContact();
  findCalls: Array<{ contactId: string; userId: string }> = [];
  findResult: Contact | null = buildContact();
  listCalls: Array<{ userId: string; filters: ContactListFilters }> = [];
  listResult: ContactListResult = {
    items: [buildContact()],
    total: 1,
  };
  updateInput?: Contact;
  updateResult: Contact = buildContact();

  async create(input: CreateContactRecord): Promise<Contact> {
    this.createInput = input;
    return this.createResult;
  }

  async findById(contactId: string): Promise<Contact | null> {
    return this.findResult;
  }

  async findByIdForUser(
    contactId: string,
    userId: string,
  ): Promise<Contact | null> {
    this.findCalls.push({ contactId, userId });
    return this.findResult;
  }

  async listForUser(
    userId: string,
    filters: ContactListFilters,
  ): Promise<ContactListResult> {
    this.listCalls.push({ userId, filters });
    return this.listResult;
  }

  async update(contact: Contact): Promise<Contact> {
    this.updateInput = contact;
    return this.updateResult;
  }

  async archive(
    contactId: string,
    userId: string,
    archivedAt: Date,
  ): Promise<Contact | null> {
    return null;
  }

  async reactivate(
    contactId: string,
    userId: string,
  ): Promise<Contact | null> {
    return null;
  }

  async delete(contactId: string, userId: string): Promise<boolean> {
    return false;
  }
}

const buildContact = (overrides: Partial<Contact> = {}): Contact => ({
  id: 'ctc_1',
  userId: 'usr_1',
  fullName: 'John Smith',
  documentId: '12345678900',
  phone: '+5511999999999',
  notes: 'School friend',
  status: 'active',
  createdAt: new Date('2026-04-23T00:00:00.000Z'),
  updatedAt: new Date('2026-04-23T00:00:00.000Z'),
  archivedAt: null,
  ...overrides,
});
