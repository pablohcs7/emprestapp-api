import { UserRepository } from '../../src/modules/users/domain/user.repository';
import { User } from '../../src/modules/users/domain/user.types';
import {
  UserNotFoundError,
  UsersProfileComplianceService,
} from '../../src/modules/users/application/users-profile-compliance.service';

describe('users profile compliance', () => {
  beforeEach(() => {
    jest.useFakeTimers().setSystemTime(new Date('2026-04-24T10:15:00.000Z'));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns the authenticated user profile projection', async () => {
    const userRepository = createUserRepositoryMock();
    const service = new UsersProfileComplianceService(userRepository);
    const user = createUser();

    userRepository.findById.mockResolvedValue(user);

    await expect(service.getProfile('usr_1')).resolves.toEqual({
      id: 'usr_1',
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      status: 'active',
      createdAt: new Date('2026-04-15T18:00:00.000Z'),
    });
    expect(userRepository.findById).toHaveBeenCalledWith('usr_1');
  });

  it('throws when the authenticated user does not exist', async () => {
    const userRepository = createUserRepositoryMock();
    const service = new UsersProfileComplianceService(userRepository);

    userRepository.findById.mockResolvedValue(null);

    const attempt = service.getProfile('usr_1');

    await expect(attempt).rejects.toBeInstanceOf(UserNotFoundError);
    await expect(attempt).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
  });

  it('logically deletes the authenticated account and preserves user data', async () => {
    const userRepository = createUserRepositoryMock();
    const service = new UsersProfileComplianceService(userRepository);
    const user = createUser();

    userRepository.findById.mockResolvedValue(user);
    userRepository.update.mockImplementation(async (value) => value);

    await expect(service.deleteAccount('usr_1')).resolves.toEqual({
      status: 'deleted',
    });
    expect(userRepository.update).toHaveBeenCalledWith(
      expect.objectContaining({
        id: 'usr_1',
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        passwordHash: 'hash_123',
        status: 'deleted',
        deletedAt: new Date('2026-04-24T10:15:00.000Z'),
      }),
    );
  });

  it('throws when deleting a missing account', async () => {
    const userRepository = createUserRepositoryMock();
    const service = new UsersProfileComplianceService(userRepository);

    userRepository.findById.mockResolvedValue(null);

    const attempt = service.deleteAccount('usr_1');

    await expect(attempt).rejects.toMatchObject({ code: 'USER_NOT_FOUND' });
    expect(userRepository.update).not.toHaveBeenCalled();
  });
});

const createUserRepositoryMock = () =>
  ({
    create: jest.fn(),
    findByEmail: jest.fn(),
    findById: jest.fn(),
    update: jest.fn(),
  }) as unknown as jest.Mocked<UserRepository>;

const createUser = (overrides: Partial<User> = {}): User => ({
  id: 'usr_1',
  fullName: 'Jane Doe',
  email: 'jane@example.com',
  passwordHash: 'hash_123',
  status: 'active',
  createdAt: new Date('2026-04-15T18:00:00.000Z'),
  updatedAt: new Date('2026-04-24T09:00:00.000Z'),
  deletedAt: null,
  ...overrides,
});
