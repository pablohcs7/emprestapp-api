import { createBaseSchema, createOwnedDocumentDefinition } from '../../../../common/database/mongoose.helpers';
import { LoanInterestType, LoanStatus } from '../../domain/loan.types';
import { HydratedDocument, Types } from 'mongoose';

export const LOAN_COLLECTION = 'loans';

export class LoanDocument {
  userId!: Types.ObjectId;
  contactId!: Types.ObjectId | null;
  principalAmountCents!: number;
  interestType!: LoanInterestType;
  interestRate!: number | null;
  startDate!: Date;
  dueDate!: Date;
  installmentCount!: number;
  status!: LoanStatus;
  currentBalanceCents!: number;
  totalPaidCents!: number;
  canceledAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export type LoanModelDocument = HydratedDocument<LoanDocument>;

const loanDocumentDefinition = createOwnedDocumentDefinition({
  contactId: {
    type: Types.ObjectId,
    default: null,
  },
  principalAmountCents: {
    type: Number,
    required: true,
    min: 1,
    validate: {
      validator: Number.isInteger,
      message: 'principalAmountCents must be an integer',
    },
  },
  interestType: {
    type: String,
    required: true,
    enum: ['none', 'simple', 'compound'],
  },
  interestRate: {
    type: Number,
    default: null,
    min: 0,
    validate: [
      {
        validator(this: LoanDocument, value: number | null | undefined): boolean {
          return this.interestType === 'none' ? value === null || value === undefined : true;
        },
        message: 'interestRate must not be provided when interestType is none',
      },
      {
        validator(this: LoanDocument, value: number | null | undefined): boolean {
          return this.interestType === 'none' ? true : typeof value === 'number';
        },
        message: 'interestRate is required when interestType is simple or compound',
      },
    ],
  },
  startDate: {
    type: Date,
    required: true,
  },
  dueDate: {
    type: Date,
    required: true,
  },
  installmentCount: {
    type: Number,
    required: true,
    min: 1,
    validate: {
      validator: Number.isInteger,
      message: 'installmentCount must be an integer',
    },
  },
  status: {
    type: String,
    required: true,
    enum: ['open', 'paid', 'overdue', 'canceled'],
    default: 'open',
  },
  currentBalanceCents: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: Number.isInteger,
      message: 'currentBalanceCents must be an integer',
    },
  },
  totalPaidCents: {
    type: Number,
    required: true,
    min: 0,
    validate: {
      validator: Number.isInteger,
      message: 'totalPaidCents must be an integer',
    },
  },
  canceledAt: {
    type: Date,
    default: null,
  },
});

export const loanSchema = createBaseSchema(loanDocumentDefinition, {
  collection: LOAN_COLLECTION,
});

loanSchema.index({ userId: 1, status: 1, dueDate: 1 }, { background: true });
loanSchema.index({ userId: 1, contactId: 1, status: 1 }, { background: true });
loanSchema.index({ userId: 1, createdAt: -1 }, { background: true });
