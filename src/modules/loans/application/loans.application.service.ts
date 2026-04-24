import { Injectable } from '@nestjs/common';

import { ContactRepository } from '../../contacts/domain/contact.repository';
import { Contact } from '../../contacts/domain/contact.types';
import {
  LoanDetailView,
  LoanInstallmentView,
  LoanListItemView,
} from '../presentation/loans.types';
import { InstallmentRepository } from '../domain/installment.repository';
import { CreateInstallmentRecord, Installment } from '../domain/installment.types';
import { LoanCalculationService } from '../domain/loan-calculation.service';
import { LoanRepository } from '../domain/loan.repository';
import { LoanInterestType, Loan } from '../domain/loan.types';

export interface CreateLoanInput {
  contactId?: string;
  principalAmountCents: number;
  interestType: LoanInterestType;
  interestRate?: number;
  startDate: string;
  installmentPlan?: {
    count: number;
  };
}

export interface LinkLoanContactInput {
  contactId: string;
}

export class LoanApplicationError extends Error {
  constructor(
    public readonly code:
      | 'LOAN_NOT_FOUND'
      | 'CONTACT_NOT_FOUND'
      | 'FORBIDDEN_RESOURCE',
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class LoanNotFoundError extends LoanApplicationError {
  constructor() {
    super('LOAN_NOT_FOUND', 'Loan not found');
  }
}

export class ContactNotFoundError extends LoanApplicationError {
  constructor() {
    super('CONTACT_NOT_FOUND', 'Contact not found');
  }
}

export class ForbiddenLoanResourceError extends LoanApplicationError {
  constructor() {
    super('FORBIDDEN_RESOURCE', 'Forbidden resource');
  }
}

@Injectable()
export class LoansApplicationService {
  constructor(
    private readonly loanRepository: LoanRepository,
    private readonly installmentRepository: InstallmentRepository,
    private readonly contactRepository: ContactRepository,
    private readonly loanCalculationService: LoanCalculationService,
  ) {}

  async create(
    userId: string,
    input: CreateLoanInput,
  ): Promise<LoanDetailView> {
    if (input.contactId) {
      await this.assertContactAccessible(userId, input.contactId);
    }

    const startDate = new Date(input.startDate);
    const installmentCount = input.installmentPlan?.count ?? 1;
    const schedule = this.loanCalculationService.generateMonthlyInstallments({
      principalAmountCents: input.principalAmountCents,
      interestType: input.interestType,
      interestRate: input.interestRate,
      startDate,
      installmentCount,
    });
    const initialState = this.loanCalculationService.recalculateLoanState({
      installments: schedule,
      referenceDate: startDate,
    });

    const createdLoan = await this.loanRepository.create({
      userId,
      contactId: input.contactId ?? null,
      principalAmountCents: input.principalAmountCents,
      interestType: input.interestType,
      interestRate: input.interestRate ?? null,
      startDate,
      dueDate: initialState.dueDate,
      installmentCount,
      currentBalanceCents: initialState.currentBalanceCents,
      totalPaidCents: initialState.totalPaidCents,
    });

    try {
      const createdInstallments = await this.installmentRepository.createMany(
        initialState.installments.map<CreateInstallmentRecord>((installment) => ({
          userId,
          loanId: createdLoan.id,
          sequence: installment.sequence,
          dueDate: installment.dueDate,
          expectedAmountCents: installment.expectedAmountCents,
          paidAmountCents: installment.paidAmountCents,
          remainingAmountCents: installment.remainingAmountCents,
          status: installment.status,
          canceledAt: null,
        })),
      );

      return this.toDetailView(createdLoan, createdInstallments);
    } catch (error) {
      await this.loanRepository.delete(createdLoan.id, userId);
      throw error;
    }
  }

  async linkContact(
    userId: string,
    loanId: string,
    input: LinkLoanContactInput,
  ): Promise<LoanListItemView> {
    await this.assertLoanAccessible(userId, loanId);
    await this.assertContactAccessible(userId, input.contactId);

    const updated = await this.loanRepository.linkContact(
      loanId,
      userId,
      input.contactId,
    );

    if (!updated) {
      throw new LoanNotFoundError();
    }

    return this.toListItemView(updated);
  }

  private async assertLoanAccessible(
    userId: string,
    loanId: string,
  ): Promise<Loan> {
    const loan = await this.loanRepository.findByIdForUser(loanId, userId);

    if (!loan) {
      const existingLoan = await this.loanRepository.findById(loanId);

      if (existingLoan) {
        throw new ForbiddenLoanResourceError();
      }

      throw new LoanNotFoundError();
    }

    return loan;
  }

  private async assertContactAccessible(
    userId: string,
    contactId: string,
  ): Promise<Contact> {
    const contact = await this.contactRepository.findByIdForUser(contactId, userId);

    if (!contact) {
      const existingContact = await this.contactRepository.findById(contactId);

      if (existingContact) {
        throw new ForbiddenLoanResourceError();
      }

      throw new ContactNotFoundError();
    }

    return contact;
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
