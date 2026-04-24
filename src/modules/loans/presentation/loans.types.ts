export type LoanInterestType = 'none' | 'simple' | 'compound';

export type LoanStatus = 'open' | 'paid' | 'overdue' | 'canceled';

export type InstallmentStatus = 'pending' | 'paid' | 'overdue' | 'canceled';

export interface LoanListItemView {
  id: string;
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

export interface LoanInstallmentView {
  id: string;
  sequence: number;
  dueDate: Date;
  expectedAmountCents: number;
  paidAmountCents: number;
  remainingAmountCents: number;
  status: InstallmentStatus;
}

export interface LoanPaymentSummaryView {
  totalPaidCents: number;
  currentBalanceCents: number;
}

export interface LoanDetailView extends LoanListItemView {
  installments: LoanInstallmentView[];
  paymentSummary: LoanPaymentSummaryView;
}

export interface LoanListView {
  items: LoanListItemView[];
  page: number;
  pageSize: number;
  total: number;
}
