import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { UserRepository } from '../../users/domain/user.repository';
import { User } from '../../users/domain/user.types';
import { RefreshSessionRepository } from '../domain/refresh-session.repository';
import { PasswordService } from '../password.service';
import { AuthTokenPayload, AuthTokenService } from '../token.service';
import { hashRefreshToken } from '../refresh-token.hash';
import {
  AuthSessionView,
  AuthUserView,
  AuthWithUserView,
} from '../auth.types';
import { LoginDto } from '../dto/login.dto';
import { RefreshTokenDto } from '../dto/refresh-token.dto';
import { RegisterUserDto } from '../dto/register-user.dto';

@Injectable()
export class AuthApplicationService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshSessionRepository: RefreshSessionRepository,
    private readonly passwordService: PasswordService,
    private readonly authTokenService: AuthTokenService,
  ) {}

  async register(input: RegisterUserDto): Promise<AuthWithUserView> {
    await this.assertEmailAvailable(input.email);

    const passwordHash = await this.passwordService.hash(input.password);
    const user = await this.userRepository.create({
      fullName: input.fullName,
      email: input.email,
      passwordHash,
      status: 'active',
      deletedAt: null,
    });

    return this.createAuthenticatedSession(user);
  }

  async login(input: LoginDto): Promise<AuthWithUserView> {
    const user = await this.userRepository.findByEmail(input.email);

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isPasswordValid = await this.passwordService.verify(
      input.password,
      user.passwordHash,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.createAuthenticatedSession(user);
  }

  async refresh(input: RefreshTokenDto): Promise<AuthSessionView> {
    const payload = await this.verifyRefreshToken(input.refreshToken);
    const tokenHash = hashRefreshToken(input.refreshToken);
    const session = await this.refreshSessionRepository.findActiveByTokenHash(tokenHash);

    if (!session) {
      throw new UnauthorizedException('Invalid refresh token');
    }

    const user = await this.userRepository.findById(payload.sub);

    if (!user || user.status !== 'active') {
      throw new UnauthorizedException('Invalid refresh token');
    }

    await this.refreshSessionRepository.revoke(session.id, new Date());

    const issuedSession = await this.issueSession(user);

    return issuedSession.session;
  }

  private async assertEmailAvailable(email: string): Promise<void> {
    const existingUser = await this.userRepository.findByEmail(email);

    if (existingUser) {
      throw new ConflictException('Email already in use');
    }
  }

  private async createAuthenticatedSession(
    user: User,
  ): Promise<AuthWithUserView> {
    const issuedSession = await this.issueSession(user);

    return {
      user: mapUserView(user),
      session: issuedSession.session,
    };
  }

  private async issueSession(
    user: User,
  ): Promise<{ session: AuthSessionView }> {
    const tokens = await this.authTokenService.issueSessionTokens({
      sub: user.id,
      email: user.email,
    });

    await this.refreshSessionRepository.create({
      userId: user.id,
      tokenHash: tokens.refreshTokenHash,
      expiresAt: tokens.refreshTokenExpiresAt,
      revokedAt: null,
    });

    return {
      session: {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
        expiresAt: tokens.accessTokenExpiresAt,
      },
    };
  }

  private async verifyRefreshToken(
    refreshToken: string,
  ): Promise<AuthTokenPayload> {
    try {
      return await this.authTokenService.verifyRefreshToken(refreshToken);
    } catch (error) {
      if (error instanceof Error && error.name === 'TokenExpiredError') {
        throw new UnauthorizedException('Expired refresh token');
      }

      throw new UnauthorizedException('Invalid refresh token');
    }
  }
}

const mapUserView = (user: User): AuthUserView => ({
  id: user.id,
  fullName: user.fullName,
  email: user.email,
  status: user.status,
  createdAt: user.createdAt,
});
