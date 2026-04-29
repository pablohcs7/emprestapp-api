import { LoanPaymentReadPort } from '../../src/modules/loans/domain/loan-payment-read.port';
import { InstallmentRepository } from '../../src/modules/loans/domain/installment.repository';
import { LoanRepository } from '../../src/modules/loans/domain/loan.repository';
import { Loan, LoanStatus } from '../../src/modules/loans/domain/loan.types';
import {
  LoanHasPaymentsError,
  LoanLifecyclePolicyService,
  LoanNotFoundError,
} from '../../src/modules/loans/application/loan-lifecycle-policy.service';
import { Installment } from '../../src/modules/loans/domain/installment.types';

describe('loans application l6 lifecycle', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-24T10:15:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('cancels a loan and cancels all installments when there are no payments', async () => {
    const loanRepository = createLoanRepositoryMock();
    const installmentRepository = createInstallmentRepositoryMock();
    const loanPaymentReadPort = createLoanPaymentReadPortMock();
    const service = new LoanLifecyclePolicyService(
      loanRepository,
      installmentRepository,
      loanPaymentReadPort,
    );

    loanRepository.findByIdForUser.mockResolvedValue(createLoan());
    loanPaymentReadPort.hasPaymentsForLoan.mockResolvedValue(false);
    loanRepository.cancel.mockResolvedValue(
      createLoan({
        status: 'canceled',
        canceledAt: new Date('2026-04-24T10:15:00.000Z'),
      }),
    );
    installmentRepository.cancelByLoan.mockResolvedValue([
      createInstallment({
        status: 'canceled',
        paidAmountCents: 0,
        remainingAmountCents: 0,
        canceledAt: new Date('2026-04-24T10:15:00.000Z'),
      }),
    ]);

    const result = await service.cancelLoan('usr_1', 'loan_1');

    expect(result.status).toBe('canceled');
    expect(loanPaymentReadPort.hasPaymentsForLoan).toHaveBeenCalledWith(
      'loan_1',
      'usr_1',
    );
    expect(loanRepository.cancel).toHaveBeenCalledWith(
      'loan_1',
      'usr_1',
      new Date('2026-04-24T10:15:00.000Z'),
    );
    expect(installmentRepository.cancelByLoan).toHaveBeenCalledWith(
      'loan_1',
      'usr_1',
      new Date('2026-04-24T10:15:00.000Z'),
    );
  });

  it('blocks cancel when the loan has payments', async () => {
    const loanRepository = createLoanRepositoryMock();
    const installmentRepository = createInstallmentRepositoryMock();
    const loanPaymentReadPort = createLoanPaymentReadPortMock();
    const service = new LoanLifecyclePolicyService(
      loanRepository,
      installmentRepository,
      loanPaymentReadPort,
    );

    loanRepository.findByIdForUser.mockResolvedValue(createLoan());
    loanPaymentReadPort.hasPaymentsForLoan.mockResolvedValue(true);

    const attempt = service.cancelLoan('usr_1', 'loan_1');

    await expect(attempt).rejects.toMatchObject({ code: 'LOAN_HAS_PAYMENTS' });
    await expect(attempt).rejects.toBeInstanceOf(LoanHasPaymentsError);
    expect(loanRepository.cancel).not.toHaveBeenCalled();
    expect(installmentRepository.cancelByLoan).not.toHaveBeenCalled();
  });

  it('deletes a loan and removes installments when there are no payments', async () => {
    const loanRepository = createLoanRepositoryMock();
    const installmentRepository = createInstallmentRepositoryMock();
    const loanPaymentReadPort = createLoanPaymentReadPortMock();
    const service = new LoanLifecyclePolicyService(
      loanRepository,
      installmentRepository,
      loanPaymentReadPort,
    );

    loanRepository.findByIdForUser.mockResolvedValue(createLoan());
    loanPaymentReadPort.hasPaymentsForLoan.mockResolvedValue(false);
    loanRepository.delete.mockResolvedValue(true);
    installmentRepository.deleteByLoan.mockResolvedValue(true);

    await expect(service.deleteLoan('usr_1', 'loan_1')).resolves.toBeUndefined();
    expect(loanPaymentReadPort.hasPaymentsForLoan).toHaveBeenCalledWith(
      'loan_1',
      'usr_1',
    );
    expect(loanRepository.delete).toHaveBeenCalledWith('loan_1', 'usr_1');
    expect(installmentRepository.deleteByLoan).toHaveBeenCalledWith(
      'loan_1',
      'usr_1',
    );
  });

  it('blocks delete when the loan has payments', async () => {
    const loanRepository = createLoanRepositoryMock();
    const installmentRepository = createInstallmentRepositoryMock();
    const loanPaymentReadPort = createLoanPaymentReadPortMock();
    const service = new LoanLifecyclePolicyService(
      loanRepository,
      installmentRepository,
      loanPaymentReadPort,
    );

    loanRepository.findByIdForUser.mockResolvedValue(createLoan());
    loanPaymentReadPort.hasPaymentsForLoan.mockResolvedValue(true);

    const attempt = service.deleteLoan('usr_1', 'loan_1');

    await expect(attempt).rejects.toMatchObject({ code: 'LOAN_HAS_PAYMENTS' });
    await expect(attempt).rejects.toBeInstanceOf(LoanHasPaymentsError);
    expect(loanRepository.delete).not.toHaveBeenCalled();
    expect(installmentRepository.deleteByLoan).not.toHaveBeenCalled();
  });

  it('throws not found when the loan does not exist', async () => {
    const loanRepository = createLoanRepositoryMock();
    const installmentRepository = createInstallmentRepositoryMock();
    const loanPaymentReadPort = createLoanPaymentReadPortMock();
    const service = new LoanLifecyclePolicyService(
      loanRepository,
      installmentRepository,
      loanPaymentReadPort,
    );

    loanRepository.findByIdForUser.mockResolvedValue(null);
    loanRepository.findById.mockResolvedValue(null);

    const attempt = service.cancelLoan('usr_1', 'loan_1');

    await expect(attempt).rejects.toMatchObject({ code: 'LOAN_NOT_FOUND' });
    await expect(attempt).rejects.toBeInstanceOf(LoanNotFoundError);
    expect(loanPaymentReadPort.hasPaymentsForLoan).not.toHaveBeenCalled();
    expect(loanRepository.cancel).not.toHaveBeenCalled();
  });

  it('returns not found when the loan belongs to another user', async () => {
    const loanRepository = createLoanRepositoryMock();
    const installmentRepository = createInstallmentRepositoryMock();
    const loanPaymentReadPort = createLoanPaymentReadPortMock();
    const service = new LoanLifecyclePolicyService(
      loanRepository,
      installmentRepository,
      loanPaymentReadPort,
    );

    loanRepository.findByIdForUser.mockResolvedValue(null);
    loanRepository.findById.mockResolvedValue(
      createLoan({ userId: 'usr_other' }),
    );

    const attempt = service.deleteLoan('usr_1', 'loan_1');

    await expect(attempt).rejects.toMatchObject({ code: 'LOAN_NOT_FOUND' });
    await expect(attempt).rejects.toBeInstanceOf(LoanNotFoundError);
    expect(loanPaymentReadPort.hasPaymentsForLoan).not.toHaveBeenCalled();
    expect(loanRepository.delete).not.toHaveBeenCalled();
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

const createInstallmentRepositoryMock = () =>
  ({
    createMany: jest.fn(),
    findById: jest.fn(),
    findByIdForUser: jest.fn(),
    findByLoanId: jest.fn(),
    findByLoanIdAndStatus: jest.fn(),
    findByLoanIdAndSequence: jest.fn(),
    findNextOpenForLoan: jest.fn(),
    cancelByLoan: jest.fn(),
    deleteByLoan: jest.fn(),
  }) as unknown as jest.Mocked<InstallmentRepository>;

const createLoanPaymentReadPortMock = () =>
  ({
    hasPaymentsForLoan: jest.fn(),
  }) as unknown as jest.Mocked<LoanPaymentReadPort>;

const createLoan = (overrides: Partial<Loan> = {}): Loan => ({
  id: 'loan_1',
  userId: 'usr_1',
  contactId: null,
  principalAmountCents: 50000,
  interestType: 'compound',
  interestRate: 2.5,
  startDate: new Date('2026-05-15T00:00:00.000Z'),
  dueDate: new Date('2026-07-15T00:00:00.000Z'),
  installmentCount: 2,
  status: 'open' as LoanStatus,
  currentBalanceCents: 51000,
  totalPaidCents: 0,
  createdAt: new Date('2026-04-24T00:00:00.000Z'),
  updatedAt: new Date('2026-04-24T00:00:00.000Z'),
  canceledAt: null,
  ...overrides,
});

const createInstallment = (overrides: Partial<Installment> = {}): Installment => ({
  id: 'inst_1',
  userId: 'usr_1',
  loanId: 'loan_1',
  sequence: 1,
  dueDate: new Date('2026-06-15T00:00:00.000Z'),
  expectedAmountCents: 25500,
  paidAmountCents: 0,
  remainingAmountCents: 25500,
  status: 'pending',
  createdAt: new Date('2026-04-24T00:00:00.000Z'),
  updatedAt: new Date('2026-04-24T00:00:00.000Z'),
  canceledAt: null,
  ...overrides,
});
