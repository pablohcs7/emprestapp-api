import { PaymentRepository } from '../../src/modules/payments/domain/payment.repository';
import { Payment } from '../../src/modules/payments/domain/payment.types';
import { PaymentRecalculationService } from '../../src/modules/payments/application/payment-recalculation.service';
import { LoanCalculationService } from '../../src/modules/loans/domain/loan-calculation.service';
import { InstallmentRepository } from '../../src/modules/loans/domain/installment.repository';
import { Installment, InstallmentStatus } from '../../src/modules/loans/domain/installment.types';
import { LoanRepository } from '../../src/modules/loans/domain/loan.repository';
import { Loan, LoanStatus } from '../../src/modules/loans/domain/loan.types';

describe('payments application p3 recalculation service', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-20T10:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it.each([
    {
      label: 'pending',
      dueDate: new Date('2026-08-25T00:00:00.000Z'),
      paymentAmountCents: 4000,
      expectedInstallmentStatus: 'pending' as InstallmentStatus,
      expectedLoanStatus: 'open' as LoanStatus,
      expectedRemainingAmountCents: 6000,
      expectedCurrentBalanceCents: 6000,
    },
    {
      label: 'overdue',
      dueDate: new Date('2026-08-15T00:00:00.000Z'),
      paymentAmountCents: 4000,
      expectedInstallmentStatus: 'overdue' as InstallmentStatus,
      expectedLoanStatus: 'overdue' as LoanStatus,
      expectedRemainingAmountCents: 6000,
      expectedCurrentBalanceCents: 6000,
    },
    {
      label: 'paid',
      dueDate: new Date('2026-08-15T00:00:00.000Z'),
      paymentAmountCents: 10000,
      expectedInstallmentStatus: 'paid' as InstallmentStatus,
      expectedLoanStatus: 'paid' as LoanStatus,
      expectedRemainingAmountCents: 0,
      expectedCurrentBalanceCents: 0,
    },
  ])(
    'recalculates a single installment as $label',
    async ({
      dueDate,
      paymentAmountCents,
      expectedInstallmentStatus,
      expectedLoanStatus,
      expectedRemainingAmountCents,
      expectedCurrentBalanceCents,
    }) => {
      const context = createScenario({
        installments: [
          buildInstallment({
            id: 'inst_1',
            sequence: 1,
            dueDate,
            expectedAmountCents: 10000,
          }),
        ],
        payments: [
          buildPayment({
            id: 'pay_1',
            installmentId: 'inst_1',
            amountCents: paymentAmountCents,
            paidAt: new Date('2026-08-19T00:00:00.000Z'),
          }),
        ],
      });

      await context.service.recalculateForLoan('usr_1', 'loan_1', 'inst_1');

      expect(context.paymentRepository.listActiveByLoanId).toHaveBeenCalledWith(
        'loan_1',
        'usr_1',
      );
      expect(context.installmentRepository.findByLoanId).toHaveBeenCalledWith(
        'loan_1',
        'usr_1',
      );
      expect(context.installmentRepository.updateDerivedState).toHaveBeenCalledWith(
        expect.objectContaining({
          installmentId: 'inst_1',
          userId: 'usr_1',
          paidAmountCents: paymentAmountCents,
          remainingAmountCents: expectedRemainingAmountCents,
          status: expectedInstallmentStatus,
        }),
      );
      expect(context.loanRepository.updateDerivedState).toHaveBeenCalledWith(
        expect.objectContaining({
          loanId: 'loan_1',
          userId: 'usr_1',
          status: expectedLoanStatus,
          totalPaidCents: paymentAmountCents,
          currentBalanceCents: expectedCurrentBalanceCents,
        }),
      );
    },
  );

  it('ignores a canceled payment when recalculating an installment that reopened after cancellation', async () => {
    const context = createScenario({
      installments: [
        buildInstallment({
          id: 'inst_1',
          sequence: 1,
          dueDate: new Date('2026-08-25T00:00:00.000Z'),
          expectedAmountCents: 10000,
        }),
      ],
      payments: [
        buildPayment({
          id: 'pay_active',
          installmentId: 'inst_1',
          amountCents: 4000,
          paidAt: new Date('2026-08-19T00:00:00.000Z'),
        }),
        buildPayment({
          id: 'pay_canceled',
          installmentId: 'inst_1',
          amountCents: 6000,
          paidAt: new Date('2026-08-18T00:00:00.000Z'),
          status: 'canceled',
          canceledAt: new Date('2026-08-20T09:30:00.000Z'),
        }),
      ],
    });

    await context.service.recalculateForLoan('usr_1', 'loan_1', 'inst_1');

    expect(context.paymentRepository.listActiveByLoanId).toHaveBeenCalledWith(
      'loan_1',
      'usr_1',
    );
    expect(context.installmentRepository.updateDerivedState).toHaveBeenCalledWith(
      expect.objectContaining({
        installmentId: 'inst_1',
        userId: 'usr_1',
        paidAmountCents: 4000,
        remainingAmountCents: 6000,
        status: 'pending',
      }),
    );
    expect(context.loanRepository.updateDerivedState).toHaveBeenCalledWith(
      expect.objectContaining({
        loanId: 'loan_1',
        userId: 'usr_1',
        status: 'open',
        totalPaidCents: 4000,
        currentBalanceCents: 6000,
      }),
    );
  });

  it('recalculates the loan totals and keeps the future installment open', async () => {
    const context = createScenario({
      installments: [
        buildInstallment({
          id: 'inst_1',
          sequence: 1,
          dueDate: new Date('2026-09-15T00:00:00.000Z'),
          expectedAmountCents: 10000,
        }),
        buildInstallment({
          id: 'inst_2',
          sequence: 2,
          dueDate: new Date('2026-10-15T00:00:00.000Z'),
          expectedAmountCents: 10000,
        }),
      ],
      payments: [
        buildPayment({
          id: 'pay_1',
          installmentId: 'inst_1',
          amountCents: 4000,
          paidAt: new Date('2026-08-19T00:00:00.000Z'),
        }),
      ],
    });

    await context.service.recalculateForLoan('usr_1', 'loan_1', 'inst_1');

    expect(context.installmentRepository.updateDerivedState).toHaveBeenCalledWith(
      expect.objectContaining({
        installmentId: 'inst_1',
        status: 'pending',
        paidAmountCents: 4000,
        remainingAmountCents: 6000,
      }),
    );
    expect(context.loanRepository.updateDerivedState).toHaveBeenCalledWith(
      expect.objectContaining({
        loanId: 'loan_1',
        userId: 'usr_1',
        status: 'open',
        totalPaidCents: 4000,
        currentBalanceCents: 16000,
      }),
    );
  });

  it('recalculates the loan totals and marks the loan overdue when one installment is past due', async () => {
    const context = createScenario({
      installments: [
        buildInstallment({
          id: 'inst_1',
          sequence: 1,
          dueDate: new Date('2026-08-15T00:00:00.000Z'),
          expectedAmountCents: 10000,
        }),
        buildInstallment({
          id: 'inst_2',
          sequence: 2,
          dueDate: new Date('2026-10-15T00:00:00.000Z'),
          expectedAmountCents: 10000,
        }),
      ],
      payments: [
        buildPayment({
          id: 'pay_1',
          installmentId: 'inst_1',
          amountCents: 4000,
          paidAt: new Date('2026-08-19T00:00:00.000Z'),
        }),
      ],
    });

    await context.service.recalculateForLoan('usr_1', 'loan_1', 'inst_1');

    expect(context.installmentRepository.updateDerivedState).toHaveBeenCalledWith(
      expect.objectContaining({
        installmentId: 'inst_1',
        status: 'overdue',
        paidAmountCents: 4000,
        remainingAmountCents: 6000,
      }),
    );
    expect(context.loanRepository.updateDerivedState).toHaveBeenCalledWith(
      expect.objectContaining({
        loanId: 'loan_1',
        userId: 'usr_1',
        status: 'overdue',
        totalPaidCents: 4000,
        currentBalanceCents: 16000,
      }),
    );
  });

  it('recalculates the loan totals and marks the loan paid when every installment is fully settled', async () => {
    const context = createScenario({
      installments: [
        buildInstallment({
          id: 'inst_1',
          sequence: 1,
          dueDate: new Date('2026-09-15T00:00:00.000Z'),
          expectedAmountCents: 10000,
        }),
        buildInstallment({
          id: 'inst_2',
          sequence: 2,
          dueDate: new Date('2026-10-15T00:00:00.000Z'),
          expectedAmountCents: 10000,
        }),
      ],
      payments: [
        buildPayment({
          id: 'pay_1',
          installmentId: 'inst_1',
          amountCents: 10000,
          paidAt: new Date('2026-08-19T00:00:00.000Z'),
        }),
        buildPayment({
          id: 'pay_2',
          installmentId: 'inst_2',
          amountCents: 10000,
          paidAt: new Date('2026-08-19T00:00:00.000Z'),
        }),
      ],
    });

    await context.service.recalculateForLoan('usr_1', 'loan_1', 'inst_1');

    expect(context.loanRepository.updateDerivedState).toHaveBeenCalledWith(
      expect.objectContaining({
        loanId: 'loan_1',
        userId: 'usr_1',
        status: 'paid',
        totalPaidCents: 20000,
        currentBalanceCents: 0,
      }),
    );
  });
});

