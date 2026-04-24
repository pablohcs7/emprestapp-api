import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const REFRESH_SESSION_COLLECTION = 'refresh_sessions';

@Schema({
  collection: REFRESH_SESSION_COLLECTION,
  timestamps: {
    createdAt: true,
    updatedAt: false,
  },
  versionKey: false,
})
export class RefreshSessionDocument {
  @Prop({
    type: Types.ObjectId,
    required: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    required: true,
  })
  tokenHash!: string;

  @Prop({
    required: true,
  })
  expiresAt!: Date;

  @Prop({
    type: Date,
    default: null,
  })
  revokedAt!: Date | null;

  createdAt!: Date;
}

export type RefreshSessionModelDocument = HydratedDocument<RefreshSessionDocument>;

export const refreshSessionSchema = SchemaFactory.createForClass(
  RefreshSessionDocument,
);

refreshSessionSchema.index({ userId: 1 }, { background: true });
refreshSessionSchema.index({ tokenHash: 1 }, { unique: true, background: true });
refreshSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0, background: true });
