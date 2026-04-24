import { LoanRepository } from '../../src/modules/loans/domain/loan.repository';
import { Loan } from '../../src/modules/loans/domain/loan.types';
import { PaymentRepository } from '../../src/modules/payments/domain/payment.repository';
import { Payment } from '../../src/modules/payments/domain/payment.types';
import { DashboardSummaryService } from '../../src/modules/dashboard/application/dashboard-summary.service';

describe('dashboard summary service', () => {
  it('returns zeros when the user has no loans or payments', async () => {
    const loanRepository = createLoanRepositoryMock();
    const paymentRepository = createPaymentRepositoryMock();
    const service = new DashboardSummaryService(loanRepository, paymentRepository);

    loanRepository.listForUser.mockResolvedValue({
      items: [],
      total: 0,
    });
    paymentRepository.listForUser.mockResolvedValue({
      items: [],
      total: 0,
    });

    const result = await service.getSummary('usr_1');

    expect(result).toEqual({
      totalOutstandingCents: 0,
      totalOverdueCents: 0,
      totalReceivedCents: 0,
      openLoansCount: 0,
      overdueLoansCount: 0,
    });
    expect(loanRepository.listForUser).toHaveBeenCalledTimes(1);
    expect(paymentRepository.listForUser).toHaveBeenCalledTimes(1);
  });

  it('aggregates a summary from loan balances and active payments', async () => {
    const loanRepository = createLoanRepositoryMock();
    const paymentRepository = createPaymentRepositoryMock();
    const service = new DashboardSummaryService(loanRepository, paymentRepository);

    loanRepository.listForUser.mockResolvedValue({
      items: [
        buildLoan({
          id: 'loan_1',
          status: 'open',
          currentBalanceCents: 106500,
        }),
        buildLoan({
          id: 'loan_2',
          status: 'overdue',
          currentBalanceCents: 17750,
        }),
        buildLoan({
          id: 'loan_3',
          status: 'paid',
          currentBalanceCents: 0,
        }),
      ],
      total: 3,
    });
    paymentRepository.listForUser.mockResolvedValue({
      items: [
        buildPayment({
          id: 'pay_1',
          amountCents: 5000,
        }),
        buildPayment({
          id: 'pay_2',
          amountCents: 2500,
        }),
      ],
      total: 2,
    });

    const result = await service.getSummary('usr_1');

    expect(result).toEqual({
      totalOutstandingCents: 124250,
      totalOverdueCents: 17750,
      totalReceivedCents: 7500,
      openLoansCount: 1,
      overdueLoansCount: 1,
    });
  });

  it('paginates loan reads until the full user result set is consumed', async () => {
    const loanRepository = createLoanRepositoryMock();
    const paymentRepository = createPaymentRepositoryMock();
    const service = new DashboardSummaryService(loanRepository, paymentRepository);

    loanRepository.listForUser.mockImplementation(async (_userId, filters) => {
      if (filters.page === 1) {
        return {
          items: [
            buildLoan({
              id: 'loan_1',
              status: 'open',
              currentBalanceCents: 1000,
            }),
          ],
          total: 2,
        };
      }

      return {
        items: [
          buildLoan({
            id: 'loan_2',
            status: 'overdue',
            currentBalanceCents: 2000,
          }),
        ],
        total: 2,
      };
    });
    paymentRepository.listForUser.mockResolvedValue({
      items: [],
      total: 0,
    });

    const result = await service.getSummary('usr_1');

    expect(result.totalOutstandingCents).toBe(3000);
    expect(result.overdueLoansCount).toBe(1);
    expect(loanRepository.listForUser).toHaveBeenCalledTimes(2);
    expect(loanRepository.listForUser).toHaveBeenNthCalledWith(1, 'usr_1', {
      status: ['open', 'paid', 'overdue'],
      page: 1,
      pageSize: 100,
    });
    expect(loanRepository.listForUser).toHaveBeenNthCalledWith(2, 'usr_1', {
      status: ['open', 'paid', 'overdue'],
      page: 2,
      pageSize: 100,
    });
  });

  it('paginates payment reads until the full user result set is consumed', async () => {
    const loanRepository = createLoanRepositoryMock();
    const paymentRepository = createPaymentRepositoryMock();
    const service = new DashboardSummaryService(loanRepository, paymentRepository);

    loanRepository.listForUser.mockResolvedValue({
      items: [],
      total: 0,
    });
    paymentRepository.listForUser.mockImplementation(async (_userId, filters) => {
      if (filters.page === 1) {
        return {
          items: [
            buildPayment({
              id: 'pay_1',
              amountCents: 1250,
            }),
          ],
          total: 2,
        };
      }

      return {
        items: [
          buildPayment({
            id: 'pay_2',
            amountCents: 2750,
          }),
        ],
        total: 2,
      };
    });

    const result = await service.getSummary('usr_1');

    expect(result.totalReceivedCents).toBe(4000);
    expect(paymentRepository.listForUser).toHaveBeenCalledTimes(2);
    expect(paymentRepository.listForUser).toHaveBeenNthCalledWith(1, 'usr_1', {
      status: ['active'],
      page: 1,
      pageSize: 100,
    });
    expect(paymentRepository.listForUser).toHaveBeenNthCalledWith(2, 'usr_1', {
      status: ['active'],
      page: 2,
      pageSize: 100,
    });
  });

  it('uses the persisted operational statuses instead of including canceled data', async () => {
    const loanRepository = createLoanRepositoryMock();
    const paymentRepository = createPaymentRepositoryMock();
    const service = new DashboardSummaryService(loanRepository, paymentRepository);

    loanRepository.listForUser.mockResolvedValue({
      items: [],
      total: 0,
    });
    paymentRepository.listForUser.mockResolvedValue({
      items: [],
      total: 0,
    });

    await service.getSummary('usr_1');

    expect(loanRepository.listForUser).toHaveBeenCalledWith('usr_1', {
      status: ['open', 'paid', 'overdue'],
      page: 1,
      pageSize: 100,
    });
    expect(paymentRepository.listForUser).toHaveBeenCalledWith('usr_1', {
      status: ['active'],
      page: 1,
      pageSize: 100,
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

const createPaymentRepositoryMock = () =>
  ({
    register: jest.fn(),
    findById: jest.fn(),
    findByIdForUser: jest.fn(),
    listForUser: jest.fn(),
    listByLoanId: jest.fn(),
    listActiveByLoanId: jest.fn(),
    listActiveByInstallmentId: jest.fn(),
    cancel: jest.fn(),
  }) as unknown as jest.Mocked<PaymentRepository>;

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

const buildPayment = (overrides: Partial<Payment> = {}): Payment => ({
  id: 'pay_1',
  userId: 'usr_1',
  loanId: 'loan_1',
  installmentId: 'inst_1',
  amountCents: 5000,
  paidAt: new Date('2026-08-01T00:00:00.000Z'),
  method: 'pix',
  note: 'Partial payment',
  status: 'active',
  createdAt: new Date('2026-08-01T12:00:00.000Z'),
  updatedAt: new Date('2026-08-01T12:00:00.000Z'),
  canceledAt: null,
  ...overrides,
});
