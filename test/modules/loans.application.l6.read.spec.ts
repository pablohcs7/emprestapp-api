import { InstallmentRepository } from '../../src/modules/loans/domain/installment.repository';
import { Installment } from '../../src/modules/loans/domain/installment.types';
import { LoanRepository } from '../../src/modules/loans/domain/loan.repository';
import { Loan, LoanListFilters } from '../../src/modules/loans/domain/loan.types';
import {
  LoanNotFoundError,
} from '../../src/modules/loans/application/loans.application.service';
import { LoansReadService } from '../../src/modules/loans/application/loans-read.service';

describe('loans application service L6 read', () => {
  it('lists loans with the default filter that hides canceled loans', async () => {
    const loanRepository = createLoanRepositoryMock();
    const installmentRepository = createInstallmentRepositoryMock();

    loanRepository.listForUser.mockResolvedValue({
      items: [
        buildLoan({
          id: 'loan_1',
          status: 'open',
        }),
        buildLoan({
          id: 'loan_2',
          status: 'paid',
        }),
      ],
      total: 2,
    });

    const service = new LoansReadService(loanRepository, installmentRepository);
    const filters: LoanListFilters = {
      page: 1,
      pageSize: 20,
    };

    const result = await service.list('usr_1', filters);

    expect(loanRepository.listForUser).toHaveBeenCalledWith('usr_1', {
      ...filters,
      status: ['open', 'paid', 'overdue'],
    });
    expect(result).toEqual({
      items: [
        expect.objectContaining({
          id: 'loan_1',
          status: 'open',
        }),
        expect.objectContaining({
          id: 'loan_2',
          status: 'paid',
        }),
      ],
      page: 1,
      pageSize: 20,
      total: 2,
    });
  });

  it('keeps an explicit canceled filter intact', async () => {
    const loanRepository = createLoanRepositoryMock();
    const installmentRepository = createInstallmentRepositoryMock();

    loanRepository.listForUser.mockResolvedValue({
      items: [
        buildLoan({
          id: 'loan_3',
          status: 'canceled',
          canceledAt: new Date('2026-04-24T00:00:00.000Z'),
        }),
      ],
      total: 1,
    });

    const service = new LoansReadService(loanRepository, installmentRepository);

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
  });

  it('forwards the remaining list filters without rewriting them', async () => {
    const loanRepository = createLoanRepositoryMock();
    const installmentRepository = createInstallmentRepositoryMock();

    loanRepository.listForUser.mockResolvedValue({
      items: [],
      total: 0,
    });

    const service = new LoansReadService(loanRepository, installmentRepository);
    const filters: LoanListFilters = {
      status: ['open', 'canceled'],
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
  });

  it('returns a loan detail projection with sorted installments and payment summary', async () => {
    const loanRepository = createLoanRepositoryMock();
    const installmentRepository = createInstallmentRepositoryMock();

    loanRepository.findByIdForUser.mockResolvedValue(
      buildLoan({
        id: 'loan_1',
        totalPaidCents: 25000,
        currentBalanceCents: 75000,
      }),
    );
    installmentRepository.findByLoanId.mockResolvedValue([
      buildInstallment({
        id: 'inst_2',
        sequence: 2,
        dueDate: new Date('2026-07-01T00:00:00.000Z'),
      }),
      buildInstallment({
        id: 'inst_1',
        sequence: 1,
        dueDate: new Date('2026-06-01T00:00:00.000Z'),
      }),
    ]);

    const service = new LoansReadService(loanRepository, installmentRepository);
    const result = await service.detail('usr_1', 'loan_1');

    expect(loanRepository.findByIdForUser).toHaveBeenCalledWith(
      'loan_1',
      'usr_1',
    );
    expect(installmentRepository.findByLoanId).toHaveBeenCalledWith(
      'loan_1',
      'usr_1',
    );
    expect(result.installments.map((installment) => installment.id)).toEqual([
      'inst_1',
      'inst_2',
    ]);
    expect(result).toMatchObject({
      id: 'loan_1',
      paymentSummary: {
        totalPaidCents: 25000,
        currentBalanceCents: 75000,
      },
    });
  });

  it('throws not found when the scoped loan does not exist', async () => {
    const loanRepository = createLoanRepositoryMock();
    const installmentRepository = createInstallmentRepositoryMock();

    loanRepository.findByIdForUser.mockResolvedValue(null);
    loanRepository.findById.mockResolvedValue(null);

    const service = new LoansReadService(loanRepository, installmentRepository);
    const detailAttempt = service.detail('usr_1', 'loan_1');

    await expect(detailAttempt).rejects.toBeInstanceOf(LoanNotFoundError);
    await expect(detailAttempt).rejects.toMatchObject({
      code: 'LOAN_NOT_FOUND',
    });
    expect(installmentRepository.findByLoanId).not.toHaveBeenCalled();
  });

  it('returns not found when the loan exists but belongs to another user', async () => {
    const loanRepository = createLoanRepositoryMock();
    const installmentRepository = createInstallmentRepositoryMock();

    loanRepository.findByIdForUser.mockResolvedValue(null);
    loanRepository.findById.mockResolvedValue(
      buildLoan({
        id: 'loan_1',
        userId: 'usr_other',
      }),
    );

    const service = new LoansReadService(loanRepository, installmentRepository);
    const detailAttempt = service.detail('usr_1', 'loan_1');

    await expect(detailAttempt).rejects.toBeInstanceOf(LoanNotFoundError);
    await expect(detailAttempt).rejects.toMatchObject({ code: 'LOAN_NOT_FOUND' });
    expect(installmentRepository.findByLoanId).not.toHaveBeenCalled();
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
  }) as unknown as jest.Mocked<InstallmentRepository>;

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

const buildInstallment = (overrides: Partial<Installment> = {}): Installment => ({
  id: 'inst_1',
  userId: 'usr_1',
  loanId: 'loan_1',
  sequence: 1,
  dueDate: new Date('2026-06-01T00:00:00.000Z'),
  expectedAmountCents: 17750,
  paidAmountCents: 0,
  remainingAmountCents: 17750,
  status: 'pending',
  createdAt: new Date('2026-04-24T00:00:00.000Z'),
  updatedAt: new Date('2026-04-24T00:00:00.000Z'),
  canceledAt: null,
  ...overrides,
});
