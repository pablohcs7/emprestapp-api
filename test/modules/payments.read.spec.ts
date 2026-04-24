import { LoanRepository } from '../../src/modules/loans/domain/loan.repository';
import { Loan } from '../../src/modules/loans/domain/loan.types';
import {
  ForbiddenPaymentResourceError,
  LoanNotFoundError,
} from '../../src/modules/payments/application/payments.application.service';
import { PaymentsReadService } from '../../src/modules/payments/application/payments-read.service';
import { PaymentRepository } from '../../src/modules/payments/domain/payment.repository';
import { Payment } from '../../src/modules/payments/domain/payment.types';

describe('payments read service', () => {
  it('lists global payments with active-only default status', async () => {
    const paymentRepository = createPaymentRepositoryMock();
    const loanRepository = createLoanRepositoryMock();
    const service = new PaymentsReadService(paymentRepository, loanRepository);

    paymentRepository.listForUser.mockResolvedValue({
      items: [createPayment()],
      total: 1,
    });

    const result = await service.list('usr_1', {
      page: 1,
      pageSize: 20,
    });

    expect(paymentRepository.listForUser).toHaveBeenCalledWith('usr_1', {
      page: 1,
      pageSize: 20,
      status: ['active'],
    });
    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: 'pay_1',
          status: 'active',
        }),
      ],
      page: 1,
      pageSize: 20,
      total: 1,
    });
  });

  it('lists loan payment history including canceled payments by default', async () => {
    const paymentRepository = createPaymentRepositoryMock();
    const loanRepository = createLoanRepositoryMock();
    const service = new PaymentsReadService(paymentRepository, loanRepository);

    loanRepository.findByIdForUser.mockResolvedValue(createLoan());
    paymentRepository.listByLoanId.mockResolvedValue({
      items: [
        createPayment(),
        createPayment({
          id: 'pay_2',
          status: 'canceled',
          canceledAt: new Date('2026-08-02T12:00:00.000Z'),
        }),
      ],
      total: 2,
    });

    const result = await service.listByLoan('usr_1', 'loan_1', {
      page: 1,
      pageSize: 20,
    });

    expect(paymentRepository.listByLoanId).toHaveBeenCalledWith(
      'loan_1',
      'usr_1',
      {
        page: 1,
        pageSize: 20,
        status: ['active', 'canceled'],
      },
    );
    expect(result.total).toBe(2);
    expect(result.items).toHaveLength(2);
  });

  it('rejects loan history when the loan belongs to another user', async () => {
    const paymentRepository = createPaymentRepositoryMock();
    const loanRepository = createLoanRepositoryMock();
    const service = new PaymentsReadService(paymentRepository, loanRepository);

    loanRepository.findByIdForUser.mockResolvedValue(null);
    loanRepository.findById.mockResolvedValue(createLoan({ userId: 'usr_other' }));

    const attempt = service.listByLoan('usr_1', 'loan_1', {
      page: 1,
      pageSize: 20,
    });

    await expect(attempt).rejects.toBeInstanceOf(ForbiddenPaymentResourceError);
    expect(paymentRepository.listByLoanId).not.toHaveBeenCalled();
  });

  it('rejects loan history when the loan does not exist', async () => {
    const paymentRepository = createPaymentRepositoryMock();
    const loanRepository = createLoanRepositoryMock();
    const service = new PaymentsReadService(paymentRepository, loanRepository);

    loanRepository.findByIdForUser.mockResolvedValue(null);
    loanRepository.findById.mockResolvedValue(null);

    const attempt = service.listByLoan('usr_1', 'missing', {
      page: 1,
      pageSize: 20,
    });

    await expect(attempt).rejects.toBeInstanceOf(LoanNotFoundError);
    expect(paymentRepository.listByLoanId).not.toHaveBeenCalled();
  });
});

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

const createLoan = (overrides: Partial<Loan> = {}): Loan => ({
  id: 'loan_1',
  userId: 'usr_1',
  contactId: null,
  principalAmountCents: 50000,
  interestType: 'compound',
  interestRate: 2.5,
  startDate: new Date('2026-05-01T00:00:00.000Z'),
  dueDate: new Date('2026-09-01T00:00:00.000Z'),
  installmentCount: 2,
  status: 'open',
  currentBalanceCents: 15000,
  totalPaidCents: 35000,
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
  paidAt: new Date('2026-08-01T00:00:00.000Z'),
  method: 'pix',
  note: 'Partial payment',
  status: 'active',
  createdAt: new Date('2026-08-01T12:00:00.000Z'),
  updatedAt: new Date('2026-08-01T12:00:00.000Z'),
  canceledAt: null,
  ...overrides,
});
