export type DashboardHistoryLoanStatus =
  | 'open'
  | 'paid'
  | 'overdue'
  | 'canceled';

export interface DashboardSummaryView {
  totalOutstandingCents: number;
  totalOverdueCents: number;
  totalReceivedCents: number;
  openLoansCount: number;
  overdueLoansCount: number;
}

export interface DashboardHistoryItemView {
  id: string;
  contactId: string | null;
  contactName: string | null;
  principalAmountCents: number;
  currentBalanceCents: number;
  totalPaidCents: number;
  dueDate: Date;
  status: DashboardHistoryLoanStatus;
  createdAt: Date;
  updatedAt: Date;
  canceledAt: Date | null;
}

export interface DashboardHistoryListView {
  items: DashboardHistoryItemView[];
  page: number;
  pageSize: number;
  total: number;
}
