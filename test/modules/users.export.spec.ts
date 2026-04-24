import { ContactRepository } from '../../src/modules/contacts/domain/contact.repository';
import { Contact } from '../../src/modules/contacts/domain/contact.types';
import { InstallmentRepository } from '../../src/modules/loans/domain/installment.repository';
import { Installment } from '../../src/modules/loans/domain/installment.types';
import { LoanRepository } from '../../src/modules/loans/domain/loan.repository';
import { Loan } from '../../src/modules/loans/domain/loan.types';
import { PaymentRepository } from '../../src/modules/payments/domain/payment.repository';
import { Payment } from '../../src/modules/payments/domain/payment.types';
import { UserRepository } from '../../src/modules/users/domain/user.repository';
import { User } from '../../src/modules/users/domain/user.types';
import { UserExportService } from '../../src/modules/users/application/user-export.service';

describe('user export service', () => {
  it('builds a json export with all owned data scopes', async () => {
    const context = createContext();

    const payload = await context.service.buildJsonPayload('usr_1');

    expect(payload.user.email).toBe('jane@example.com');
    expect(payload.contacts).toHaveLength(1);
    expect(payload.loans).toHaveLength(1);
    expect(payload.installments).toHaveLength(1);
    expect(payload.payments).toHaveLength(1);
  });

  it('exports json with file metadata', async () => {
    const context = createContext();

    const result = await context.service.export('usr_1', 'json');

    expect(result).toMatchObject({
      format: 'json',
      fileName: 'emprestapp-export-usr_1.json',
      contentType: 'application/json; charset=utf-8',
    });
    expect(result.content).toContain('"email": "jane@example.com"');
  });

  it('exports csv with all sections', async () => {
    const context = createContext();

    const result = await context.service.export('usr_1', 'csv');

    expect(result).toMatchObject({
      format: 'csv',
      fileName: 'emprestapp-export-usr_1.csv',
      contentType: 'text/csv; charset=utf-8',
    });
    expect(result.content).toContain('# user');
    expect(result.content).toContain('# contacts');
    expect(result.content).toContain('# loans');
    expect(result.content).toContain('# installments');
    expect(result.content).toContain('# payments');
  });

  it('reads paginated repositories until all items are collected', async () => {
    const context = createContext();

    context.contactRepository.listForUser
      .mockResolvedValueOnce({
        items: [createContact({ id: 'ctc_1' })],
        total: 2,
      })
      .mockResolvedValueOnce({
        items: [createContact({ id: 'ctc_2' })],
        total: 2,
      });

    const payload = await context.service.buildJsonPayload('usr_1');

    expect(payload.contacts).toHaveLength(2);
    expect(context.contactRepository.listForUser).toHaveBeenNthCalledWith(1, 'usr_1', {
      page: 1,
      pageSize: 100,
    });
    expect(context.contactRepository.listForUser).toHaveBeenNthCalledWith(2, 'usr_1', {
      page: 2,
      pageSize: 100,
    });
  });
});

