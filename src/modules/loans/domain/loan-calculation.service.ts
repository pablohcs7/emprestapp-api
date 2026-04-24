import {
  InstallmentStatus,
  LoanCalculationInput,
  LoanInstallmentPayment,
  LoanInstallmentScheduleItem,
  LoanInstallmentState,
  LoanStateInput,
  LoanStateSnapshot,
  LoanStatus,
} from './loan-calculation.types';

const DAYS_IN_YEAR = 365;
const CENTS_PER_DOLLAR = 100;

export class LoanCalculationService {
  calculateContractualTotalCents(input: LoanCalculationInput): number {
    this.assertPositiveInteger(input.principalAmountCents, 'principalAmountCents');
    this.assertPositiveInteger(input.installmentCount, 'installmentCount');

    if (input.interestType === 'none') {
      return input.principalAmountCents;
    }

    this.assertInterestRate(input.interestRate);

    const dueDate = this.calculateLoanDueDate(
      input.startDate,
      input.installmentCount,
    );

    const interestCents =
      input.interestType === 'simple'
        ? this.calculateSimpleInterestCents(
            input.principalAmountCents,
            input.interestRate as number,
            input.startDate,
            dueDate,
          )
        : this.calculateCompoundInterestCents(
            input.principalAmountCents,
            input.interestRate as number,
            input.startDate,
            dueDate,
          );

    return input.principalAmountCents + interestCents;
  }

  calculateSimpleInterestCents(
    principalAmountCents: number,
    interestRate: number,
    startDate: Date,
    endDate: Date,
  ): number {
    this.assertPositiveInteger(principalAmountCents, 'principalAmountCents');
    this.assertInterestRate(interestRate);

    const days = this.calculateCalendarDays(startDate, endDate);
    const rateAsDecimal = interestRate / CENTS_PER_DOLLAR;
    const interest = principalAmountCents * rateAsDecimal * (days / DAYS_IN_YEAR);

    return Math.round(interest);
  }

  calculateCompoundInterestCents(
    principalAmountCents: number,
    interestRate: number,
    startDate: Date,
    endDate: Date,
  ): number {
    this.assertPositiveInteger(principalAmountCents, 'principalAmountCents');
    this.assertInterestRate(interestRate);

    const days = this.calculateCalendarDays(startDate, endDate);
    const dailyRate = interestRate / CENTS_PER_DOLLAR / DAYS_IN_YEAR;
    const compounded =
      principalAmountCents * (Math.pow(1 + dailyRate, days) - 1);

    return Math.round(compounded);
  }

  generateMonthlyInstallments(
    input: LoanCalculationInput,
  ): LoanInstallmentScheduleItem[] {
    this.assertPositiveInteger(input.installmentCount, 'installmentCount');

    const contractualTotalCents = this.calculateContractualTotalCents(input);
    const baseInstallmentCents = Math.floor(
      contractualTotalCents / input.installmentCount,
    );
    const remainderCents =
      contractualTotalCents - baseInstallmentCents * input.installmentCount;

    const installments: LoanInstallmentScheduleItem[] = [];

    for (let sequence = 1; sequence <= input.installmentCount; sequence += 1) {
      const dueDate = this.addMonthsUtc(input.startDate, sequence);
      const expectedAmountCents =
        sequence === input.installmentCount
          ? baseInstallmentCents + remainderCents
          : baseInstallmentCents;

      installments.push({
        sequence,
        dueDate,
        expectedAmountCents,
      });
    }

    return installments;
  }

  recalculateInstallmentState(
    installment: LoanInstallmentScheduleItem,
    payments: LoanInstallmentPayment[] = [],
    referenceDate: Date,
    status: InstallmentStatus = 'pending',
  ): LoanInstallmentState {
    if (status === 'canceled') {
      return {
        ...this.cloneInstallment(installment),
        paidAmountCents: 0,
        remainingAmountCents: 0,
        status: 'canceled',
      };
    }

    const paidAmountCents = payments
      .filter((payment) => payment.status !== 'canceled')
      .filter((payment) => payment.installmentSequence === installment.sequence)
      .reduce((total, payment) => total + payment.amountCents, 0);

    if (paidAmountCents > installment.expectedAmountCents) {
      throw new Error('Payment amount exceeds installment expected amount');
    }

    const remainingAmountCents = installment.expectedAmountCents - paidAmountCents;
    const isOverdue = referenceDate.getTime() > installment.dueDate.getTime();

    return {
      ...this.cloneInstallment(installment),
      paidAmountCents,
      remainingAmountCents,
      status:
        remainingAmountCents === 0 ? 'paid' : isOverdue ? 'overdue' : 'pending',
    };
  }

