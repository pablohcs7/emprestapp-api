import { Injectable } from '@nestjs/common';

import { RefreshSessionRepository } from '../../auth/domain/refresh-session.repository';
import { UserRepository } from '../domain/user.repository';
import { User } from '../domain/user.types';
import {
  UserAccountDeletionView,
  UserProfileView,
} from '../presentation/users.types';

export class UserProfileComplianceError extends Error {
  constructor(
    public readonly code: 'USER_NOT_FOUND',
    message: string,
  ) {
    super(message);
    this.name = new.target.name;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}

export class UserNotFoundError extends UserProfileComplianceError {
  constructor() {
    super('USER_NOT_FOUND', 'User not found');
  }
}

@Injectable()
export class UsersProfileComplianceService {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly refreshSessionRepository: RefreshSessionRepository,
  ) {}

  async getProfile(userId: string): Promise<UserProfileView> {
    const user = await this.findUserOrThrow(userId);

    return this.toProfileView(user);
  }

  async deleteAccount(userId: string): Promise<UserAccountDeletionView> {
    const user = await this.findUserOrThrow(userId);
    const deletedAt = new Date();

    await this.userRepository.update({
      ...user,
      status: 'deleted',
      deletedAt,
    });
    await this.refreshSessionRepository.revokeAllForUser(user.id, deletedAt);

    return {
      status: 'deleted',
    };
  }

  private async findUserOrThrow(userId: string): Promise<User> {
    const user = await this.userRepository.findById(userId);

    if (!user) {
      throw new UserNotFoundError();
    }

    return user;
  }

  private toProfileView(user: User): UserProfileView {
    return {
      id: user.id,
      fullName: user.fullName,
      email: user.email,
      status: user.status,
      createdAt: user.createdAt,
    };
  }
}
