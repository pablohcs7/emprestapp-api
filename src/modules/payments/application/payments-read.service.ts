import { Injectable } from '@nestjs/common';

import { LoanRepository } from '../../loans/domain/loan.repository';
import { Loan } from '../../loans/domain/loan.types';
import { PaymentRepository } from '../domain/payment.repository';
import { PaymentListFilters, Payment } from '../domain/payment.types';
import { PaymentListItemView, PaymentListView } from '../presentation/payments.types';
import {
  ForbiddenPaymentResourceError,
  LoanNotFoundError,
} from './payments.application.service';

@Injectable()
export class PaymentsReadService {
  private static readonly defaultGlobalStatuses = ['active'] as const;
  private static readonly defaultLoanHistoryStatuses = [
    'active',
    'canceled',
  ] as const;

  constructor(
    private readonly paymentRepository: PaymentRepository,
    private readonly loanRepository: LoanRepository,
  ) {}

  async list(userId: string, filters: PaymentListFilters): Promise<PaymentListView> {
    const result = await this.paymentRepository.listForUser(userId, {
      ...filters,
      status: filters.status ?? [...PaymentsReadService.defaultGlobalStatuses],
    });

    return {
      items: result.items.map((payment) => this.toListItemView(payment)),
      page: filters.page,
      pageSize: filters.pageSize,
      total: result.total,
    };
  }

  async listByLoan(
    userId: string,
    loanId: string,
    filters: PaymentListFilters,
  ): Promise<PaymentListView> {
    await this.assertLoanAccessible(userId, loanId);

    const result = await this.paymentRepository.listByLoanId(loanId, userId, {
      ...filters,
      status:
        filters.status ?? [...PaymentsReadService.defaultLoanHistoryStatuses],
    });

    return {
      items: result.items.map((payment) => this.toListItemView(payment)),
      page: filters.page,
      pageSize: filters.pageSize,
      total: result.total,
    };
  }

  private async assertLoanAccessible(userId: string, loanId: string): Promise<Loan> {
    const loan = await this.loanRepository.findByIdForUser(loanId, userId);

    if (!loan) {
      const existingLoan = await this.loanRepository.findById(loanId);

      if (existingLoan) {
        throw new ForbiddenPaymentResourceError();
      }

      throw new LoanNotFoundError();
    }

    return loan;
  }

  private toListItemView(payment: Payment): PaymentListItemView {
    return {
      id: payment.id,
      loanId: payment.loanId,
      installmentId: payment.installmentId,
      amountCents: payment.amountCents,
      paidAt: payment.paidAt,
      method: payment.method,
      note: payment.note,
      status: payment.status,
      createdAt: payment.createdAt,
      canceledAt: payment.canceledAt,
    };
  }
}
