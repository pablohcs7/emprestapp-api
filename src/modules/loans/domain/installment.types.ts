export type InstallmentStatus = 'pending' | 'paid' | 'overdue' | 'canceled';

export interface Installment {
  id: string;
  userId: string;
  loanId: string;
  sequence: number;
  dueDate: Date;
  expectedAmountCents: number;
  paidAmountCents: number;
  remainingAmountCents: number;
  status: InstallmentStatus;
  createdAt: Date;
  updatedAt: Date;
  canceledAt: Date | null;
}

export interface CreateInstallmentRecord {
  userId: string;
  loanId: string;
  sequence: number;
  dueDate: Date;
  expectedAmountCents: number;
  paidAmountCents?: number;
  remainingAmountCents?: number;
  status?: InstallmentStatus;
  canceledAt?: Date | null;
}
