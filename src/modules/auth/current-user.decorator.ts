import {
  createParamDecorator,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';

import { AuthTokenPayload } from './token.service';

export const getCurrentUserFromContext = (
  context: ExecutionContext,
): AuthTokenPayload => {
  const request = context.switchToHttp().getRequest<{ user?: AuthTokenPayload }>();

  if (!request.user) {
    throw new UnauthorizedException('Authenticated user was not resolved');
  }

  return request.user;
};

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthTokenPayload =>
    getCurrentUserFromContext(context),
);
