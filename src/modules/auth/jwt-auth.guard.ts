import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { UserRepository } from '../users/domain/user.repository';
import { AuthTokenPayload, AuthTokenService } from './token.service';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly authTokenService: AuthTokenService,
    private readonly userRepository: UserRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<{
      headers?: Record<string, string | undefined>;
      user?: AuthTokenPayload;
    }>();
    const token = extractBearerToken(request.headers?.authorization);

    if (!token) {
      throw new UnauthorizedException('Missing or invalid bearer token');
    }

    const payload = await this.authTokenService.verifyAccessToken(token);
    const user = await this.userRepository.findById(payload.sub);

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Invalid or inactive session');
    }

    request.user = payload;

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
