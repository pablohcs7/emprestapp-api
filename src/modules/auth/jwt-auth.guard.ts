import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { AuthTokenPayload, AuthTokenService } from './token.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly authTokenService: AuthTokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers?: Record<string, string | undefined>;
      user?: AuthTokenPayload;
    }>();
    const token = extractBearerToken(request.headers?.authorization);

    if (!token) {
      throw new UnauthorizedException('Missing or invalid bearer token');
    }

    request.user = await this.authTokenService.verifyAccessToken(token);

    return true;
  }
}

const extractBearerToken = (
  authorizationHeader?: string,
): string | null => {
  if (!authorizationHeader) {
    return null;
  }

  const [scheme, token] = authorizationHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return null;
  }

  return token;
};
