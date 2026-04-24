import { ContactRepository } from '../../src/modules/contacts/domain/contact.repository';
import { Contact } from '../../src/modules/contacts/domain/contact.types';
import {
  DashboardHistoryFilters,
} from '../../src/modules/dashboard/application/dashboard-history.service';
import { DashboardHistoryService } from '../../src/modules/dashboard/application/dashboard-history.service';
import { LoanRepository } from '../../src/modules/loans/domain/loan.repository';
import { Loan } from '../../src/modules/loans/domain/loan.types';

describe('dashboard history service', () => {
  it('hides canceled loans by default and enriches contact names', async () => {
    const loanRepository = createLoanRepositoryMock();
    const contactRepository = createContactRepositoryMock();

    loanRepository.listForUser.mockResolvedValue({
      items: [
        buildLoan({
          id: 'loan_1',
          contactId: 'ctc_1',
          status: 'open',
        }),
        buildLoan({
          id: 'loan_2',
          contactId: 'ctc_2',
          status: 'canceled',
          canceledAt: new Date('2026-04-24T00:00:00.000Z'),
        }),
        buildLoan({
          id: 'loan_3',
          contactId: null,
          status: 'paid',
        }),
      ],
      total: 3,
    });
    contactRepository.findByIdForUser.mockImplementation(async (contactId) => {
      if (contactId === 'ctc_1') {
        return buildContact({
          id: 'ctc_1',
          fullName: 'John Smith',
        });
      }

      return null;
    });

    const service = new DashboardHistoryService(
      loanRepository,
      contactRepository,
    );

    const result = await service.list('usr_1', {
      page: 1,
      pageSize: 20,
    });

    expect(loanRepository.listForUser).toHaveBeenCalledWith('usr_1', {
      page: 1,
      pageSize: 20,
      status: ['open', 'paid', 'overdue'],
    });
    expect(contactRepository.findByIdForUser).toHaveBeenCalledTimes(2);
    expect(contactRepository.findByIdForUser).toHaveBeenNthCalledWith(
      1,
      'ctc_1',
      'usr_1',
    );
    expect(contactRepository.findByIdForUser).toHaveBeenNthCalledWith(
      2,
      'ctc_2',
      'usr_1',
    );
    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: 'loan_1',
          contactId: 'ctc_1',
          contactName: 'John Smith',
          status: 'open',
        }),
        expect.objectContaining({
          id: 'loan_2',
          contactId: 'ctc_2',
          contactName: null,
          status: 'canceled',
        }),
        expect.objectContaining({
          id: 'loan_3',
          contactId: null,
          contactName: null,
          status: 'paid',
        }),
      ],
      page: 1,
      pageSize: 20,
      total: 3,
    });
  });

  it('keeps an explicit canceled status filter intact', async () => {
    const loanRepository = createLoanRepositoryMock();
    const contactRepository = createContactRepositoryMock();

    loanRepository.listForUser.mockResolvedValue({
      items: [
        buildLoan({
          id: 'loan_4',
          status: 'canceled',
          canceledAt: new Date('2026-04-24T00:00:00.000Z'),
        }),
      ],
      total: 1,
    });

    const service = new DashboardHistoryService(
      loanRepository,
      contactRepository,
    );

    await service.list('usr_1', {
      status: ['canceled'],
      page: 2,
      pageSize: 10,
    });

    expect(loanRepository.listForUser).toHaveBeenCalledWith('usr_1', {
      status: ['canceled'],
      page: 2,
      pageSize: 10,
    });
    expect(contactRepository.findByIdForUser).not.toHaveBeenCalled();
  });

  it('forwards due date, period, and contact filters to the loan repository', async () => {
    const loanRepository = createLoanRepositoryMock();
    const contactRepository = createContactRepositoryMock();

    loanRepository.listForUser.mockResolvedValue({
      items: [],
      total: 0,
    });

    const service = new DashboardHistoryService(
      loanRepository,
      contactRepository,
    );

    const filters: DashboardHistoryFilters = {
      status: ['open', 'overdue'],
      contactId: 'ctc_1',
      dueDateFrom: new Date('2026-05-01T00:00:00.000Z'),
      dueDateTo: new Date('2026-11-01T00:00:00.000Z'),
      periodFrom: new Date('2026-04-01T00:00:00.000Z'),
      periodTo: new Date('2026-04-30T00:00:00.000Z'),
      page: 3,
      pageSize: 5,
    };

    await service.list('usr_1', filters);

    expect(loanRepository.listForUser).toHaveBeenCalledWith('usr_1', filters);
    expect(contactRepository.findByIdForUser).not.toHaveBeenCalled();
  });

  it('deduplicates contact lookups across the returned loans', async () => {
    const loanRepository = createLoanRepositoryMock();
    const contactRepository = createContactRepositoryMock();

    loanRepository.listForUser.mockResolvedValue({
      items: [
        buildLoan({
          id: 'loan_1',
          contactId: 'ctc_1',
        }),
        buildLoan({
          id: 'loan_2',
          contactId: 'ctc_1',
        }),
      ],
      total: 2,
    });
    contactRepository.findByIdForUser.mockResolvedValue(
      buildContact({
        id: 'ctc_1',
        fullName: 'John Smith',
      }),
    );

    const service = new DashboardHistoryService(
      loanRepository,
      contactRepository,
    );

    const result = await service.list('usr_1', {
      page: 1,
      pageSize: 20,
    });

    expect(contactRepository.findByIdForUser).toHaveBeenCalledTimes(1);
    expect(result.items).toEqual([
      expect.objectContaining({
        id: 'loan_1',
        contactName: 'John Smith',
      }),
      expect.objectContaining({
        id: 'loan_2',
        contactName: 'John Smith',
      }),
    ]);
  });

  it('returns null contact names when the contact cannot be resolved', async () => {
    const loanRepository = createLoanRepositoryMock();
    const contactRepository = createContactRepositoryMock();

    loanRepository.listForUser.mockResolvedValue({
      items: [
        buildLoan({
          id: 'loan_1',
          contactId: 'ctc_missing',
        }),
      ],
      total: 1,
    });
    contactRepository.findByIdForUser.mockResolvedValue(null);

    const service = new DashboardHistoryService(
      loanRepository,
      contactRepository,
    );

    const result = await service.list('usr_1', {
      page: 1,
      pageSize: 20,
    });

    expect(result.items[0]).toMatchObject({
      id: 'loan_1',
      contactId: 'ctc_missing',
      contactName: null,
    });
  });
});

