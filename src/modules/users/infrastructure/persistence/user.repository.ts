import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';

import { UserRepository } from '../../domain/user.repository';
import { CreateUserRecord, User } from '../../domain/user.types';
import { UserDocument } from './user.schema';
import { UserModelDocument } from './user.schema';

const normalizeEmail = (email: string): string => email.trim().toLowerCase();
const normalizeName = (fullName: string): string => fullName.trim();

const toUser = (document: UserModelDocument): User => ({
  id: document._id.toString(),
  fullName: document.fullName,
  email: document.email,
  passwordHash: document.passwordHash,
  status: document.status,
  createdAt: document.createdAt,
  updatedAt: document.updatedAt,
  deletedAt: document.deletedAt ?? null,
});

@Injectable()
export class MongooseUserRepository implements UserRepository {
  constructor(
    @InjectModel(UserDocument.name)
    private readonly userModel: Model<UserDocument>,
  ) {}

  async create(user: CreateUserRecord): Promise<User> {
    const created = await this.userModel.create({
      ...user,
      fullName: normalizeName(user.fullName),
      email: normalizeEmail(user.email),
      deletedAt: user.deletedAt ?? null,
      status: user.status ?? 'active',
    });

    return toUser(created as UserModelDocument);
  }

  async findByEmail(email: string): Promise<User | null> {
    const document = await this.userModel.findOne({
      email: normalizeEmail(email),
    });

    return document ? toUser(document as UserModelDocument) : null;
  }

  async findById(id: string): Promise<User | null> {
    const document = await this.userModel.findById(id);

    return document ? toUser(document as UserModelDocument) : null;
  }

  async update(user: User): Promise<User> {
    const document = await this.userModel.findById(user.id);

    if (!document) {
      throw new Error(`User not found: ${user.id}`);
    }

    document.fullName = normalizeName(user.fullName);
    document.email = normalizeEmail(user.email);
    document.passwordHash = user.passwordHash;
    document.status = user.status;
    document.deletedAt = user.deletedAt ?? null;

    await document.save();

    return toUser(document as UserModelDocument);
  }
}
