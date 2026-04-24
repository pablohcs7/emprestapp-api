import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument, Types } from 'mongoose';

export const CONTACT_COLLECTION = 'contacts';

@Schema({
  collection: CONTACT_COLLECTION,
  timestamps: true,
  versionKey: false,
})
export class ContactDocument {
  @Prop({
    type: Types.ObjectId,
    required: true,
  })
  userId!: Types.ObjectId;

  @Prop({
    required: true,
    trim: true,
  })
  fullName!: string;

  @Prop({
    type: String,
    default: null,
    trim: true,
  })
  documentId!: string | null;

  @Prop({
    type: String,
    default: null,
    trim: true,
  })
  phone!: string | null;

  @Prop({
    type: String,
    default: null,
    trim: true,
  })
  notes!: string | null;

  @Prop({
    required: true,
    enum: ['active', 'archived'],
    default: 'active',
  })
  status!: 'active' | 'archived';

  @Prop({
    type: Date,
    default: null,
  })
  archivedAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export type ContactModelDocument = HydratedDocument<ContactDocument>;

export const contactSchema = SchemaFactory.createForClass(ContactDocument);

contactSchema.index(
  { userId: 1, status: 1, fullName: 1 },
  { background: true },
);
contactSchema.index({ userId: 1, documentId: 1 }, { background: true });
