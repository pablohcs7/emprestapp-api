import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { LoanRepository } from '../../domain/loan.repository';
import {
  CreateLoanRecord,
  Loan,
  LoanListFilters,
  LoanListResult,
  UpdateLoanDerivedStateRecord,
} from '../../domain/loan.types';
import { LoanDocument, LoanModelDocument } from './loan.schema';

const toObjectId = (value: string): Types.ObjectId => new Types.ObjectId(value.trim());

const toNullableObjectId = (
  value: string | null | undefined,
): Types.ObjectId | null => (value ? toObjectId(value) : null);

const toLoan = (document: LoanModelDocument): Loan => ({
  id: document._id.toString(),
  userId: document.userId.toString(),
  contactId: document.contactId ? document.contactId.toString() : null,
  principalAmountCents: document.principalAmountCents,
  interestType: document.interestType,
  interestRate: document.interestRate ?? null,
  startDate: document.startDate,
  dueDate: document.dueDate,
  installmentCount: document.installmentCount,
  status: document.status,
  currentBalanceCents: document.currentBalanceCents,
  totalPaidCents: document.totalPaidCents,
  createdAt: document.createdAt,
  updatedAt: document.updatedAt,
  canceledAt: document.canceledAt ?? null,
});

@Injectable()
export class MongooseLoanRepository implements LoanRepository {
  constructor(
    @InjectModel(LoanDocument.name)
    private readonly loanModel: Model<LoanDocument>,
  ) {}

  async create(input: CreateLoanRecord): Promise<Loan> {
    const created = await this.loanModel.create({
      userId: toObjectId(input.userId),
      contactId: toNullableObjectId(input.contactId),
      principalAmountCents: input.principalAmountCents,
      interestType: input.interestType,
      interestRate: input.interestRate ?? null,
      startDate: input.startDate,
      dueDate: input.dueDate,
      installmentCount: input.installmentCount,
      status: 'open',
      currentBalanceCents: input.currentBalanceCents,
      totalPaidCents: input.totalPaidCents,
      canceledAt: null,
    });

    return toLoan(created as LoanModelDocument);
  }

  async findById(loanId: string): Promise<Loan | null> {
    const document = await this.loanModel.findById(loanId);

    return document ? toLoan(document as LoanModelDocument) : null;
  }

  async findByIdForUser(loanId: string, userId: string): Promise<Loan | null> {
    const document = await this.loanModel.findOne({
      _id: loanId,
      userId: toObjectId(userId),
    });

    return document ? toLoan(document as LoanModelDocument) : null;
  }

  async listForUser(
    userId: string,
    filters: LoanListFilters,
  ): Promise<LoanListResult> {
    const query: Record<string, unknown> = {
      userId: toObjectId(userId),
    };

    if (filters.status?.length) {
      query.status = { $in: filters.status };
    }

    if (filters.contactId) {
      query.contactId = toObjectId(filters.contactId);
    }

    if (filters.dueDateFrom || filters.dueDateTo) {
      query.dueDate = {
        ...(filters.dueDateFrom ? { $gte: filters.dueDateFrom } : {}),
        ...(filters.dueDateTo ? { $lte: filters.dueDateTo } : {}),
      };
    }

    if (filters.periodFrom || filters.periodTo) {
      query.createdAt = {
        ...(filters.periodFrom ? { $gte: filters.periodFrom } : {}),
        ...(filters.periodTo ? { $lte: filters.periodTo } : {}),
      };
    }

    const [items, total] = await Promise.all([
      this.loanModel
        .find(query)
        .sort({ createdAt: -1, _id: -1 })
        .skip((filters.page - 1) * filters.pageSize)
        .limit(filters.pageSize),
      this.loanModel.countDocuments(query),
    ]);

    return {
      items: items.map((item) => toLoan(item as LoanModelDocument)),
      total,
    };
  }

  async updateDerivedState(
    input: UpdateLoanDerivedStateRecord,
  ): Promise<Loan | null> {
    const updated = await this.loanModel.findOneAndUpdate(
      {
        _id: input.loanId,
        userId: toObjectId(input.userId),
      },
      {
        status: input.status,
        currentBalanceCents: input.currentBalanceCents,
        totalPaidCents: input.totalPaidCents,
      },
      { returnDocument: 'after' },
    );

    return updated ? toLoan(updated as LoanModelDocument) : null;
  }

  async linkContact(
    loanId: string,
    userId: string,
    contactId: string,
  ): Promise<Loan | null> {
    const updated = await this.loanModel.findOneAndUpdate(
      {
        _id: loanId,
        userId: toObjectId(userId),
      },
      {
        contactId: toObjectId(contactId),
      },
      { returnDocument: 'after' },
    );

    return updated ? toLoan(updated as LoanModelDocument) : null;
  }

  async cancel(
    loanId: string,
    userId: string,
    canceledAt: Date,
  ): Promise<Loan | null> {
    const updated = await this.loanModel.findOneAndUpdate(
      {
        _id: loanId,
        userId: toObjectId(userId),
      },
      {
        status: 'canceled',
        canceledAt,
      },
      { returnDocument: 'after' },
    );

    return updated ? toLoan(updated as LoanModelDocument) : null;
  }

  async delete(loanId: string, userId: string): Promise<boolean> {
    const result = await this.loanModel.deleteOne({
      _id: loanId,
      userId: toObjectId(userId),
    });

    return result.deletedCount === 1;
  }
}
