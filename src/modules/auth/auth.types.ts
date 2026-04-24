import { UserStatus } from '../users/domain/user.types';

export interface AuthUserView {
  id: string;
  fullName: string;
  email: string;
  status: UserStatus;
  createdAt: Date;
}

export interface AuthSessionView {
  accessToken: string;
  refreshToken: string;
  expiresAt: Date;
}

export interface AuthWithUserView {
  user: AuthUserView;
  session: AuthSessionView;
}
