export type LoanInterestType = 'none' | 'simple' | 'compound';

export type LoanStatus = 'open' | 'paid' | 'overdue' | 'canceled';

export type InstallmentStatus = 'pending' | 'paid' | 'overdue' | 'canceled';

export interface LoanCalculationInput {
  principalAmountCents: number;
  interestType: LoanInterestType;
  interestRate?: number | null;
  startDate: Date;
  installmentCount: number;
}

export interface LoanInstallmentScheduleItem {
  sequence: number;
  dueDate: Date;
  expectedAmountCents: number;
}

export interface LoanInstallmentPayment {
  installmentSequence: number;
  amountCents: number;
  status?: 'active' | 'canceled';
}

export interface LoanInstallmentState extends LoanInstallmentScheduleItem {
  paidAmountCents: number;
  remainingAmountCents: number;
  status: InstallmentStatus;
}

export interface LoanStateInput {
  installments: LoanInstallmentScheduleItem[];
  payments?: LoanInstallmentPayment[];
  referenceDate: Date;
  status?: LoanStatus;
}

export interface LoanStateSnapshot {
  status: LoanStatus;
  dueDate: Date;
  installments: LoanInstallmentState[];
  totalPaidCents: number;
  currentBalanceCents: number;
}

