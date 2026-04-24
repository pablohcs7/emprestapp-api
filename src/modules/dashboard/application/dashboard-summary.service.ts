import { Injectable } from '@nestjs/common';

import { LoanRepository } from '../../loans/domain/loan.repository';
import { LoanStatus } from '../../loans/domain/loan.types';
import { PaymentRepository } from '../../payments/domain/payment.repository';
import { PaymentStatus } from '../../payments/domain/payment.types';
import { DashboardSummaryView } from '../presentation/dashboard.types';

interface DashboardSummaryTotals {
  totalOutstandingCents: number;
  totalOverdueCents: number;
  openLoansCount: number;
  overdueLoansCount: number;
}

@Injectable()
export class DashboardSummaryService {
  private static readonly pageSize = 100;
  private static readonly loanStatuses: LoanStatus[] = ['open', 'paid', 'overdue'];
  private static readonly paymentStatuses: PaymentStatus[] = ['active'];

  constructor(
    private readonly loanRepository: LoanRepository,
    private readonly paymentRepository: PaymentRepository,
  ) {}

  async getSummary(userId: string): Promise<DashboardSummaryView> {
    const [loanTotals, totalReceivedCents] = await Promise.all([
      this.collectLoanTotals(userId),
      this.collectTotalReceived(userId),
    ]);

    return {
      totalOutstandingCents: loanTotals.totalOutstandingCents,
      totalOverdueCents: loanTotals.totalOverdueCents,
      totalReceivedCents,
      openLoansCount: loanTotals.openLoansCount,
      overdueLoansCount: loanTotals.overdueLoansCount,
    };
  }

  private async collectLoanTotals(userId: string): Promise<DashboardSummaryTotals> {
    let page = 1;
    let processed = 0;
    let totalOutstandingCents = 0;
    let totalOverdueCents = 0;
    let openLoansCount = 0;
    let overdueLoansCount = 0;

    while (true) {
      const result = await this.loanRepository.listForUser(userId, {
        status: [...DashboardSummaryService.loanStatuses],
        page,
        pageSize: DashboardSummaryService.pageSize,
      });

      for (const loan of result.items) {
        if (loan.status === 'canceled') {
          continue;
        }

        totalOutstandingCents += loan.currentBalanceCents;

        if (loan.status === 'open') {
          openLoansCount += 1;
        }

        if (loan.status === 'overdue') {
          overdueLoansCount += 1;
          totalOverdueCents += loan.currentBalanceCents;
        }
      }

      processed += result.items.length;

      if (processed >= result.total || result.items.length === 0) {
        break;
      }

      page += 1;
    }

    return {
      totalOutstandingCents,
      totalOverdueCents,
      openLoansCount,
      overdueLoansCount,
    };
  }

  private async collectTotalReceived(userId: string): Promise<number> {
    let page = 1;
    let processed = 0;
    let totalReceivedCents = 0;

    while (true) {
      const result = await this.paymentRepository.listForUser(userId, {
        status: [...DashboardSummaryService.paymentStatuses],
        page,
        pageSize: DashboardSummaryService.pageSize,
      });

      for (const payment of result.items) {
        if (payment.status !== 'active') {
          continue;
        }

        totalReceivedCents += payment.amountCents;
      }

      processed += result.items.length;

      if (processed >= result.total || result.items.length === 0) {
        break;
      }

      page += 1;
    }

    return totalReceivedCents;
  }
}
