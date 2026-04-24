import { userSchema } from '../../src/modules/users/infrastructure/persistence/user.schema';
import { UserRepository } from '../../src/modules/users/domain/user.repository';
import { RefreshSessionRepository } from '../../src/modules/auth/domain/refresh-session.repository';
import { refreshSessionSchema } from '../../src/modules/auth/infrastructure/persistence/refresh-session.schema';

describe('auth persistence foundation', () => {
  it('defines the expected user repository contract methods', async () => {
    class InMemoryUserRepository extends UserRepository {
      async create(user: Parameters<UserRepository['create']>[0]) {
        return {
          id: 'usr_1',
          fullName: user.fullName,
          email: user.email,
          passwordHash: user.passwordHash,
          status: user.status ?? 'active',
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: user.deletedAt ?? null,
        };
      }

      async findByEmail(email: string) {
        return {
          id: 'usr_1',
          fullName: 'Jane Doe',
          email,
          passwordHash: 'hash',
          status: 'active' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        };
      }

      async findById(id: string) {
        return {
          id,
          fullName: 'Jane Doe',
          email: 'jane@example.com',
          passwordHash: 'hash',
          status: 'active' as const,
          createdAt: new Date(),
          updatedAt: new Date(),
          deletedAt: null,
        };
      }

      async update(user: Parameters<UserRepository['update']>[0]) {
        return user;
      }
    }

    const repository = new InMemoryUserRepository();

    await expect(repository.findByEmail('jane@example.com')).resolves.toMatchObject({
      email: 'jane@example.com',
    });
    expect(typeof repository.create).toBe('function');
    expect(typeof repository.findById).toBe('function');
    expect(typeof repository.update).toBe('function');
  });

  it('defines the expected refresh-session repository contract methods', async () => {
    class InMemoryRefreshSessionRepository extends RefreshSessionRepository {
      async create(session: Parameters<RefreshSessionRepository['create']>[0]) {
        return {
          id: 'sess_1',
          userId: session.userId,
          tokenHash: session.tokenHash,
          expiresAt: session.expiresAt,
          revokedAt: session.revokedAt ?? null,
          createdAt: new Date('2026-04-23T00:00:00.000Z'),
        };
      }

      async findActiveByTokenHash(tokenHash: string) {
        return {
          id: 'sess_1',
          userId: 'usr_1',
          tokenHash,
          expiresAt: new Date('2026-04-25T00:00:00.000Z'),
          revokedAt: null,
          createdAt: new Date('2026-04-23T00:00:00.000Z'),
        };
      }

      async revoke(sessionId: string, revokedAt: Date) {
        return {
          id: sessionId,
          userId: 'usr_1',
          tokenHash: 'hash',
          expiresAt: new Date('2026-04-25T00:00:00.000Z'),
          revokedAt,
          createdAt: new Date('2026-04-23T00:00:00.000Z'),
        };
      }
    }

    const repository = new InMemoryRefreshSessionRepository();

    await expect(repository.findActiveByTokenHash('hash')).resolves.toMatchObject({
      tokenHash: 'hash',
    });
    expect(typeof repository.create).toBe('function');
    expect(typeof repository.revoke).toBe('function');
  });

  it('creates the user schema with the expected defaults and indexes', () => {
    const statusPath = userSchema.path('status');
    const deletedAtPath = userSchema.path('deletedAt');
    const indexes = userSchema.indexes();

    expect(statusPath.options.default).toBe('active');
    expect(deletedAtPath.options.default).toBeNull();
    expect(userSchema.get('timestamps')).toBe(true);
    expect(indexes).toEqual(
      expect.arrayContaining([
        [{ email: 1 }, { unique: true, background: true }],
        [{ status: 1 }, { background: true }],
      ]),
    );
  });

  it('creates the refresh-session schema with TTL and ownership conventions', () => {
    const revokedAtPath = refreshSessionSchema.path('revokedAt');
    const indexes = refreshSessionSchema.indexes();

    expect(revokedAtPath.options.default).toBeNull();
    expect(refreshSessionSchema.path('userId')).toBeDefined();
    expect(refreshSessionSchema.path('updatedAt')).toBeUndefined();
    expect(indexes).toEqual(
      expect.arrayContaining([
        [{ userId: 1 }, { background: true }],
        [{ tokenHash: 1 }, { unique: true, background: true }],
        [{ expiresAt: 1 }, { expireAfterSeconds: 0, background: true }],
      ]),
    );
  });
});
