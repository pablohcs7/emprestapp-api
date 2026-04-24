import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { PaymentRepository } from '../../domain/payment.repository';
import {
  CreatePaymentRecord,
  Payment,
  PaymentListFilters,
  PaymentListResult,
} from '../../domain/payment.types';
import { PaymentDocument, PaymentModelDocument } from './payment.schema';

const toObjectId = (value: string): Types.ObjectId => new Types.ObjectId(value.trim());

const toPayment = (document: PaymentModelDocument): Payment => ({
  id: document._id.toString(),
  userId: document.userId.toString(),
  loanId: document.loanId.toString(),
  installmentId: document.installmentId.toString(),
  amountCents: document.amountCents,
  paidAt: document.paidAt,
  method: document.method ?? null,
  note: document.note ?? null,
  status: document.status,
  createdAt: document.createdAt,
  updatedAt: document.updatedAt,
  canceledAt: document.canceledAt ?? null,
});

@Injectable()
export class MongoosePaymentRepository implements PaymentRepository {
  constructor(
    @InjectModel(PaymentDocument.name)
    private readonly paymentModel: Model<PaymentDocument>,
  ) {}

  async register(input: CreatePaymentRecord): Promise<Payment> {
    const created = await this.paymentModel.create({
      userId: toObjectId(input.userId),
      loanId: toObjectId(input.loanId),
      installmentId: toObjectId(input.installmentId),
      amountCents: input.amountCents,
      paidAt: input.paidAt,
      method: input.method?.trim() || null,
      note: input.note?.trim() || null,
      status: 'active',
      canceledAt: null,
    });

    return toPayment(created as PaymentModelDocument);
  }

  async findById(paymentId: string): Promise<Payment | null> {
    const document = await this.paymentModel.findById(paymentId);

    return document ? toPayment(document as PaymentModelDocument) : null;
  }

  async findByIdForUser(paymentId: string, userId: string): Promise<Payment | null> {
    const document = await this.paymentModel.findOne({
      _id: paymentId,
      userId: toObjectId(userId),
    });

    return document ? toPayment(document as PaymentModelDocument) : null;
  }

  async listForUser(
    userId: string,
    filters: PaymentListFilters,
  ): Promise<PaymentListResult> {
    const query: Record<string, unknown> = {
      userId: toObjectId(userId),
    };

    if (filters.loanId) {
      query.loanId = toObjectId(filters.loanId);
    }

    if (filters.installmentId) {
      query.installmentId = toObjectId(filters.installmentId);
    }

    if (filters.status?.length) {
      query.status = { $in: filters.status };
    }

    if (filters.paidAtFrom || filters.paidAtTo) {
      query.paidAt = {
        ...(filters.paidAtFrom ? { $gte: filters.paidAtFrom } : {}),
        ...(filters.paidAtTo ? { $lte: filters.paidAtTo } : {}),
      };
    }

    const [items, total] = await Promise.all([
      this.paymentModel
        .find(query)
        .sort({ paidAt: -1, createdAt: -1, _id: -1 })
        .skip((filters.page - 1) * filters.pageSize)
        .limit(filters.pageSize),
      this.paymentModel.countDocuments(query),
    ]);

    return {
      items: items.map((item) => toPayment(item as PaymentModelDocument)),
      total,
    };
  }

  async listByLoanId(
    loanId: string,
    userId: string,
    filters: PaymentListFilters,
  ): Promise<PaymentListResult> {
    const query: Record<string, unknown> = {
      loanId: toObjectId(loanId),
      userId: toObjectId(userId),
    };

    if (filters.installmentId) {
      query.installmentId = toObjectId(filters.installmentId);
    }

    if (filters.status?.length) {
      query.status = { $in: filters.status };
    }

    if (filters.paidAtFrom || filters.paidAtTo) {
      query.paidAt = {
        ...(filters.paidAtFrom ? { $gte: filters.paidAtFrom } : {}),
        ...(filters.paidAtTo ? { $lte: filters.paidAtTo } : {}),
      };
    }

    const [items, total] = await Promise.all([
      this.paymentModel
        .find(query)
        .sort({ paidAt: -1, createdAt: -1, _id: -1 })
        .skip((filters.page - 1) * filters.pageSize)
        .limit(filters.pageSize),
      this.paymentModel.countDocuments(query),
    ]);

    return {
      items: items.map((item) => toPayment(item as PaymentModelDocument)),
      total,
    };
  }

  async listActiveByLoanId(loanId: string, userId: string): Promise<Payment[]> {
    const documents = await this.paymentModel
      .find({
        loanId: toObjectId(loanId),
        userId: toObjectId(userId),
        status: 'active',
      })
      .sort({ paidAt: 1, createdAt: 1, _id: 1 });

    return documents.map((document) => toPayment(document as PaymentModelDocument));
  }

  async listActiveByInstallmentId(
    installmentId: string,
    userId: string,
  ): Promise<Payment[]> {
    const documents = await this.paymentModel
      .find({
        installmentId: toObjectId(installmentId),
        userId: toObjectId(userId),
        status: 'active',
      })
      .sort({ paidAt: 1, createdAt: 1, _id: 1 });

    return documents.map((document) => toPayment(document as PaymentModelDocument));
  }

  async cancel(
    paymentId: string,
    userId: string,
    canceledAt: Date,
  ): Promise<Payment | null> {
    const updated = await this.paymentModel.findOneAndUpdate(
      {
        _id: paymentId,
        userId: toObjectId(userId),
      },
      {
        status: 'canceled',
        canceledAt,
      },
      { returnDocument: 'after' },
    );

    return updated ? toPayment(updated as PaymentModelDocument) : null;
  }
}
