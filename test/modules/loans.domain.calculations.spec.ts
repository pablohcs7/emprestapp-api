import { LoanCalculationService } from '../../src/modules/loans/domain/loan-calculation.service';
import { LoanInstallmentPayment } from '../../src/modules/loans/domain/loan-calculation.types';

describe('loan domain calculations', () => {
  const service = new LoanCalculationService();

  it('generates monthly installments with the remainder applied only to the last installment', () => {
    const installments = service.generateMonthlyInstallments({
      principalAmountCents: 10000,
      interestType: 'none',
      startDate: new Date('2026-01-15T00:00:00.000Z'),
      installmentCount: 3,
    });

    expect(installments).toEqual([
      {
        sequence: 1,
        dueDate: new Date('2026-02-15T00:00:00.000Z'),
        expectedAmountCents: 3333,
      },
      {
        sequence: 2,
        dueDate: new Date('2026-03-15T00:00:00.000Z'),
        expectedAmountCents: 3333,
      },
      {
        sequence: 3,
        dueDate: new Date('2026-04-15T00:00:00.000Z'),
        expectedAmountCents: 3334,
      },
    ]);
  });

  it('clamps monthly installments to the last day of shorter months', () => {
    const installments = service.generateMonthlyInstallments({
      principalAmountCents: 10000,
      interestType: 'none',
      startDate: new Date('2026-01-31T00:00:00.000Z'),
      installmentCount: 2,
    });

    expect(installments.map((installment) => installment.dueDate)).toEqual([
      new Date('2026-02-28T00:00:00.000Z'),
      new Date('2026-03-31T00:00:00.000Z'),
    ]);
  });

  it('calculates simple interest in cents using calendar days', () => {
    const interest = service.calculateSimpleInterestCents(
      10000,
      365,
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-03T00:00:00.000Z'),
    );

    expect(interest).toBe(200);
  });

  it('calculates daily compound interest in cents', () => {
    const interest = service.calculateCompoundInterestCents(
      10000,
      365,
      new Date('2026-01-01T00:00:00.000Z'),
      new Date('2026-01-03T00:00:00.000Z'),
    );

    expect(interest).toBe(201);
  });

  it('recalculates installment state deterministically from payments and reference date', () => {
    const installment = {
      sequence: 1,
      dueDate: new Date('2026-02-15T00:00:00.000Z'),
      expectedAmountCents: 3333,
    };
    const payments: LoanInstallmentPayment[] = [
      {
        installmentSequence: 1,
        amountCents: 1000,
        status: 'active',
      },
    ];

    const firstPass = service.recalculateInstallmentState(
      installment,
      payments,
      new Date('2026-02-10T00:00:00.000Z'),
    );
    const secondPass = service.recalculateInstallmentState(
      installment,
      payments,
      new Date('2026-02-10T00:00:00.000Z'),
    );

    expect(firstPass).toEqual({
      sequence: 1,
      dueDate: new Date('2026-02-15T00:00:00.000Z'),
      expectedAmountCents: 3333,
      paidAmountCents: 1000,
      remainingAmountCents: 2333,
      status: 'pending',
    });
    expect(secondPass).toEqual(firstPass);
  });

  it('marks an unpaid installment overdue after the due date', () => {
    const installment = service.recalculateInstallmentState(
      {
        sequence: 1,
        dueDate: new Date('2026-02-15T00:00:00.000Z'),
        expectedAmountCents: 3333,
      },
      [],
      new Date('2026-02-16T00:00:00.000Z'),
    );

    expect(installment.status).toBe('overdue');
    expect(installment.remainingAmountCents).toBe(3333);
  });

  it('recalculates loan state as open, overdue, or paid from installment states', () => {
    const installments = service.generateMonthlyInstallments({
      principalAmountCents: 10000,
      interestType: 'none',
      startDate: new Date('2026-01-15T00:00:00.000Z'),
      installmentCount: 3,
    });

    const payments: LoanInstallmentPayment[] = [
      { installmentSequence: 1, amountCents: 3333, status: 'active' },
      { installmentSequence: 2, amountCents: 1000, status: 'active' },
    ];

    const openState = service.recalculateLoanState({
      installments,
      payments,
      referenceDate: new Date('2026-03-01T00:00:00.000Z'),
    });

    expect(openState.status).toBe('open');
    expect(openState.totalPaidCents).toBe(4333);
    expect(openState.currentBalanceCents).toBe(5667);

    const overdueState = service.recalculateLoanState({
      installments,
      payments: [{ installmentSequence: 1, amountCents: 1000, status: 'active' }],
      referenceDate: new Date('2026-04-16T00:00:00.000Z'),
    });

    expect(overdueState.status).toBe('overdue');
    expect(overdueState.installments[0]?.status).toBe('overdue');

    const paidState = service.recalculateLoanState({
      installments,
      payments: [
        { installmentSequence: 1, amountCents: 3333, status: 'active' },
        { installmentSequence: 2, amountCents: 3333, status: 'active' },
        { installmentSequence: 3, amountCents: 3334, status: 'active' },
      ],
      referenceDate: new Date('2026-02-01T00:00:00.000Z'),
    });

    expect(paidState.status).toBe('paid');
    expect(paidState.currentBalanceCents).toBe(0);
  });

  it('recalculates a canceled loan as canceled with zero balance', () => {
    const installments = service.generateMonthlyInstallments({
      principalAmountCents: 10000,
      interestType: 'none',
      startDate: new Date('2026-01-15T00:00:00.000Z'),
      installmentCount: 2,
    });

    const canceledState = service.recalculateLoanState({
      installments,
      referenceDate: new Date('2026-01-15T00:00:00.000Z'),
      status: 'canceled',
    });

    expect(canceledState).toEqual({
      status: 'canceled',
      dueDate: new Date('2026-03-15T00:00:00.000Z'),
      installments: [
        {
          sequence: 1,
          dueDate: new Date('2026-02-15T00:00:00.000Z'),
          expectedAmountCents: 5000,
          paidAmountCents: 0,
          remainingAmountCents: 0,
          status: 'canceled',
        },
        {
          sequence: 2,
          dueDate: new Date('2026-03-15T00:00:00.000Z'),
          expectedAmountCents: 5000,
          paidAmountCents: 0,
          remainingAmountCents: 0,
          status: 'canceled',
        },
      ],
      totalPaidCents: 0,
      currentBalanceCents: 0,
    });
  });
});
