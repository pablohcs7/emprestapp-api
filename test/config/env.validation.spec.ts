import { buildAppConfig } from '../../src/config/app.config';
import { validateEnvironment } from '../../src/config/env.validation';

describe('config environment validation', () => {
  it('returns parsed environment values for a valid configuration', () => {
    const env = validateEnvironment({
      NODE_ENV: 'test',
      PORT: '4000',
      MONGODB_URI: 'mongodb://localhost:27017/emprestapp',
      JWT_ACCESS_SECRET: 'access-key-value-1234',
      JWT_ACCESS_TTL: '15m',
      JWT_REFRESH_SECRET: 'refresh-key-value-1234',
      JWT_REFRESH_TTL: '7d',
      BCRYPT_SALT_ROUNDS: '12',
    });

    expect(env.PORT).toBe(4000);
    expect(env.BCRYPT_SALT_ROUNDS).toBe(12);
    expect(env.JWT_REFRESH_TTL).toBe('7d');
  });

  it('throws when required environment values are missing', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'development',
        PORT: '3000',
      }),
    ).toThrow(/MONGODB_URI/);
  });

  it('rejects placeholder-like JWT secrets', () => {
    expect(() =>
      validateEnvironment({
        NODE_ENV: 'production',
        PORT: '3000',
        MONGODB_URI: 'mongodb://mongo:27017/emprestapp',
        JWT_ACCESS_SECRET: 'change-me-in-production-please',
        JWT_ACCESS_TTL: '15m',
        JWT_REFRESH_SECRET:
          '0123456789abcdef0123456789abcdef',
        JWT_REFRESH_TTL: '7d',
        BCRYPT_SALT_ROUNDS: '10',
      }),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });

  it('maps validated variables into the runtime config shape', () => {
    const config = buildAppConfig({
      NODE_ENV: 'production',
      PORT: 8080,
      MONGODB_URI: 'mongodb://mongo:27017/emprestapp',
      JWT_ACCESS_SECRET: '1234567890abcdef1234567890abcdef',
      JWT_ACCESS_TTL: '15m',
      JWT_REFRESH_SECRET: 'abcdef1234567890abcdef1234567890',
      JWT_REFRESH_TTL: '30d',
      BCRYPT_SALT_ROUNDS: 10,
    });

    expect(config.app.nodeEnv).toBe('production');
    expect(config.app.port).toBe(8080);
    expect(config.database.mongodbUri).toBe('mongodb://mongo:27017/emprestapp');
    expect(config.auth.refreshToken.ttl).toBe('30d');
  });
});
