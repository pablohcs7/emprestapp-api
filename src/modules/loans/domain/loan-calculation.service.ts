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

const PERCENT_SCALE = 1_000_000n;
const RATE_SCALE = 100n * PERCENT_SCALE;
const COMPOUND_SCALE = 10_000_000_000_000n;

export class LoanCalculationService {
  calculateContractualTotalCents(input: LoanCalculationInput): number {
    return this.generateMonthlyInstallments(input).reduce(
      (total, installment) => total + installment.expectedAmountCents,
      0,
    );
  }

  calculateSimpleInterestCents(
    principalAmountCents: number,
    interestRate: number,
    startDate: Date,
    endDate: Date,
  ): number {
    this.assertPositiveInteger(principalAmountCents, 'principalAmountCents');
    this.assertInterestRate(interestRate);

    const periods = this.countMonthlyPeriods(startDate, endDate);

    return this.calculateSimpleInterestByPeriods(
      principalAmountCents,
      interestRate,
      periods,
    );
  }

  calculateCompoundInterestCents(
    principalAmountCents: number,
    interestRate: number,
    startDate: Date,
    endDate: Date,
  ): number {
    this.assertPositiveInteger(principalAmountCents, 'principalAmountCents');
    this.assertInterestRate(interestRate);

    const periods = this.countMonthlyPeriods(startDate, endDate);

    if (periods === 0) {
      return 0;
    }

    const contractualTotalCents = this.buildPriceInstallmentAmounts(
      principalAmountCents,
      interestRate,
      periods,
    ).reduce((total, amount) => total + amount, 0);

    return contractualTotalCents - principalAmountCents;
  }

  generateMonthlyInstallments(
    input: LoanCalculationInput,
  ): LoanInstallmentScheduleItem[] {
    this.assertPositiveInteger(input.principalAmountCents, 'principalAmountCents');
    this.assertPositiveInteger(input.installmentCount, 'installmentCount');

    const amounts = this.resolveInstallmentAmounts(input);

    return amounts.map((expectedAmountCents, index) => ({
      sequence: index + 1,
      dueDate: this.addMonthsUtc(input.startDate, index + 1),
      expectedAmountCents,
    }));
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
      dueDate: this.cloneDate(
        sortedInstallments[sortedInstallments.length - 1]!.dueDate,
      ),
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

  private resolveInstallmentAmounts(input: LoanCalculationInput): number[] {
    if (input.interestType === 'none') {
      return this.splitAmountsEvenly(
        input.principalAmountCents,
        input.installmentCount,
      );
    }

    this.assertInterestRate(input.interestRate);

    if (input.interestType === 'simple') {
      const interestCents = this.calculateSimpleInterestByPeriods(
        input.principalAmountCents,
        input.interestRate as number,
        input.installmentCount,
      );

      return this.splitAmountsEvenly(
        input.principalAmountCents + interestCents,
        input.installmentCount,
      );
    }

    return this.buildPriceInstallmentAmounts(
      input.principalAmountCents,
      input.interestRate as number,
      input.installmentCount,
    );
  }

  private calculateSimpleInterestByPeriods(
    principalAmountCents: number,
    interestRate: number,
    periods: number,
  ): number {
    if (periods === 0) {
      return 0;
    }

    const rateUnits = this.toRateUnits(interestRate);
    const interestCents = this.roundDivide(
      BigInt(principalAmountCents) * rateUnits * BigInt(periods),
      RATE_SCALE,
    );

    return Number(interestCents);
  }

  private buildPriceInstallmentAmounts(
    principalAmountCents: number,
    interestRate: number,
    periods: number,
  ): number[] {
    if (periods === 1) {
      const interestCents = this.calculateSimpleInterestByPeriods(
        principalAmountCents,
        interestRate,
        1,
      );

      return [principalAmountCents + interestCents];
    }

    const rateUnits = this.toRateUnits(interestRate);

    if (rateUnits === 0n) {
      return this.splitAmountsEvenly(principalAmountCents, periods);
    }

    const fixedInstallmentCents = this.calculatePriceFixedInstallmentCents(
      principalAmountCents,
      rateUnits,
      periods,
    );
    const schedule: number[] = [];
    let outstandingBalance = BigInt(principalAmountCents);

    for (let sequence = 1; sequence <= periods; sequence += 1) {
      const interestCents = this.roundDivide(
        outstandingBalance * rateUnits,
        RATE_SCALE,
      );

      if (sequence < periods) {
        let amortizationCents = BigInt(fixedInstallmentCents) - interestCents;

        if (amortizationCents <= 0n) {
          throw new Error('interestRate results in a non-amortizing schedule');
        }

        if (amortizationCents > outstandingBalance) {
          amortizationCents = outstandingBalance;
        }

        outstandingBalance -= amortizationCents;
        schedule.push(fixedInstallmentCents);
        continue;
      }

      schedule.push(Number(outstandingBalance + interestCents));
      outstandingBalance = 0n;
    }

    return schedule;
  }

  private calculatePriceFixedInstallmentCents(
    principalAmountCents: number,
    rateUnits: bigint,
    periods: number,
  ): number {
    const monthlyFactor = COMPOUND_SCALE + this.roundDivide(
      rateUnits * COMPOUND_SCALE,
      RATE_SCALE,
    );
    const compoundedFactor = this.powScaled(
      monthlyFactor,
      periods,
      COMPOUND_SCALE,
    );
    const numerator =
      BigInt(principalAmountCents) *
      rateUnits *
      compoundedFactor;
    const denominator =
      RATE_SCALE * (compoundedFactor - COMPOUND_SCALE);

    return Number(this.roundDivide(numerator, denominator));
  }

  private splitAmountsEvenly(totalCents: number, periods: number): number[] {
    const baseAmountCents = Math.floor(totalCents / periods);
    const remainderCents = totalCents - baseAmountCents * periods;

    return Array.from({ length: periods }, (_, index) =>
      index === periods - 1 ? baseAmountCents + remainderCents : baseAmountCents,
    );
  }

  private countMonthlyPeriods(startDate: Date, endDate: Date): number {
    const normalizedStart = this.cloneDate(startDate);
    const normalizedEnd = this.cloneDate(endDate);

    if (normalizedEnd.getTime() < normalizedStart.getTime()) {
      throw new Error('endDate must not be before startDate');
    }

    let periods = 0;

    while (
      this.addMonthsUtc(normalizedStart, periods + 1).getTime() <=
      normalizedEnd.getTime()
    ) {
      periods += 1;
    }

    return periods;
  }

  private powScaled(base: bigint, exponent: number, scale: bigint): bigint {
    let result = scale;

    for (let index = 0; index < exponent; index += 1) {
      result = this.roundDivide(result * base, scale);
    }

    return result;
  }

  private roundDivide(dividend: bigint, divisor: bigint): bigint {
    return (dividend + divisor / 2n) / divisor;
  }

  private toRateUnits(interestRate: number): bigint {
    return BigInt(Math.round(interestRate * Number(PERCENT_SCALE)));
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
