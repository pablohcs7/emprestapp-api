import { ContactRepository } from '../../src/modules/contacts/domain/contact.repository';
import {
  Contact,
  ContactStatus,
} from '../../src/modules/contacts/domain/contact.types';
import { ContactLoanReadPort } from '../../src/modules/contacts/domain/contact-loan-read.port';
import {
  ContactHasActiveLoanError,
  ContactHasLoanHistoryError,
  ContactLifecyclePolicyService,
  ContactNotFoundError,
} from '../../src/modules/contacts/application/contact-lifecycle-policy.service';

describe('contacts application c4', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-23T10:15:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('archives a contact when there is no active loan', async () => {
    const contactRepository = createContactRepository();
    const contactLoanReadPort = createContactLoanReadPort();
    const service = new ContactLifecyclePolicyService(
      contactRepository,
      contactLoanReadPort,
    );

    contactRepository.findByIdForUser.mockResolvedValue(createContact());
    contactLoanReadPort.hasActiveLoanForContact.mockResolvedValue(false);
    contactRepository.archive.mockResolvedValue(
      createContact({
        status: 'archived',
        archivedAt: new Date('2026-04-23T10:15:00.000Z'),
      }),
    );

    const result = await service.archiveContact('usr_1', 'ctc_1');

    expect(result.status).toBe('archived');
    expect(contactLoanReadPort.hasActiveLoanForContact).toHaveBeenCalledWith(
      'ctc_1',
      'usr_1',
    );
    expect(contactRepository.archive).toHaveBeenCalledWith(
      'ctc_1',
      'usr_1',
      new Date('2026-04-23T10:15:00.000Z'),
    );
  });

  it('blocks archive when the contact has an active loan', async () => {
    const contactRepository = createContactRepository();
    const contactLoanReadPort = createContactLoanReadPort();
    const service = new ContactLifecyclePolicyService(
      contactRepository,
      contactLoanReadPort,
    );

    contactRepository.findByIdForUser.mockResolvedValue(createContact());
    contactLoanReadPort.hasActiveLoanForContact.mockResolvedValue(true);

    const archiveAttempt = service.archiveContact('usr_1', 'ctc_1');

    await expect(archiveAttempt).rejects.toMatchObject({
      code: 'CONTACT_HAS_ACTIVE_LOAN',
    });
    await expect(archiveAttempt).rejects.toBeInstanceOf(
      ContactHasActiveLoanError,
    );
    expect(contactRepository.archive).not.toHaveBeenCalled();
  });

  it('reactivates an archived contact without reading loan state', async () => {
    const contactRepository = createContactRepository();
    const contactLoanReadPort = createContactLoanReadPort();
    const service = new ContactLifecyclePolicyService(
      contactRepository,
      contactLoanReadPort,
    );

    contactRepository.findByIdForUser.mockResolvedValue(
      createContact({ status: 'archived', archivedAt: new Date('2026-04-22T00:00:00.000Z') }),
    );
    contactRepository.reactivate.mockResolvedValue(
      createContact({ status: 'active', archivedAt: null }),
    );

    const result = await service.reactivateContact('usr_1', 'ctc_1');

    expect(result.status).toBe('active');
    expect(contactLoanReadPort.hasActiveLoanForContact).not.toHaveBeenCalled();
    expect(contactLoanReadPort.hasLoanHistoryForContact).not.toHaveBeenCalled();
    expect(contactRepository.reactivate).toHaveBeenCalledWith('ctc_1', 'usr_1');
  });

  it('deletes a contact when there is no loan history', async () => {
    const contactRepository = createContactRepository();
    const contactLoanReadPort = createContactLoanReadPort();
    const service = new ContactLifecyclePolicyService(
      contactRepository,
      contactLoanReadPort,
    );

    contactRepository.findByIdForUser.mockResolvedValue(createContact());
    contactLoanReadPort.hasLoanHistoryForContact.mockResolvedValue(false);
    contactRepository.delete.mockResolvedValue(true);

    await expect(service.deleteContact('usr_1', 'ctc_1')).resolves.toBeUndefined();
    expect(contactLoanReadPort.hasLoanHistoryForContact).toHaveBeenCalledWith(
      'ctc_1',
      'usr_1',
    );
    expect(contactRepository.delete).toHaveBeenCalledWith('ctc_1', 'usr_1');
  });

  it('blocks delete when the contact has loan history', async () => {
    const contactRepository = createContactRepository();
    const contactLoanReadPort = createContactLoanReadPort();
    const service = new ContactLifecyclePolicyService(
      contactRepository,
      contactLoanReadPort,
    );

    contactRepository.findByIdForUser.mockResolvedValue(createContact());
    contactLoanReadPort.hasLoanHistoryForContact.mockResolvedValue(true);

    const deleteAttempt = service.deleteContact('usr_1', 'ctc_1');

    await expect(deleteAttempt).rejects.toMatchObject({
      code: 'CONTACT_HAS_LOAN_HISTORY',
    });
    await expect(deleteAttempt).rejects.toBeInstanceOf(
      ContactHasLoanHistoryError,
    );
    expect(contactRepository.delete).not.toHaveBeenCalled();
  });

  it('throws a not-found error when the contact does not exist', async () => {
    const contactRepository = createContactRepository();
    const contactLoanReadPort = createContactLoanReadPort();
    const service = new ContactLifecyclePolicyService(
      contactRepository,
      contactLoanReadPort,
    );

    contactRepository.findByIdForUser.mockResolvedValue(null);

    const reactivateAttempt = service.reactivateContact('usr_1', 'ctc_1');

    await expect(reactivateAttempt).rejects.toMatchObject({
      code: 'CONTACT_NOT_FOUND',
    });
    await expect(reactivateAttempt).rejects.toBeInstanceOf(
      ContactNotFoundError,
    );
    expect(contactRepository.reactivate).not.toHaveBeenCalled();
  });
});

const createContactRepository = () =>
  ({
    findById: jest.fn(),
    findByIdForUser: jest.fn(),
    archive: jest.fn(),
    reactivate: jest.fn(),
    delete: jest.fn(),
  }) as unknown as jest.Mocked<ContactRepository>;

const createContactLoanReadPort = () =>
  ({
    hasActiveLoanForContact: jest.fn(),
    hasLoanHistoryForContact: jest.fn(),
  }) as unknown as jest.Mocked<ContactLoanReadPort>;

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
