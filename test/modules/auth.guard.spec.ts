import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { CurrentUser, getCurrentUserFromContext } from '../../src/modules/auth/current-user.decorator';
import { AuthTokenPayload, AuthTokenService } from '../../src/modules/auth/token.service';
import { JwtAuthGuard } from '../../src/modules/auth/jwt-auth.guard';

describe('auth guard and current-user helper', () => {
  it('resolves the authenticated user from the request context', () => {
    const context = createExecutionContext({
      user: {
        sub: 'usr_1',
        email: 'jane@example.com',
      },
    });

    expect(getCurrentUserFromContext(context)).toEqual({
      sub: 'usr_1',
      email: 'jane@example.com',
    });
    expect(CurrentUser).toBeDefined();
  });

  it('accepts a valid bearer token and attaches the authenticated user', async () => {
    const tokenService = createTokenService();
    const guard = new JwtAuthGuard(tokenService);
    const context = createExecutionContext({
      headers: {
        authorization: 'Bearer valid-token',
      },
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(context.switchToHttp().getRequest().user).toEqual({
      sub: 'usr_1',
      email: 'jane@example.com',
    });
  });

  it('rejects requests without an authorization header', async () => {
    const guard = new JwtAuthGuard(createTokenService());

    await expect(guard.canActivate(createExecutionContext())).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('rejects requests with a malformed authorization scheme', async () => {
    const guard = new JwtAuthGuard(createTokenService());
    const context = createExecutionContext({
      headers: {
        authorization: 'Basic token',
      },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Missing or invalid bearer token',
    );
  });

  it('rejects requests when token verification fails', async () => {
    const tokenService = createTokenService(new UnauthorizedException('bad token'));
    const guard = new JwtAuthGuard(tokenService);
    const context = createExecutionContext({
      headers: {
        authorization: 'Bearer bad-token',
      },
    });

    await expect(guard.canActivate(context)).rejects.toThrow(UnauthorizedException);
  });
});

const createTokenService = (
  error?: Error,
): Pick<AuthTokenService, 'verifyAccessToken'> =>
  ({
    verifyAccessToken: async (token: string): Promise<AuthTokenPayload> => {
      if (error) {
        throw error;
      }

      return {
        sub: 'usr_1',
        email: token === 'valid-token' ? 'jane@example.com' : 'john@example.com',
      };
    },
  }) as Pick<AuthTokenService, 'verifyAccessToken'>;

const createExecutionContext = (
  request: Record<string, unknown> = {},
): ExecutionContext =>
  ({
    switchToHttp: () => ({
      getRequest: () => request,
    }),
  }) as ExecutionContext;
