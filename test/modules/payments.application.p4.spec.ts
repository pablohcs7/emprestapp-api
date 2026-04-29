import { PaymentRepository } from '../../src/modules/payments/domain/payment.repository';
import { Payment } from '../../src/modules/payments/domain/payment.types';
import { InstallmentRepository } from '../../src/modules/loans/domain/installment.repository';
import { Installment } from '../../src/modules/loans/domain/installment.types';
import { LoanRepository } from '../../src/modules/loans/domain/loan.repository';
import { Loan } from '../../src/modules/loans/domain/loan.types';
import { PaymentView } from '../../src/modules/payments/presentation/payments.types';
import { PaymentsApplicationService } from '../../src/modules/payments/application/payments.application.service';

describe('payments application p4', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-08-02T12:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('register', () => {
    it('registers a partial payment against the next open installment and triggers recalculation', async () => {
      const { service, paymentRepository, loanRepository, installmentRepository, recalculation } =
        createDependencies();

      loanRepository.findByIdForUser.mockResolvedValue(createLoan());
      loanRepository.findById.mockResolvedValue(null);
      installmentRepository.findByIdForUser.mockResolvedValue(
        createInstallment({
          id: 'inst_2',
          sequence: 2,
          dueDate: new Date('2026-09-01T00:00:00.000Z'),
          expectedAmountCents: 10000,
          paidAmountCents: 0,
          remainingAmountCents: 10000,
          status: 'pending',
        }),
      );
      installmentRepository.findById.mockResolvedValue(null);
      installmentRepository.findNextOpenForLoan.mockResolvedValue(
        createInstallment({
          id: 'inst_2',
          sequence: 2,
          dueDate: new Date('2026-09-01T00:00:00.000Z'),
          expectedAmountCents: 10000,
          paidAmountCents: 0,
          remainingAmountCents: 10000,
          status: 'pending',
        }),
      );
      paymentRepository.listActiveByInstallmentId.mockResolvedValue([]);
      paymentRepository.listActiveByLoanId.mockResolvedValue([]);
      paymentRepository.register.mockResolvedValue(
        createPayment({
          id: 'pay_1',
          loanId: 'loan_1',
          installmentId: 'inst_2',
          amountCents: 5000,
          paidAt: new Date('2026-08-01T00:00:00.000Z'),
          method: 'pix',
          note: 'Partial payment',
          status: 'active',
        }),
      );

      const result = await service.register('usr_1', {
        loanId: 'loan_1',
        installmentId: 'inst_2',
        amountCents: 5000,
        paidAt: '2026-08-01',
        method: 'pix',
        note: 'Partial payment',
      });

      expect(paymentRepository.register).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'usr_1',
          loanId: 'loan_1',
          installmentId: 'inst_2',
          amountCents: 5000,
          paidAt: new Date('2026-08-01T00:00:00.000Z'),
          method: 'pix',
          note: 'Partial payment',
        }),
      );
      const paymentView: PaymentView = result;

      expect(paymentView).toMatchObject({
        id: 'pay_1',
        loanId: 'loan_1',
        installmentId: 'inst_2',
        amountCents: 5000,
        status: 'active',
        method: 'pix',
        note: 'Partial payment',
        canceledAt: null,
      });
      expect(recalculation.calls).not.toHaveLength(0);
    });

    it.each([
      {
        label: 'when the loan belongs to another user',
        loanScoped: null,
        loanGlobalFactory: () => createLoan({ userId: 'usr_other' }),
        installmentScopedFactory: () => createInstallment(),
        installmentGlobal: null,
        expectedCode: 'LOAN_NOT_FOUND',
      },
      {
        label: 'when the installment belongs to another user',
        loanScopedFactory: () => createLoan(),
        loanGlobal: null,
        installmentScoped: null,
        installmentGlobalFactory: () => createInstallment({ userId: 'usr_other' }),
        expectedCode: 'INSTALLMENT_NOT_FOUND',
      },
      {
        label: 'when the loan is missing',
        loanScoped: null,
        loanGlobal: null,
        installmentScopedFactory: () => createInstallment(),
        installmentGlobal: null,
        expectedCode: 'LOAN_NOT_FOUND',
      },
      {
        label: 'when the installment is missing',
        loanScopedFactory: () => createLoan(),
        loanGlobal: null,
        installmentScoped: null,
        installmentGlobal: null,
        expectedCode: 'INSTALLMENT_NOT_FOUND',
      },
    ])('$label', async ({
      loanScoped,
      loanScopedFactory,
      loanGlobal,
      loanGlobalFactory,
      installmentScoped,
      installmentScopedFactory,
      installmentGlobal,
      installmentGlobalFactory,
      expectedCode,
    }) => {
      const { service, paymentRepository, loanRepository, installmentRepository, recalculation } =
        createDependencies();

      loanRepository.findByIdForUser.mockResolvedValue(
        loanScoped ?? loanScopedFactory?.() ?? null,
      );
      loanRepository.findById.mockResolvedValue(
        loanGlobal ?? loanGlobalFactory?.() ?? null,
      );
      installmentRepository.findByIdForUser.mockResolvedValue(
        installmentScoped ?? installmentScopedFactory?.() ?? null,
      );
      installmentRepository.findById.mockResolvedValue(
        installmentGlobal ?? installmentGlobalFactory?.() ?? null,
      );

      const attempt = service.register('usr_1', {
        loanId: 'loan_1',
        installmentId: 'inst_1',
        amountCents: 5000,
        paidAt: '2026-08-01',
      });

      await expect(attempt).rejects.toMatchObject({ code: expectedCode });
      expect(paymentRepository.register).not.toHaveBeenCalled();
      expect(recalculation.calls).toHaveLength(0);
    });

    it('rejects register when the loan is canceled', async () => {
      const { service, paymentRepository, loanRepository, installmentRepository, recalculation } =
        createDependencies();

      loanRepository.findByIdForUser.mockResolvedValue(
        createLoan({ status: 'canceled', canceledAt: new Date('2026-08-02T10:00:00.000Z') }),
      );

      const attempt = service.register('usr_1', {
        loanId: 'loan_1',
        installmentId: 'inst_1',
        amountCents: 5000,
        paidAt: '2026-08-01',
      });

      await expect(attempt).rejects.toMatchObject({ code: 'LOAN_CANCELED' });
      expect(installmentRepository.findByIdForUser).not.toHaveBeenCalled();
      expect(paymentRepository.register).not.toHaveBeenCalled();
      expect(recalculation.calls).toHaveLength(0);
    });

    it.each([
      {
        label: 'when the targeted installment is not the next open one',
        nextOpenInstallmentFactory: () => createInstallment({
          id: 'inst_2',
          sequence: 2,
          remainingAmountCents: 10000,
          expectedAmountCents: 10000,
        }),
        requestedInstallmentFactory: () => createInstallment({
          id: 'inst_1',
          sequence: 1,
          remainingAmountCents: 10000,
          expectedAmountCents: 10000,
        }),
        amountCents: 5000,
        activePayments: [],
        expectedCode: 'INVALID_PAYMENT_SEQUENCE',
      },
      {
        label: 'when the payment overpays the installment remaining amount',
        nextOpenInstallmentFactory: () => createInstallment({
          id: 'inst_1',
          sequence: 1,
          remainingAmountCents: 3000,
          expectedAmountCents: 10000,
        }),
        requestedInstallmentFactory: () => createInstallment({
          id: 'inst_1',
          sequence: 1,
          remainingAmountCents: 3000,
          expectedAmountCents: 10000,
        }),
        amountCents: 4000,
        activePaymentsFactory: () => [
          createPayment({
            id: 'pay_existing',
            installmentId: 'inst_1',
            amountCents: 7000,
          }),
        ],
        expectedCode: 'INVALID_PAYMENT_AMOUNT',
      },
    ])('$label', async ({
      nextOpenInstallmentFactory,
      requestedInstallmentFactory,
      amountCents,
      activePayments,
      activePaymentsFactory,
      expectedCode,
    }) => {
      const { service, paymentRepository, loanRepository, installmentRepository, recalculation } =
        createDependencies();
      const resolvedNextOpenInstallment = nextOpenInstallmentFactory?.() ?? null;
      const resolvedRequestedInstallment =
        requestedInstallmentFactory?.() ?? null;

      loanRepository.findByIdForUser.mockResolvedValue(createLoan());
      loanRepository.findById.mockResolvedValue(null);
      installmentRepository.findByIdForUser.mockResolvedValue(
        resolvedRequestedInstallment,
      );
      installmentRepository.findById.mockResolvedValue(null);
      installmentRepository.findNextOpenForLoan.mockResolvedValue(
        resolvedNextOpenInstallment,
      );
      paymentRepository.listActiveByInstallmentId.mockResolvedValue(
        activePayments ?? activePaymentsFactory?.() ?? [],
      );

      const attempt = service.register('usr_1', {
        loanId: 'loan_1',
        installmentId: resolvedRequestedInstallment!.id,
        amountCents,
        paidAt: '2026-08-01',
      });

      await expect(attempt).rejects.toMatchObject({ code: expectedCode });
      expect(paymentRepository.register).not.toHaveBeenCalled();
      expect(recalculation.calls).toHaveLength(0);
    });
  });

  describe('cancel', () => {
    it('cancels a payment, preserves history, and triggers recalculation', async () => {
      const { service, paymentRepository, recalculation } = createDependencies();

      paymentRepository.findByIdForUser.mockResolvedValue(createPayment());
      paymentRepository.findById.mockResolvedValue(null);
      paymentRepository.cancel.mockResolvedValue(
        createPayment({
          id: 'pay_1',
          status: 'canceled',
          canceledAt: new Date('2026-08-02T12:00:00.000Z'),
        }),
      );

      const result = await service.cancel('usr_1', 'pay_1');

      expect(paymentRepository.cancel).toHaveBeenCalledWith(
        'pay_1',
        'usr_1',
        new Date('2026-08-02T12:00:00.000Z'),
      );
      expect(result).toMatchObject({
        id: 'pay_1',
        status: 'canceled',
        canceledAt: new Date('2026-08-02T12:00:00.000Z'),
      });
      expect(recalculation.calls).not.toHaveLength(0);
    });

    it.each([
      {
        label: 'when the payment is missing',
        scopedPayment: null,
        globalPayment: null,
        expectedCode: 'PAYMENT_NOT_FOUND',
      },
      {
        label: 'when the payment belongs to another user',
        scopedPayment: null,
        globalPaymentFactory: () => createPayment({ userId: 'usr_other' }),
        expectedCode: 'PAYMENT_NOT_FOUND',
      },
    ])('$label', async ({ scopedPayment, globalPayment, globalPaymentFactory, expectedCode }) => {
      const { service, paymentRepository, recalculation } = createDependencies();

      paymentRepository.findByIdForUser.mockResolvedValue(scopedPayment);
      paymentRepository.findById.mockResolvedValue(
        globalPayment ?? globalPaymentFactory?.() ?? null,
      );

      const attempt = service.cancel('usr_1', 'pay_1');

      await expect(attempt).rejects.toMatchObject({ code: expectedCode });
      expect(paymentRepository.cancel).not.toHaveBeenCalled();
      expect(recalculation.calls).toHaveLength(0);
    });

    it('rejects cancel when the payment is already canceled', async () => {
      const { service, paymentRepository, recalculation } = createDependencies();

      paymentRepository.findByIdForUser.mockResolvedValue(
        createPayment({
          status: 'canceled',
          canceledAt: new Date('2026-08-01T00:00:00.000Z'),
        }),
      );

      const attempt = service.cancel('usr_1', 'pay_1');

      await expect(attempt).rejects.toMatchObject({ code: 'PAYMENT_ALREADY_CANCELED' });
      expect(paymentRepository.cancel).not.toHaveBeenCalled();
      expect(recalculation.calls).toHaveLength(0);
    });
  });
});

