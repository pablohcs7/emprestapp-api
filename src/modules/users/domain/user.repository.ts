import { CreateUserRecord, User } from './user.types';

export abstract class UserRepository {
  abstract create(user: CreateUserRecord): Promise<User>;
  abstract findByEmail(email: string): Promise<User | null>;
  abstract findById(id: string): Promise<User | null>;
  abstract update(user: User): Promise<User>;
}
