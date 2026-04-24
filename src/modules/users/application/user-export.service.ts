import { Injectable } from '@nestjs/common';

import { ContactRepository } from '../../contacts/domain/contact.repository';
import { Contact } from '../../contacts/domain/contact.types';
import { InstallmentRepository } from '../../loans/domain/installment.repository';
import { Installment } from '../../loans/domain/installment.types';
import { LoanRepository } from '../../loans/domain/loan.repository';
import { Loan } from '../../loans/domain/loan.types';
import { PaymentRepository } from '../../payments/domain/payment.repository';
import { Payment } from '../../payments/domain/payment.types';
import { UserRepository } from '../domain/user.repository';
import { User } from '../domain/user.types';
import {
  UserExportFileView,
  UserExportJsonView,
  UserProfileView,
} from '../presentation/users.types';

const EXPORT_PAGE_SIZE = 100;

@Injectable()
export class UserExportService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly contactRepository: ContactRepository,
    private readonly loanRepository: LoanRepository,
    private readonly installmentRepository: InstallmentRepository,
    private readonly paymentRepository: PaymentRepository,
  ) {}

  async export(
    userId: string,
    format: 'json' | 'csv',
  ): Promise<UserExportFileView> {
    const payload = await this.buildJsonPayload(userId);

    if (format === 'csv') {
      return {
        format,
        fileName: `emprestapp-export-${userId}.csv`,
        contentType: 'text/csv; charset=utf-8',
        content: this.toCsv(payload),
      };
    }

    return {
      format,
      fileName: `emprestapp-export-${userId}.json`,
      contentType: 'application/json; charset=utf-8',
      content: JSON.stringify(payload, null, 2),
    };
  }

  async buildJsonPayload(userId: string): Promise<UserExportJsonView> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new Error('User not found');
    }

    const [contacts, loans, payments] = await Promise.all([
      this.readAllContacts(userId),
      this.readAllLoans(userId),
      this.readAllPayments(userId),
    ]);
    const installments = await this.readAllInstallments(userId, loans);

    return {
      user: this.toProfileWithLifecycle(user),
      contacts: contacts.map((contact) => this.toPlainContact(contact)),
      loans: loans.map((loan) => this.toPlainLoan(loan)),
      installments: installments.map((installment) =>
        this.toPlainInstallment(installment),
      ),
      payments: payments.map((payment) => this.toPlainPayment(payment)),
    };
  }

  private async readAllContacts(userId: string): Promise<Contact[]> {
    return this.readAllPages(async (page, pageSize) => {
      const result = await this.contactRepository.listForUser(userId, {
        page,
        pageSize,
      });

      return {
        items: result.items,
        total: result.total,
      };
    });
  }

  private async readAllLoans(userId: string): Promise<Loan[]> {
    return this.readAllPages(async (page, pageSize) => {
      const result = await this.loanRepository.listForUser(userId, {
        page,
        pageSize,
        status: ['open', 'paid', 'overdue', 'canceled'],
      });

      return {
        items: result.items,
        total: result.total,
      };
    });
  }

  private async readAllPayments(userId: string): Promise<Payment[]> {
    return this.readAllPages(async (page, pageSize) => {
      const result = await this.paymentRepository.listForUser(userId, {
        page,
        pageSize,
        status: ['active', 'canceled'],
      });

      return {
        items: result.items,
        total: result.total,
      };
    });
  }

  private async readAllInstallments(
    userId: string,
    loans: Loan[],
  ): Promise<Installment[]> {
    const installmentsByLoan = await Promise.all(
      loans.map((loan) => this.installmentRepository.findByLoanId(loan.id, userId)),
    );

    return installmentsByLoan.flat();
  }

  private async readAllPages<T>(
    readPage: (
      page: number,
      pageSize: number,
    ) => Promise<{ items: T[]; total: number }>,
  ): Promise<T[]> {
    const items: T[] = [];
    let page = 1;
    let total = 0;

    do {
      const result = await readPage(page, EXPORT_PAGE_SIZE);
      total = result.total;
      items.push(...result.items);
      page += 1;
    } while (items.length < total);

    return items;
  }

  private toProfileWithLifecycle(user: User): UserExportJsonView['user'] {
    return {
      ...this.toProfile(user),
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
    };
  }

  private toProfile(user: User): UserProfileView {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      status: user.status,
      createdAt: user.createdAt,
    };
  }

  private toPlainContact(contact: Contact): Record<string, unknown> {
    return {
      id: contact.id,
      userId: contact.userId,
      fullName: contact.fullName,
      documentId: contact.documentId,
      phone: contact.phone,
      notes: contact.notes,
      status: contact.status,
      createdAt: contact.createdAt,
      updatedAt: contact.updatedAt,
      archivedAt: contact.archivedAt,
    };
  }

  private toPlainLoan(loan: Loan): Record<string, unknown> {
    return {
      id: loan.id,
      userId: loan.userId,
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

  private toPlainInstallment(installment: Installment): Record<string, unknown> {
    return {
      id: installment.id,
      userId: installment.userId,
      loanId: installment.loanId,
      sequence: installment.sequence,
      dueDate: installment.dueDate,
      expectedAmountCents: installment.expectedAmountCents,
      paidAmountCents: installment.paidAmountCents,
      remainingAmountCents: installment.remainingAmountCents,
      status: installment.status,
      createdAt: installment.createdAt,
      updatedAt: installment.updatedAt,
      canceledAt: installment.canceledAt,
    };
  }

  private toPlainPayment(payment: Payment): Record<string, unknown> {
    return {
      id: payment.id,
      userId: payment.userId,
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

  private toCsv(payload: UserExportJsonView): string {
    const sections = [
      this.renderCsvSection('user', [this.toPlainUserExportUser(payload.user)]),
      this.renderCsvSection('contacts', payload.contacts),
      this.renderCsvSection('loans', payload.loans),
      this.renderCsvSection('installments', payload.installments),
      this.renderCsvSection('payments', payload.payments),
    ];

    return sections.join('\n\n');
  }

  private toPlainUserExportUser(
    user: UserExportJsonView['user'],
  ): Record<string, unknown> {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      deletedAt: user.deletedAt,
    };
  }

  private renderCsvSection(
    title: string,
    rows: Array<Record<string, unknown>>,
  ): string {
    if (!rows.length) {
      return `# ${title}\n`;
    }

    const headers = Array.from(
      rows.reduce((allKeys, row) => {
        Object.keys(row).forEach((key) => allKeys.add(key));
        return allKeys;
      }, new Set<string>()),
    );
    const lines = rows.map((row) =>
      headers.map((header) => this.escapeCsv(row[header])).join(','),
    );

    return [`# ${title}`, headers.join(','), ...lines].join('\n');
  }

  private escapeCsv(value: unknown): string {
    if (value instanceof Date) {
      return this.escapeCsv(value.toISOString());
    }

    if (value === null || value === undefined) {
      return '';
    }

    const normalized =
      typeof value === 'string' ? value : JSON.stringify(value);
    const escaped = normalized.replace(/"/g, '""');

    return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
  }
}