const createDependencies = () => {
  const paymentRepository = {
    register: jest.fn(),
    findById: jest.fn(),
    findByIdForUser: jest.fn(),
    listForUser: jest.fn(),
    listByLoanId: jest.fn(),
    listActiveByLoanId: jest.fn(),
    listActiveByInstallmentId: jest.fn(),
    cancel: jest.fn(),
  } as unknown as jest.Mocked<PaymentRepository>;

  const loanRepository = {
    create: jest.fn(),
    findById: jest.fn(),
    findByIdForUser: jest.fn(),
    listForUser: jest.fn(),
    updateDerivedState: jest.fn(),
    linkContact: jest.fn(),
    cancel: jest.fn(),
    delete: jest.fn(),
  } as unknown as jest.Mocked<LoanRepository>;

  const installmentRepository = {
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
  } as unknown as jest.Mocked<InstallmentRepository>;

  const recalculation = createCallRecorder();
  const service = new PaymentsApplicationService(
    loanRepository,
    installmentRepository,
    paymentRepository,
    recalculation.proxy as never,
  );

  return {
    service,
    paymentRepository,
    loanRepository,
    installmentRepository,
    recalculation,
  };
};

const createCallRecorder = () => {
  const calls: Array<{ method: string; args: unknown[] }> = [];
  const methods = new Map<string, jest.Mock>();

  const proxy = new Proxy(
    {},
    {
      get: (_target, property) => {
        if (property === Symbol.toStringTag) {
          return 'PaymentRecalculationService';
        }

        if (typeof property !== 'string') {
          return undefined;
        }

        if (!methods.has(property)) {
          methods.set(
            property,
            jest.fn((...args: unknown[]) => {
              calls.push({ method: property, args });
            }),
          );
        }

        return methods.get(property);
      },
    },
  );

  return {
    proxy,
    calls,
  };
};

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

const createInstallment = (overrides: Partial<Installment> = {}): Installment => ({
  id: 'inst_1',
  userId: 'usr_1',
  loanId: 'loan_1',
  sequence: 1,
  dueDate: new Date('2026-08-01T00:00:00.000Z'),
  expectedAmountCents: 10000,
  paidAmountCents: 0,
  remainingAmountCents: 10000,
  status: 'pending',
  createdAt: new Date('2026-04-24T00:00:00.000Z'),
  updatedAt: new Date('2026-04-24T00:00:00.000Z'),
  canceledAt: null,
  ...overrides,
});
