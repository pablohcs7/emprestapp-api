export type PaymentStatus = 'active' | 'canceled';

export interface Payment {
  id: string;
  userId: string;
  loanId: string;
  installmentId: string;
  amountCents: number;
  paidAt: Date;
  method: string | null;
  note: string | null;
  status: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
  canceledAt: Date | null;
}

export interface CreatePaymentRecord {
  userId: string;
  loanId: string;
  installmentId: string;
  amountCents: number;
  paidAt: Date;
  method?: string | null;
  note?: string | null;
}

export interface PaymentListFilters {
  loanId?: string;
  installmentId?: string;
  status?: PaymentStatus[];
  paidAtFrom?: Date;
  paidAtTo?: Date;
  page: number;
  pageSize: number;
}

export interface PaymentListResult {
  items: Payment[];
  total: number;
}