const createScenario = (input: {
  installments: Installment[];
  payments: Payment[];
  loan?: Partial<Loan>;
}) => {
  const loanCalculationService = new LoanCalculationService();
  const loanRepository = createLoanRepositoryMock();
  const installmentRepository = createInstallmentRepositoryMock();
  const paymentRepository = createPaymentRepositoryMock();
  const loan = buildLoan(input.loan);
  const activePayments = input.payments.filter((payment) => payment.status === 'active');

  loanRepository.findById.mockResolvedValue(loan);
  loanRepository.findByIdForUser.mockResolvedValue(loan);
  loanRepository.updateDerivedState.mockImplementation(async (record: any) => ({
    ...loan,
    status: record.status ?? loan.status,
    totalPaidCents: record.totalPaidCents ?? loan.totalPaidCents,
    currentBalanceCents: record.currentBalanceCents ?? loan.currentBalanceCents,
    updatedAt: new Date('2026-08-20T10:00:00.000Z'),
  }));

  installmentRepository.findById.mockImplementation(async (installmentId: string) =>
    input.installments.find((installment) => installment.id === installmentId) ?? null,
  );
  installmentRepository.findByIdForUser.mockImplementation(
    async (installmentId: string, userId: string) =>
      input.installments.find(
        (installment) => installment.id === installmentId && installment.userId === userId,
      ) ?? null,
  );
  installmentRepository.findByLoanId.mockResolvedValue(input.installments);
  installmentRepository.findByLoanIdAndStatus.mockImplementation(
    async (loanId: string, userId: string, status: InstallmentStatus) =>
      input.installments.filter(
        (installment) =>
          installment.loanId === loanId && installment.userId === userId && installment.status === status,
      ),
  );
  installmentRepository.findByLoanIdAndSequence.mockImplementation(
    async (loanId: string, userId: string, sequence: number) =>
      input.installments.find(
        (installment) =>
          installment.loanId === loanId && installment.userId === userId && installment.sequence === sequence,
      ) ?? null,
  );
  installmentRepository.findNextOpenForLoan.mockResolvedValue(
    input.installments.find((installment) => installment.status !== 'paid') ?? null,
  );
  installmentRepository.updateDerivedState.mockImplementation(async (record: any) => {
    const installment = input.installments.find((item) => item.id === record.installmentId);

    if (!installment) {
      return null;
    }

    return {
      ...installment,
      paidAmountCents: record.paidAmountCents,
      remainingAmountCents: record.remainingAmountCents,
      status: record.status,
      updatedAt: new Date('2026-08-20T10:00:00.000Z'),
    };
  });

  paymentRepository.findById.mockImplementation(async (paymentId: string) =>
    input.payments.find((payment) => payment.id === paymentId) ?? null,
  );
  paymentRepository.findByIdForUser.mockImplementation(
    async (paymentId: string, userId: string) =>
      input.payments.find(
        (payment) => payment.id === paymentId && payment.userId === userId,
      ) ?? null,
  );
  paymentRepository.listForUser.mockImplementation(async (userId: string, filters: any) => {
    const items = input.payments.filter((payment) => payment.userId === userId);

    return {
      items,
      total: items.length,
    };
  });
  paymentRepository.listByLoanId.mockImplementation(
    async (loanId: string, userId: string, filters: any) => {
      const items = input.payments.filter(
        (payment) => payment.loanId === loanId && payment.userId === userId,
      );

      return {
        items,
        total: items.length,
      };
    },
  );
  paymentRepository.listActiveByLoanId.mockImplementation(async (loanId: string, userId: string) =>
    input.payments.filter(
      (payment) =>
        payment.loanId === loanId && payment.userId === userId && payment.status === 'active',
    ),
  );
  paymentRepository.listActiveByInstallmentId.mockImplementation(
    async (installmentId: string, userId: string) =>
      input.payments.filter(
        (payment) =>
          payment.installmentId === installmentId &&
          payment.userId === userId &&
          payment.status === 'active',
      ),
  );

  return {
    service: new PaymentRecalculationService(
      loanRepository,
      installmentRepository,
      paymentRepository,
      loanCalculationService,
    ),
    loanRepository,
    installmentRepository,
    paymentRepository,
  };
};

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
    updateDerivedState: jest.fn(),
    cancelByLoan: jest.fn(),
    deleteByLoan: jest.fn(),
  }) as unknown as jest.Mocked<InstallmentRepository>;

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
  principalAmountCents: 20000,
  interestType: 'none',
  interestRate: null,
  startDate: new Date('2026-08-01T00:00:00.000Z'),
  dueDate: new Date('2026-10-15T00:00:00.000Z'),
  installmentCount: 2,
  status: 'open',
  currentBalanceCents: 20000,
  totalPaidCents: 0,
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  canceledAt: null,
  ...overrides,
});

const buildInstallment = (overrides: Partial<Installment> = {}): Installment => ({
  id: 'inst_1',
  userId: 'usr_1',
  loanId: 'loan_1',
  sequence: 1,
  dueDate: new Date('2026-09-15T00:00:00.000Z'),
  expectedAmountCents: 10000,
  paidAmountCents: 0,
  remainingAmountCents: 10000,
  status: 'pending',
  createdAt: new Date('2026-08-01T00:00:00.000Z'),
  updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  canceledAt: null,
  ...overrides,
});

const buildPayment = (overrides: Partial<Payment> = {}): Payment => ({
  id: 'pay_1',
  userId: 'usr_1',
  loanId: 'loan_1',
  installmentId: 'inst_1',
  amountCents: 4000,
  paidAt: new Date('2026-08-19T00:00:00.000Z'),
  method: 'pix',
  note: 'Payment',
  status: 'active',
  createdAt: new Date('2026-08-19T00:00:00.000Z'),
  updatedAt: new Date('2026-08-19T00:00:00.000Z'),
  canceledAt: null,
  ...overrides,
});
