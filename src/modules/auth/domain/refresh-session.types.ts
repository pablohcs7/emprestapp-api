export interface RefreshSession {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  revokedAt: Date | null;
  createdAt: Date;
}

export type CreateRefreshSessionRecord = Omit<
  RefreshSession,
  'id' | 'createdAt' | 'revokedAt'
> & {
  revokedAt?: Date | null;
};
