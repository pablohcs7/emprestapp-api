import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { randomUUID } from 'crypto';

import { AppConfig } from '../../config/config.types';
import { hashRefreshToken } from './refresh-token.hash';

export interface AuthTokenPayload {
  sub: string;
  email: string;
  jti?: string;
}

export interface IssuedSessionTokens {
  accessToken: string;
  refreshToken: string;
  refreshTokenHash: string;
  accessTokenExpiresAt: Date;
  refreshTokenExpiresAt: Date;
}

@Injectable()
export class AuthTokenService {
  private readonly jwtService: JwtService;

  constructor(private readonly configService: ConfigService<AppConfig>) {
    this.jwtService = new JwtService();
  }

  async issueSessionTokens(
    payload: AuthTokenPayload,
  ): Promise<IssuedSessionTokens> {
    const authConfig = this.configService.getOrThrow<AppConfig['auth']>('auth');
    const accessTtlMs = parseDurationToMs(authConfig.accessToken.ttl);
    const refreshTtlMs = parseDurationToMs(authConfig.refreshToken.ttl);
    const accessTtlSeconds = Math.floor(accessTtlMs / 1000);
    const refreshTtlSeconds = Math.floor(refreshTtlMs / 1000);

    if (!authConfig.accessToken.secret || !accessTtlMs) {
      throw new Error('Invalid access token configuration');
    }

    if (!authConfig.refreshToken.secret || !refreshTtlMs) {
      throw new Error('Invalid refresh token configuration');
    }

    const sessionPayload: AuthTokenPayload = {
      ...payload,
      jti: randomUUID(),
    };

    const accessToken = this.jwtService.sign(sessionPayload, {
      secret: authConfig.accessToken.secret,
      expiresIn: accessTtlSeconds,
    });
    const refreshToken = this.jwtService.sign(sessionPayload, {
      secret: authConfig.refreshToken.secret,
      expiresIn: refreshTtlSeconds,
    });

    return {
      accessToken,
      refreshToken,
      refreshTokenHash: hashRefreshToken(refreshToken),
      accessTokenExpiresAt: new Date(Date.now() + accessTtlMs),
      refreshTokenExpiresAt: new Date(Date.now() + refreshTtlMs),
    };
  }

  async verifyAccessToken(token: string): Promise<AuthTokenPayload> {
    const authConfig = this.configService.getOrThrow<AppConfig['auth']>('auth');

    return Promise.resolve(
      this.jwtService.verify<AuthTokenPayload>(token, {
        secret: authConfig.accessToken.secret,
      }),
    );
  }

  async verifyRefreshToken(token: string): Promise<AuthTokenPayload> {
    const authConfig = this.configService.getOrThrow<AppConfig['auth']>('auth');

    return Promise.resolve(
      this.jwtService.verify<AuthTokenPayload>(token, {
        secret: authConfig.refreshToken.secret,
      }),
    );
  }
}

const parseDurationToMs = (value: string): number => {
  const match = /^(?<amount>\d+)(?<unit>[smhd])$/.exec(value);

  if (!match?.groups) {
    return 0;
  }

  const amount = Number(match.groups.amount);
  const unit = match.groups.unit;

  if (!Number.isInteger(amount) || amount <= 0) {
    return 0;
  }

  const multiplierByUnit: Record<string, number> = {
    s: 1000,
    m: 60_000,
    h: 3_600_000,
    d: 86_400_000,
  };

  return amount * multiplierByUnit[unit];
};
