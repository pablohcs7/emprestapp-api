import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export const USER_COLLECTION = 'users';

@Schema({
  collection: USER_COLLECTION,
  timestamps: true,
  versionKey: false,
})
export class UserDocument {
  @Prop({
    required: true,
    trim: true,
  })
  fullName!: string;

  @Prop({
    required: true,
    trim: true,
    lowercase: true,
  })
  email!: string;

  @Prop({
    required: true,
  })
  passwordHash!: string;

  @Prop({
    required: true,
    enum: ['active', 'deleted'],
    default: 'active',
  })
  status!: 'active' | 'deleted';

  @Prop({
    type: Date,
    default: null,
  })
  deletedAt!: Date | null;

  createdAt!: Date;
  updatedAt!: Date;
}

export type UserModelDocument = HydratedDocument<UserDocument>;

export const userSchema = SchemaFactory.createForClass(UserDocument);

userSchema.index({ email: 1 }, { unique: true, background: true });
userSchema.index({ status: 1 }, { background: true });