const createContext = () => {
  const userRepository = {
    create: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn().mockResolvedValue(createUser()),
    update: jest.fn(),
  } as unknown as jest.Mocked<UserRepository>;

  const contactRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdForUser: jest.fn(),
    listForUser: jest.fn().mockResolvedValue({
      items: [createContact()],
      total: 1,
    }),
    update: jest.fn(),
    archive: jest.fn(),
    reactivate: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<ContactRepository>;

  const loanRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdForUser: jest.fn(),
    listForUser: jest.fn().mockResolvedValue({
      items: [createLoan()],
      total: 1,
    }),
    updateDerivedState: jest.fn(),
    linkContact: jest.fn(),
    cancel: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<LoanRepository>;

  const installmentRepository = {
    createMany: jest.fn(),
    findById: jest.fn(),
    findByIdForUser: jest.fn(),
    findByLoanId: jest.fn().mockResolvedValue([createInstallment()]),
    findByLoanIdAndStatus: jest.fn(),
    findByLoanIdAndSequence: jest.fn(),
    findNextOpenForLoan: jest.fn(),
    updateDerivedState: jest.fn(),
    cancelByLoan: jest.fn(),
    deleteByLoan: jest.fn(),
  } as unknown as jest.Mocked<InstallmentRepository>;

  const paymentRepository = {
    register: jest.fn(),
    findById: jest.fn(),
    findByIdForUser: jest.fn(),
    listForUser: jest.fn().mockResolvedValue({
      items: [createPayment()],
      total: 1,
    }),
    listByLoanId: jest.fn(),
    listActiveByLoanId: jest.fn(),
    listActiveByInstallmentId: jest.fn(),
    cancel: jest.fn(),
  } as unknown as jest.Mocked<PaymentRepository>;

  return {
    service: new UserExportService(
      userRepository,
      contactRepository,
      loanRepository,
      installmentRepository,
      paymentRepository,
    ),
    userRepository,
    contactRepository,
    loanRepository,
    installmentRepository,
    paymentRepository,
  };
};

const createUser = (overrides: Partial<User> = {}): User => ({
  id: 'usr_1',
  fullName: 'Jane Doe',
  email: 'jane@example.com',
  passwordHash: 'hashed',
  status: 'active',
  createdAt: new Date('2026-04-15T18:00:00.000Z'),
  updatedAt: new Date('2026-04-24T00:00:00.000Z'),
  deletedAt: null,
  ...overrides,
});

const createContact = (overrides: Partial<Contact> = {}): Contact => ({
  id: 'ctc_1',
  userId: 'usr_1',
  fullName: 'John Smith',
  documentId: '12345678900',
  phone: '+5511999999999',
  notes: 'Contact',
  status: 'active',
  createdAt: new Date('2026-04-24T00:00:00.000Z'),
  updatedAt: new Date('2026-04-24T00:00:00.000Z'),
  archivedAt: null,
  ...overrides,
});

const createLoan = (overrides: Partial<Loan> = {}): Loan => ({
  id: 'loan_1',
  userId: 'usr_1',
  contactId: 'ctc_1',
  principalAmountCents: 100000,
  interestType: 'none',
  interestRate: null,
  startDate: new Date('2026-05-01T00:00:00.000Z'),
  dueDate: new Date('2026-06-01T00:00:00.000Z'),
  installmentCount: 1,
  status: 'open',
  currentBalanceCents: 95000,
  totalPaidCents: 5000,
  createdAt: new Date('2026-04-24T00:00:00.000Z'),
  updatedAt: new Date('2026-04-24T00:00:00.000Z'),
  canceledAt: null,
  ...overrides,
});

const createInstallment = (
  overrides: Partial<Installment> = {},
): Installment => ({
  id: 'inst_1',
  userId: 'usr_1',
  loanId: 'loan_1',
  sequence: 1,
  dueDate: new Date('2026-06-01T00:00:00.000Z'),
  expectedAmountCents: 100000,
  paidAmountCents: 5000,
  remainingAmountCents: 95000,
  status: 'pending',
  createdAt: new Date('2026-04-24T00:00:00.000Z'),
  updatedAt: new Date('2026-04-24T00:00:00.000Z'),
  canceledAt: null,
  ...overrides,
});

const createPayment = (overrides: Partial<Payment> = {}): Payment => ({
  id: 'pay_1',
  userId: 'usr_1',
  loanId: 'loan_1',
  installmentId: 'inst_1',
  amountCents: 5000,
  paidAt: new Date('2026-05-15T00:00:00.000Z'),
  method: 'pix',
  note: 'Partial payment',
  status: 'active',
  createdAt: new Date('2026-05-15T12:00:00.000Z'),
  updatedAt: new Date('2026-05-15T12:00:00.000Z'),
  canceledAt: null,
  ...overrides,
});