const createLoanRepositoryMock = () =>
  ({
    create: jest.fn(),
    findById: jest.fn(),
    findByIdForUser: jest.fn(),
    listForUser: jest.fn(),
    updateDerivedState: jest.fn(),
    linkContact: jest.fn(),
    cancel: jest.fn(),
    delete: jest.fn(),
  }) as unknown as jest.Mocked<LoanRepository>;

const createContactRepositoryMock = () =>
  ({
    create: jest.fn(),
    findById: jest.fn(),
    findByIdForUser: jest.fn(),
    listForUser: jest.fn(),
    update: jest.fn(),
    archive: jest.fn(),
    reactivate: jest.fn(),
    delete: jest.fn(),
  }) as unknown as jest.Mocked<ContactRepository>;

const buildLoan = (overrides: Partial<Loan> = {}): Loan => ({
  id: 'loan_1',
  userId: 'usr_1',
  contactId: null,
  principalAmountCents: 100000,
  interestType: 'compound',
  interestRate: 2.5,
  startDate: new Date('2026-05-01T00:00:00.000Z'),
  dueDate: new Date('2026-11-01T00:00:00.000Z'),
  installmentCount: 6,
  status: 'open',
  currentBalanceCents: 106500,
  totalPaidCents: 0,
  createdAt: new Date('2026-04-24T00:00:00.000Z'),
  updatedAt: new Date('2026-04-24T00:00:00.000Z'),
  canceledAt: null,
  ...overrides,
});

const buildContact = (overrides: Partial<Contact> = {}): Contact => ({
  id: 'ctc_1',
  userId: 'usr_1',
  fullName: 'John Smith',
  documentId: '12345678900',
  phone: '+5511999999999',
  notes: 'School friend',
  status: 'active',
  createdAt: new Date('2026-04-24T00:00:00.000Z'),
  updatedAt: new Date('2026-04-24T00:00:00.000Z'),
  archivedAt: null,
  ...overrides,
});
