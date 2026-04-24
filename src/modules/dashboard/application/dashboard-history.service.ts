import { Injectable } from '@nestjs/common';

import { ContactRepository } from '../../contacts/domain/contact.repository';
import { LoanRepository } from '../../loans/domain/loan.repository';
import { Loan } from '../../loans/domain/loan.types';
import {
  DashboardHistoryItemView,
  DashboardHistoryListView,
  DashboardHistoryLoanStatus,
} from '../presentation/dashboard.types';

export interface DashboardHistoryFilters {
  status?: DashboardHistoryLoanStatus[];
  contactId?: string;
  dueDateFrom?: Date;
  dueDateTo?: Date;
  periodFrom?: Date;
  periodTo?: Date;
  page: number;
  pageSize: number;
}

@Injectable()
export class DashboardHistoryService {
  private static readonly defaultStatuses: DashboardHistoryLoanStatus[] = [
    'open',
    'paid',
    'overdue',
  ];

  constructor(
    private readonly loanRepository: LoanRepository,
    private readonly contactRepository: ContactRepository,
  ) {}

  async list(
    userId: string,
    filters: DashboardHistoryFilters,
  ): Promise<DashboardHistoryListView> {
    const result = await this.loanRepository.listForUser(userId, {
      ...filters,
      status: filters.status?.length
        ? filters.status
        : DashboardHistoryService.defaultStatuses,
    });

    const contactNameById = await this.loadContactNames(userId, result.items);

    return {
      items: result.items.map((loan) => this.toHistoryItemView(loan, contactNameById)),
      page: filters.page,
      pageSize: filters.pageSize,
      total: result.total,
    };
  }

  private async loadContactNames(
    userId: string,
    loans: Loan[],
  ): Promise<Map<string, string>> {
    const contactIds = [...new Set(
      loans
        .map((loan) => loan.contactId)
        .filter((contactId): contactId is string => Boolean(contactId)),
    )];

    if (!contactIds.length) {
      return new Map();
    }

    const contacts = await Promise.all(
      contactIds.map((contactId) =>
        this.contactRepository.findByIdForUser(contactId, userId),
      ),
    );

    return contacts.reduce((acc, contact, index) => {
      if (contact) {
        acc.set(contactIds[index] as string, contact.fullName);
      }

      return acc;
    }, new Map<string, string>());
  }

  private toHistoryItemView(
    loan: Loan,
    contactNameById: Map<string, string>,
  ): DashboardHistoryItemView {
    return {
      id: loan.id,
      contactId: loan.contactId,
      contactName: loan.contactId
        ? contactNameById.get(loan.contactId) ?? null
        : null,
      principalAmountCents: loan.principalAmountCents,
      currentBalanceCents: loan.currentBalanceCents,
      totalPaidCents: loan.totalPaidCents,
      dueDate: loan.dueDate,
      status: loan.status,
      createdAt: loan.createdAt,
      updatedAt: loan.updatedAt,
      canceledAt: loan.canceledAt,
    };
  }
}
