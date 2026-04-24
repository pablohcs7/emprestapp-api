import { Injectable } from '@nestjs/common';

import { InstallmentRepository } from '../domain/installment.repository';
import { Installment } from '../domain/installment.types';
import { LoanRepository } from '../domain/loan.repository';
import { Loan, LoanListFilters, LoanStatus } from '../domain/loan.types';
import {
  LoanDetailView,
  LoanInstallmentView,
  LoanListItemView,
  LoanListView,
} from '../presentation/loans.types';
import {
  ForbiddenLoanResourceError,
  LoanNotFoundError,
} from './loans.application.service';

@Injectable()
export class LoansReadService {
  private static readonly defaultListStatuses: LoanStatus[] = [
    'open',
    'paid',
    'overdue',
  ];

  constructor(
    private readonly loanRepository: LoanRepository,
    private readonly installmentRepository: InstallmentRepository,
  ) {}

  async list(
    userId: string,
    filters: LoanListFilters,
  ): Promise<LoanListView> {
    const result = await this.loanRepository.listForUser(userId, {
      ...filters,
      status: filters.status ?? LoansReadService.defaultListStatuses,
    });

    return {
      items: result.items.map((loan) => this.toListItemView(loan)),
      page: filters.page,
      pageSize: filters.pageSize,
      total: result.total,
    };
  }

  async detail(userId: string, loanId: string): Promise<LoanDetailView> {
    const loan = await this.loanRepository.findByIdForUser(loanId, userId);

    if (!loan) {
      throw await this.resolveMissingScopedLoan(loanId);
    }

    const installments = await this.installmentRepository.findByLoanId(
      loanId,
      userId,
    );

    return this.toDetailView(loan, installments);
  }

  private async resolveMissingScopedLoan(
    loanId: string,
  ): Promise<LoanNotFoundError | ForbiddenLoanResourceError> {
    const loan = await this.loanRepository.findById(loanId);

    if (!loan) {
      return new LoanNotFoundError();
    }

    return new ForbiddenLoanResourceError();
  }

  private toDetailView(
    loan: Loan,
    installments: Installment[],
  ): LoanDetailView {
    return {
      ...this.toListItemView(loan),
      installments: installments
        .slice()
        .sort((left, right) => left.sequence - right.sequence)
        .map((installment) => this.toInstallmentView(installment)),
      paymentSummary: {
        totalPaidCents: loan.totalPaidCents,
        currentBalanceCents: loan.currentBalanceCents,
      },
    };
  }

  private toListItemView(loan: Loan): LoanListItemView {
    return {
      id: loan.id,
      contactId: loan.contactId,
      principalAmountCents: loan.principalAmountCents,
      interestType: loan.interestType,
      interestRate: loan.interestRate,
      startDate: loan.startDate,
      dueDate: loan.dueDate,
      installmentCount: loan.installmentCount,
      status: loan.status,
      currentBalanceCents: loan.currentBalanceCents,
      totalPaidCents: loan.totalPaidCents,
      createdAt: loan.createdAt,
      updatedAt: loan.updatedAt,
      canceledAt: loan.canceledAt,
    };
  }

  private toInstallmentView(installment: Installment): LoanInstallmentView {
    return {
      id: installment.id,
      sequence: installment.sequence,
      dueDate: installment.dueDate,
      expectedAmountCents: installment.expectedAmountCents,
      paidAmountCents: installment.paidAmountCents,
      remainingAmountCents: installment.remainingAmountCents,
      status: installment.status,
    };
  }
}
