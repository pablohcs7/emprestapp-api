export type PaymentStatus = 'active' | 'canceled';

export interface PaymentView {
  id: string;
  loanId: string;
  installmentId: string;
  amountCents: number;
  paidAt: Date;
  method: string | null;
  note: string | null;
  status: PaymentStatus;
  createdAt: Date;
  canceledAt: Date | null;
}

export type PaymentListItemView = PaymentView;

export interface PaymentListView {
  items: PaymentListItemView[];
  page: number;
  pageSize: number;
  total: number;
}
