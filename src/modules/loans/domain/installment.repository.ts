import {
  CreateInstallmentRecord,
  Installment,
  InstallmentStatus,
} from './installment.types';

export interface UpdateInstallmentDerivedStateRecord {
  installmentId: string;
  userId: string;
  paidAmountCents: number;
  remainingAmountCents: number;
  status: Exclude<InstallmentStatus, 'canceled'>;
}

export abstract class InstallmentRepository {
  abstract createMany(records: CreateInstallmentRecord[]): Promise<Installment[]>;
  abstract findById(installmentId: string): Promise<Installment | null>;
  abstract findByIdForUser(
    installmentId: string,
    userId: string,
  ): Promise<Installment | null>;
  abstract findByLoanId(loanId: string, userId: string): Promise<Installment[]>;
  abstract findByLoanIdAndStatus(
    loanId: string,
    userId: string,
    status: InstallmentStatus,
  ): Promise<Installment[]>;
  abstract findByLoanIdAndSequence(
    loanId: string,
    userId: string,
    sequence: number,
  ): Promise<Installment | null>;
  abstract findNextOpenForLoan(
    loanId: string,
    userId: string,
  ): Promise<Installment | null>;
  abstract updateDerivedState(
    input: UpdateInstallmentDerivedStateRecord,
  ): Promise<Installment | null>;
  abstract cancelByLoan(
    loanId: string,
    userId: string,
    canceledAt: Date,
  ): Promise<Installment[]>;
  abstract deleteByLoan(loanId: string, userId: string): Promise<boolean>;
}
