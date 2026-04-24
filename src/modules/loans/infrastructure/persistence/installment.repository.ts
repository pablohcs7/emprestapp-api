import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { InstallmentRepository } from '../../domain/installment.repository';
import {
  CreateInstallmentRecord,
  Installment,
  InstallmentStatus,
} from '../../domain/installment.types';
import { UpdateInstallmentDerivedStateRecord } from '../../domain/installment.repository';
import {
  InstallmentDocument,
} from './installment.schema';

type InstallmentModelDocument = InstanceType<typeof InstallmentDocument> & {
  _id: Types.ObjectId;
};

const toInstallment = (document: InstallmentModelDocument): Installment => ({
  id: document._id.toString(),
  userId: document.userId.toString(),
  loanId: document.loanId.toString(),
  sequence: document.sequence,
  dueDate: document.dueDate,
  expectedAmountCents: document.expectedAmountCents,
  paidAmountCents: document.paidAmountCents,
  remainingAmountCents: document.remainingAmountCents,
  status: document.status,
  createdAt: document.createdAt,
  updatedAt: document.updatedAt,
  canceledAt: document.canceledAt ?? null,
});

const normalizeScheduleRecord = (record: CreateInstallmentRecord) => ({
  ...record,
  userId: new Types.ObjectId(record.userId),
  loanId: new Types.ObjectId(record.loanId),
  paidAmountCents: record.paidAmountCents ?? 0,
  remainingAmountCents:
    record.remainingAmountCents ?? record.expectedAmountCents,
  status: record.status ?? 'pending',
  canceledAt: record.canceledAt ?? null,
});

@Injectable()
export class MongooseInstallmentRepository implements InstallmentRepository {
  constructor(
    @InjectModel(InstallmentDocument.name)
    private readonly installmentModel: Model<InstallmentDocument>,
  ) {}

  async createMany(records: CreateInstallmentRecord[]): Promise<Installment[]> {
    if (!records.length) {
      return [];
    }

    const created = await this.installmentModel.insertMany(
      records.map(normalizeScheduleRecord),
    );

    return created.map((document) => toInstallment(document as InstallmentModelDocument));
  }

  async findById(installmentId: string): Promise<Installment | null> {
    const document = await this.installmentModel.findById(installmentId);

    return document ? toInstallment(document as InstallmentModelDocument) : null;
  }

  async findByIdForUser(
    installmentId: string,
    userId: string,
  ): Promise<Installment | null> {
    const document = await this.installmentModel.findOne({
      _id: installmentId,
      userId: new Types.ObjectId(userId),
    });

    return document ? toInstallment(document as InstallmentModelDocument) : null;
  }

  async findByLoanId(loanId: string, userId: string): Promise<Installment[]> {
    const documents = await this.installmentModel
      .find({
        loanId: new Types.ObjectId(loanId),
        userId: new Types.ObjectId(userId),
      })
      .sort({ sequence: 1 });

    return documents.map((document) =>
      toInstallment(document as InstallmentModelDocument),
    );
  }

  async findByLoanIdAndStatus(
    loanId: string,
    userId: string,
    status: InstallmentStatus,
  ): Promise<Installment[]> {
    const documents = await this.installmentModel
      .find({
        loanId: new Types.ObjectId(loanId),
        userId: new Types.ObjectId(userId),
        status,
      })
      .sort({ sequence: 1 });

    return documents.map((document) =>
      toInstallment(document as InstallmentModelDocument),
    );
  }

  async findByLoanIdAndSequence(
    loanId: string,
    userId: string,
    sequence: number,
  ): Promise<Installment | null> {
    const document = await this.installmentModel.findOne({
      loanId: new Types.ObjectId(loanId),
      userId: new Types.ObjectId(userId),
      sequence,
    });

    return document ? toInstallment(document as InstallmentModelDocument) : null;
  }

  async findNextOpenForLoan(
    loanId: string,
    userId: string,
  ): Promise<Installment | null> {
    const document = await this.installmentModel
      .findOne({
        loanId: new Types.ObjectId(loanId),
        userId: new Types.ObjectId(userId),
        status: { $in: ['pending', 'overdue'] },
      })
      .sort({ sequence: 1 });

    return document ? toInstallment(document as InstallmentModelDocument) : null;
  }

  async updateDerivedState(
    input: UpdateInstallmentDerivedStateRecord,
  ): Promise<Installment | null> {
    const updated = await this.installmentModel.findOneAndUpdate(
      {
        _id: new Types.ObjectId(input.installmentId),
        userId: new Types.ObjectId(input.userId),
      },
      {
        paidAmountCents: input.paidAmountCents,
        remainingAmountCents: input.remainingAmountCents,
        status: input.status,
      },
      { returnDocument: 'after' },
    );

    return updated ? toInstallment(updated as InstallmentModelDocument) : null;
  }

  async cancelByLoan(
    loanId: string,
    userId: string,
    canceledAt: Date,
  ): Promise<Installment[]> {
    await this.installmentModel.updateMany(
      {
        loanId: new Types.ObjectId(loanId),
        userId: new Types.ObjectId(userId),
      },
      {
        $set: {
          status: 'canceled',
          paidAmountCents: 0,
          remainingAmountCents: 0,
          canceledAt,
        },
      },
    );

    const documents = await this.installmentModel
      .find({
        loanId: new Types.ObjectId(loanId),
        userId: new Types.ObjectId(userId),
      })
      .sort({ sequence: 1 });

    return documents.map((document) =>
      toInstallment(document as InstallmentModelDocument),
    );
  }

  async deleteByLoan(loanId: string, userId: string): Promise<boolean> {
    const result = await this.installmentModel.deleteMany({
      loanId: new Types.ObjectId(loanId),
      userId: new Types.ObjectId(userId),
    });

    return result.deletedCount > 0;
  }
}
