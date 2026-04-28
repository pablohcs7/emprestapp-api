import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { AppConfig } from '../../src/config/config.types';
import { PasswordService } from '../../src/modules/auth/password.service';
import {
  AuthTokenPayload,
  AuthTokenService,
} from '../../src/modules/auth/token.service';

describe('auth services', () => {
  const authConfig: AppConfig['auth'] = {
    accessToken: {
      secret: 'access-secret-value',
      ttl: '15m',
    },
    refreshToken: {
      secret: 'refresh-secret-value',
      ttl: '7d',
    },
    bcryptSaltRounds: 10,
  };

  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-23T15:00:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('hashes passwords with bcrypt', async () => {
    const service = new PasswordService(createConfigService(authConfig));

    const hash = await service.hash('Strong#123');

    expect(hash).not.toBe('Strong#123');
    expect(hash.startsWith('$2')).toBe(true);
  });

  it('verifies a valid password against its hash', async () => {
    const service = new PasswordService(createConfigService(authConfig));
    const hash = await service.hash('Strong#123');

    await expect(service.verify('Strong#123', hash)).resolves.toBe(true);
  });

  it('rejects an invalid password against the stored hash', async () => {
    const service = new PasswordService(createConfigService(authConfig));
    const hash = await service.hash('Strong#123');

    await expect(service.verify('Wrong#123', hash)).resolves.toBe(false);
  });

  it('issues and validates access and refresh tokens', async () => {
    const service = new AuthTokenService(createConfigService(authConfig));
    const payload: AuthTokenPayload = {
      sub: 'usr_1',
      email: 'jane@example.com',
    };

    const tokens = await service.issueSessionTokens(payload);

    expect(tokens.accessToken).toEqual(expect.any(String));
    expect(tokens.refreshToken).toEqual(expect.any(String));
    expect(tokens.refreshTokenHash).toEqual(expect.any(String));
    expect(tokens.accessTokenExpiresAt.toISOString()).toBe('2026-04-23T15:15:00.000Z');
    await expect(service.verifyAccessToken(tokens.accessToken)).resolves.toMatchObject(
      payload,
    );
    await expect(service.verifyRefreshToken(tokens.refreshToken)).resolves.toMatchObject(
      payload,
    );
  });

  it('maps expired access tokens to unauthorized errors', async () => {
    const service = new AuthTokenService(createConfigService(authConfig));
    const payload: AuthTokenPayload = {
      sub: 'usr_1',
      email: 'jane@example.com',
    };
    const tokens = await service.issueSessionTokens(payload);

    jest.setSystemTime(new Date('2026-04-23T15:16:00.000Z'));

    await expect(service.verifyAccessToken(tokens.accessToken)).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(service.verifyAccessToken(tokens.accessToken)).rejects.toThrow(
      'Expired access token',
    );
  });

  it('maps malformed access tokens to unauthorized errors', async () => {
    const service = new AuthTokenService(createConfigService(authConfig));

    await expect(service.verifyAccessToken('not-a-jwt')).rejects.toThrow(
      UnauthorizedException,
    );
    await expect(service.verifyAccessToken('not-a-jwt')).rejects.toThrow(
      'Invalid access token',
    );
  });

  it('fails fast when access-token configuration is invalid', async () => {
    const service = new AuthTokenService(
      createConfigService({
        ...authConfig,
        accessToken: {
          secret: '',
          ttl: 'fifteen-minutes',
        },
      }),
    );

    await expect(
      service.issueSessionTokens({
        sub: 'usr_1',
        email: 'jane@example.com',
      }),
    ).rejects.toThrow('Invalid access token configuration');
  });
});

const createConfigService = (
  auth: AppConfig['auth'],
): ConfigService<AppConfig> =>
  ({
    getOrThrow: (key: keyof AppConfig) => {
      if (key === 'auth') {
        return auth;
      }

      throw new Error(`Unexpected config key: ${String(key)}`);
    },
  }) as ConfigService<AppConfig>;
