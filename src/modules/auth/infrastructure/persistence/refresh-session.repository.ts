import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';

import { RefreshSessionRepository } from '../../domain/refresh-session.repository';
import {
  CreateRefreshSessionRecord,
  RefreshSession,
} from '../../domain/refresh-session.types';
import {
  RefreshSessionDocument,
  RefreshSessionModelDocument,
} from './refresh-session.schema';

const toRefreshSession = (
  document: RefreshSessionModelDocument,
): RefreshSession => ({
  id: document._id.toString(),
  userId: document.userId.toString(),
  tokenHash: document.tokenHash,
  expiresAt: document.expiresAt,
  revokedAt: document.revokedAt ?? null,
  createdAt: document.createdAt,
});

@Injectable()
export class MongooseRefreshSessionRepository
  implements RefreshSessionRepository
{
  constructor(
    @InjectModel(RefreshSessionDocument.name)
    private readonly refreshSessionModel: Model<RefreshSessionDocument>,
  ) {}

  async create(
    session: CreateRefreshSessionRecord,
  ): Promise<RefreshSession> {
    const created = await this.refreshSessionModel.create({
      ...session,
      userId: new Types.ObjectId(session.userId),
      revokedAt: session.revokedAt ?? null,
    });

    return toRefreshSession(created as RefreshSessionModelDocument);
  }

  async findActiveByTokenHash(
    tokenHash: string,
  ): Promise<RefreshSession | null> {
    const document = await this.refreshSessionModel.findOne({
      tokenHash,
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    });

    return document ? toRefreshSession(document as RefreshSessionModelDocument) : null;
  }

  async revoke(
    sessionId: string,
    revokedAt: Date,
  ): Promise<RefreshSession | null> {
    const document = await this.refreshSessionModel.findOneAndUpdate(
      { _id: sessionId, revokedAt: null },
      { revokedAt },
      { returnDocument: 'after' },
    );

    return document ? toRefreshSession(document as RefreshSessionModelDocument) : null;
  }
}
