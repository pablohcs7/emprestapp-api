import {
  CreatePaymentRecord,
  Payment,
  PaymentListFilters,
  PaymentListResult,
} from './payment.types';

export abstract class PaymentRepository {
  abstract register(input: CreatePaymentRecord): Promise<Payment>;
  abstract findById(paymentId: string): Promise<Payment | null>;
  abstract findByIdForUser(
    paymentId: string,
    userId: string,
  ): Promise<Payment | null>;
  abstract listForUser(
    userId: string,
    filters: PaymentListFilters,
  ): Promise<PaymentListResult>;
  abstract listByLoanId(
    loanId: string,
    userId: string,
    filters: PaymentListFilters,
  ): Promise<PaymentListResult>;
  abstract listActiveByLoanId(loanId: string, userId: string): Promise<Payment[]>;
  abstract listActiveByInstallmentId(
    installmentId: string,
    userId: string,
  ): Promise<Payment[]>;
  abstract cancel(
    paymentId: string,
    userId: string,
    canceledAt: Date,
  ): Promise<Payment | null>;
}
