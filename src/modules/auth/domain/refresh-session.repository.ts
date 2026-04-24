import {
  CreateRefreshSessionRecord,
  RefreshSession,
} from './refresh-session.types';

export abstract class RefreshSessionRepository {
  abstract create(session: CreateRefreshSessionRecord): Promise<RefreshSession>;
  abstract findActiveByTokenHash(tokenHash: string): Promise<RefreshSession | null>;
  abstract revoke(sessionId: string, revokedAt: Date): Promise<RefreshSession | null>;
}
