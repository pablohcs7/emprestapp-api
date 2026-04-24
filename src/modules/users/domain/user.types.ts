export type UserStatus = 'active' | 'deleted';

export interface User {
  id: string;
  fullName: string;
  email: string;
  passwordHash: string;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;
}

export type CreateUserRecord = Omit<
  User,
  'id' | 'createdAt' | 'updatedAt' | 'deletedAt' | 'status'
> & {
  status?: UserStatus;
  deletedAt?: Date | null;
};