  recalculateLoanState(input: LoanStateInput): LoanStateSnapshot {
    if (input.installments.length === 0) {
      throw new Error('installments must not be empty');
    }

    const normalizedReferenceDate = new Date(input.referenceDate.getTime());
    const sortedInstallments = input.installments
      .slice()
      .sort((left, right) => left.sequence - right.sequence);

    if (input.status === 'canceled') {
      const canceledInstallments = sortedInstallments.map((installment) => ({
        ...this.cloneInstallment(installment),
        paidAmountCents: 0,
        remainingAmountCents: 0,
        status: 'canceled' as const,
      }));

      return {
        status: 'canceled',
        dueDate: this.cloneDate(
          sortedInstallments[sortedInstallments.length - 1]!.dueDate,
        ),
        installments: canceledInstallments,
        totalPaidCents: 0,
        currentBalanceCents: 0,
      };
    }

    const installments = sortedInstallments.map((installment) =>
      this.recalculateInstallmentState(
        installment,
        input.payments ?? [],
        normalizedReferenceDate,
      ),
    );

    const totalPaidCents = installments.reduce(
      (total, installment) => total + installment.paidAmountCents,
      0,
    );

    const currentBalanceCents = installments.reduce(
      (total, installment) => total + installment.remainingAmountCents,
      0,
    );

    const status = this.deriveLoanStatus(installments, normalizedReferenceDate);

    return {
      status,
      dueDate: this.cloneDate(sortedInstallments[sortedInstallments.length - 1]!.dueDate),
      installments,
      totalPaidCents,
      currentBalanceCents,
    };
  }

  deriveLoanStatus(
    installments: LoanInstallmentState[],
    referenceDate: Date,
  ): LoanStatus {
    if (installments.every((installment) => installment.status === 'canceled')) {
      return 'canceled';
    }

    if (installments.every((installment) => installment.status === 'paid')) {
      return 'paid';
    }

    const hasOverdueInstallment = installments.some(
      (installment) =>
        installment.status !== 'canceled' &&
        installment.remainingAmountCents > 0 &&
        referenceDate.getTime() > installment.dueDate.getTime(),
    );

    return hasOverdueInstallment ? 'overdue' : 'open';
  }

  private calculateLoanDueDate(startDate: Date, installmentCount: number): Date {
    return this.addMonthsUtc(startDate, installmentCount);
  }

  private calculateCalendarDays(startDate: Date, endDate: Date): number {
    const normalizedStart = this.cloneDate(startDate);
    const normalizedEnd = this.cloneDate(endDate);
    const diff = normalizedEnd.getTime() - normalizedStart.getTime();

    if (diff < 0) {
      throw new Error('endDate must not be before startDate');
    }

    return Math.round(diff / (24 * 60 * 60 * 1000));
  }

  private addMonthsUtc(date: Date, monthsToAdd: number): Date {
    const normalized = this.cloneDate(date);
    const year = normalized.getUTCFullYear();
    const month = normalized.getUTCMonth();
    const day = normalized.getUTCDate();

    const targetMonth = month + monthsToAdd;
    const firstDayOfTargetMonth = new Date(Date.UTC(year, targetMonth, 1));
    const targetYear = firstDayOfTargetMonth.getUTCFullYear();
    const targetMonthIndex = firstDayOfTargetMonth.getUTCMonth();
    const lastDayOfTargetMonth = new Date(
      Date.UTC(targetYear, targetMonthIndex + 1, 0),
    ).getUTCDate();

    return new Date(
      Date.UTC(targetYear, targetMonthIndex, Math.min(day, lastDayOfTargetMonth)),
    );
  }

  private cloneDate(date: Date): Date {
    return new Date(date.getTime());
  }

  private cloneInstallment(
    installment: LoanInstallmentScheduleItem,
  ): LoanInstallmentScheduleItem {
    return {
      sequence: installment.sequence,
      dueDate: this.cloneDate(installment.dueDate),
      expectedAmountCents: installment.expectedAmountCents,
    };
  }

  private assertPositiveInteger(value: number, fieldName: string): void {
    if (!Number.isInteger(value) || value <= 0) {
      throw new Error(`${fieldName} must be a positive integer`);
    }
  }

  private assertInterestRate(interestRate: number | null | undefined): void {
    if (typeof interestRate !== 'number' || Number.isNaN(interestRate)) {
      throw new Error('interestRate is required for interest-bearing loans');
    }
  }
}
