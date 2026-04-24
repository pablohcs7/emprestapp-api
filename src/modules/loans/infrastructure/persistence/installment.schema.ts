import { Schema, Types } from 'mongoose';

import {
  createBaseSchema,
  createOwnedDocumentDefinition,
} from '../../../../common/database/mongoose.helpers';
import { InstallmentStatus } from '../../domain/installment.types';

export const INSTALLMENT_COLLECTION = 'installments';

export class InstallmentDocument {
  userId!: Types.ObjectId;
  loanId!: Types.ObjectId;
  sequence!: number;
  dueDate!: Date;
  expectedAmountCents!: number;
  paidAmountCents!: number;
  remainingAmountCents!: number;
  status!: InstallmentStatus;
  canceledAt!: Date | null;
  createdAt!: Date;
  updatedAt!: Date;
}

export const installmentSchema = createBaseSchema(
  createOwnedDocumentDefinition({
    loanId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    sequence: {
      type: Number,
      required: true,
      min: 1,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    expectedAmountCents: {
      type: Number,
      required: true,
      min: 1,
    },
    paidAmountCents: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    remainingAmountCents: {
      type: Number,
      required: true,
      min: 0,
      default(this: { expectedAmountCents?: number }) {
        return this.expectedAmountCents ?? 0;
      },
    },
    status: {
      type: String,
      required: true,
      enum: ['pending', 'paid', 'overdue', 'canceled'],
      default: 'pending',
    },
    canceledAt: {
      type: Date,
      default: null,
    },
  }),
  {
    collection: INSTALLMENT_COLLECTION,
  },
);

installmentSchema.index(
  { loanId: 1, sequence: 1 },
  { unique: true, background: true },
);
installmentSchema.index(
  { userId: 1, loanId: 1, status: 1 },
  { background: true },
);
installmentSchema.index(
  { userId: 1, dueDate: 1, status: 1 },
  { background: true },
);
