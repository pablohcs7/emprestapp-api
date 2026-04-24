export type LoanInterestType = 'none' | 'simple' | 'compound';

export type LoanStatus = 'open' | 'paid' | 'overdue' | 'canceled';

export interface Loan {
  id: string;
  userId: string;
  contactId: string | null;
  principalAmountCents: number;
  interestType: LoanInterestType;
  interestRate: number | null;
  startDate: Date;
  dueDate: Date;
  installmentCount: number;
  status: LoanStatus;
  currentBalanceCents: number;
  totalPaidCents: number;
  createdAt: Date;
  updatedAt: Date;
  canceledAt: Date | null;
}

export interface CreateLoanRecord {
  userId: string;
  contactId?: string | null;
  principalAmountCents: number;
  interestType: LoanInterestType;
  interestRate?: number | null;
  startDate: Date;
  dueDate: Date;
  installmentCount: number;
  currentBalanceCents: number;
  totalPaidCents: number;
}

export interface UpdateLoanDerivedStateRecord {
  loanId: string;
  userId: string;
  status: Exclude<LoanStatus, 'canceled'>;
  currentBalanceCents: number;
  totalPaidCents: number;
}

export interface LoanListFilters {
  status?: LoanStatus[];
  contactId?: string;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  periodFrom?: Date;
  periodTo?: Date;
  page: number;
  pageSize: number;
}

export interface LoanListResult {
  items: Loan[];
  total: number;
}
