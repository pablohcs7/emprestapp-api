import { createHash } from 'crypto';

export const hashRefreshToken = (refreshToken: string): string =>
  createHash('sha256').update(refreshToken).digest('hex');
