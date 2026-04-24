import { HydratedDocument, Types } from 'mongoose';

import {
  createBaseSchema,
  createOwnedDocumentDefinition,
} from '../../../../common/database/mongoose.helpers';
import { PaymentStatus } from '../../domain/payment.types';

export const PAYMENT_COLLECTION = 'payments';

export class PaymentDocument {
  userId!: Types.ObjectId;
  loanId!: Types.ObjectId;
  installmentId!: Types.ObjectId;
  amountCents!: number;
  paidAt!: Date;
  method!: string | null;
  note!: string | null;
  status!: PaymentStatus;
  createdAt!: Date;
  updatedAt!: Date;
  canceledAt!: Date | null;
}

export type PaymentModelDocument = HydratedDocument<PaymentDocument>;

export const paymentSchema = createBaseSchema(
  createOwnedDocumentDefinition({
    loanId: {
      type: Types.ObjectId,
      required: true,
    },
    installmentId: {
      type: Types.ObjectId,
      required: true,
    },
    amountCents: {
      type: Number,
      required: true,
      min: 1,
      validate: {
        validator: Number.isInteger,
        message: 'amountCents must be an integer',
      },
    },
    paidAt: {
      type: Date,
      required: true,
    },
    method: {
      type: String,
      default: null,
      trim: true,
      maxlength: 32,
    },
    note: {
      type: String,
      default: null,
      trim: true,
      maxlength: 500,
    },
    status: {
      type: String,
      required: true,
      enum: ['active', 'canceled'],
      default: 'active',
    },
    canceledAt: {
      type: Date,
      default: null,
    },
  }),
  {
    collection: PAYMENT_COLLECTION,
  },
);

paymentSchema.index({ userId: 1, loanId: 1, paidAt: -1 }, { background: true });
paymentSchema.index(
  { userId: 1, installmentId: 1, status: 1 },
  { background: true },
);
paymentSchema.index({ userId: 1, status: 1, paidAt: -1 }, { background: true });
