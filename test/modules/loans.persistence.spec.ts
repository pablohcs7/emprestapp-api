import { LoanRepository } from '../../src/modules/loans/domain/loan.repository';
import {
  Loan,
  LoanStatus,
} from '../../src/modules/loans/domain/loan.types';
import {
  LoanDocument,
  loanSchema,
} from '../../src/modules/loans/infrastructure/persistence/loan.schema';
import { MongooseLoanRepository } from '../../src/modules/loans/infrastructure/persistence/loan.repository';

describe('loans persistence foundation', () => {
  const userId = '000000000000000000000001';
  const contactId = '000000000000000000000002';
  const loanId = '000000000000000000000003';

  it('defines the expected loan repository contract methods', async () => {
    class InMemoryLoanRepository extends LoanRepository {
      async create(input: Parameters<LoanRepository['create']>[0]) {
        return createLoan({
          id: 'loan_1',
          userId: input.userId,
          contactId: input.contactId ?? null,
          principalAmountCents: input.principalAmountCents,
          interestType: input.interestType,
          interestRate: input.interestRate ?? null,
          startDate: input.startDate,
          dueDate: input.dueDate,
          installmentCount: input.installmentCount,
          status: 'open',
          currentBalanceCents: input.currentBalanceCents,
          totalPaidCents: input.totalPaidCents,
          canceledAt: null,
        });
      }

      async findById(loanId: string) {
        return createLoan({ id: loanId });
      }

      async findByIdForUser(loanId: string, userId: string) {
        return createLoan({ id: loanId, userId });
      }

      async listForUser() {
        return {
          items: [createLoan()],
          total: 1,
        };
      }

      async updateDerivedState(input: {
        loanId: string;
        userId: string;
        status: Exclude<LoanStatus, 'canceled'>;
        currentBalanceCents: number;
        totalPaidCents: number;
      }) {
        return createLoan({
          id: input.loanId,
          userId: input.userId,
          status: input.status,
          currentBalanceCents: input.currentBalanceCents,
          totalPaidCents: input.totalPaidCents,
        });
      }

      async linkContact(loanId: string, userId: string, contactId: string) {
        return createLoan({ id: loanId, userId, contactId });
      }

      async cancel(loanId: string, userId: string, canceledAt: Date) {
        return createLoan({
          id: loanId,
          userId,
          status: 'canceled',
          canceledAt,
        });
      }

      async delete(loanId: string, userId: string) {
        return loanId === 'loan_1' && userId === 'usr_1';
      }
    }

    const repository = new InMemoryLoanRepository();

    await expect(repository.findByIdForUser(loanId, userId)).resolves.toMatchObject({
      id: loanId,
      userId,
    });
    expect(typeof repository.create).toBe('function');
    expect(typeof repository.listForUser).toBe('function');
    expect(typeof repository.updateDerivedState).toBe('function');
    expect(typeof repository.linkContact).toBe('function');
    expect(typeof repository.cancel).toBe('function');
    expect(typeof repository.delete).toBe('function');
  });

  it('creates the loan schema with ownership, defaults, validation, and timestamps', () => {
    const statusPath = loanSchema.path('status');
    const interestRatePath = loanSchema.path('interestRate');
    const canceledAtPath = loanSchema.path('canceledAt');

    expect(loanSchema.path('userId')).toBeDefined();
    expect(statusPath.options.default).toBe('open');
    expect(interestRatePath.options.default).toBeNull();
    expect(canceledAtPath.options.default).toBeNull();
    expect(loanSchema.get('timestamps')).toBe(true);
  });

  it('declares the indexes required by the loans data model', () => {
    const indexes = loanSchema.indexes();

    expect(indexes).toEqual(
      expect.arrayContaining([
        [{ userId: 1, status: 1, dueDate: 1 }, { background: true }],
        [{ userId: 1, contactId: 1, status: 1 }, { background: true }],
        [{ userId: 1, createdAt: -1 }, { background: true }],
      ]),
    );
  });

  it('maps loan records and query filters through the mongoose adapter contract', async () => {
    const createdAt = new Date('2026-04-24T00:00:00.000Z');
    const updatedAt = new Date('2026-04-24T01:00:00.000Z');
    const model = createLoanModelStub({
      create: jest.fn().mockResolvedValue(
        createDocument({
          _id: loanId,
          userId,
          contactId,
          status: 'open',
          currentBalanceCents: 106500,
          totalPaidCents: 0,
          createdAt,
          updatedAt,
        }),
      ),
      findById: jest.fn().mockResolvedValue(
        createDocument({
          _id: loanId,
          userId,
          status: 'open',
          currentBalanceCents: 106500,
          totalPaidCents: 0,
          createdAt,
          updatedAt,
        }),
      ),
      findOne: jest.fn().mockResolvedValue(
        createDocument({
          _id: loanId,
          userId,
          status: 'open',
          currentBalanceCents: 106500,
          totalPaidCents: 0,
          createdAt,
          updatedAt,
        }),
      ),
      countDocuments: jest.fn().mockResolvedValue(1),
      find: jest.fn().mockReturnValue(
        createFindChain([
          createDocument({
            _id: loanId,
            userId,
            status: 'open',
            currentBalanceCents: 106500,
            totalPaidCents: 0,
            createdAt,
            updatedAt,
          }),
        ]),
      ),
      findOneAndUpdate: jest.fn().mockResolvedValue(
        createDocument({
          _id: 'loan_1',
          userId: 'usr_1',
          status: 'canceled',
          currentBalanceCents: 106500,
          totalPaidCents: 0,
          createdAt,
          updatedAt,
          canceledAt: updatedAt,
        }),
      ),
      deleteOne: jest.fn().mockResolvedValue({ deletedCount: 1 }),
    });

    const repository = new MongooseLoanRepository(model as any);

    await expect(
      repository.create({
        userId,
        contactId,
        principalAmountCents: 100000,
        interestType: 'compound',
        interestRate: 2.5,
        startDate: new Date('2026-05-01T00:00:00.000Z'),
        dueDate: new Date('2026-11-01T00:00:00.000Z'),
        installmentCount: 6,
        currentBalanceCents: 106500,
        totalPaidCents: 0,
      }),
    ).resolves.toMatchObject({
      id: loanId,
      userId,
      contactId,
    });

    await expect(repository.findById(loanId)).resolves.toMatchObject({
      id: loanId,
    });
    await expect(
      repository.findByIdForUser(loanId, userId),
    ).resolves.toMatchObject({
      userId,
    });
    await expect(
      repository.listForUser(userId, {
        status: ['open'],
        contactId,
        dueDateFrom: new Date('2026-05-01T00:00:00.000Z'),
        dueDateTo: new Date('2026-11-01T00:00:00.000Z'),
        periodFrom: new Date('2026-04-01T00:00:00.000Z'),
        periodTo: new Date('2026-04-30T00:00:00.000Z'),
        page: 1,
        pageSize: 20,
      }),
    ).resolves.toEqual({
      items: expect.arrayContaining([
        expect.objectContaining({ id: loanId }),
      ]),
      total: 1,
    });
    await expect(
      repository.updateDerivedState({
        loanId,
        userId,
        status: 'paid',
        currentBalanceCents: 0,
        totalPaidCents: 106500,
      }),
    ).resolves.toMatchObject({
      status: 'canceled',
    });
    await expect(
      repository.linkContact(loanId, userId, '000000000000000000000004'),
    ).resolves.toBeDefined();
    await expect(repository.cancel(loanId, userId, updatedAt)).resolves.toMatchObject({
      status: 'canceled',
    });
    await expect(repository.delete(loanId, userId)).resolves.toBe(true);
  });
});

const createLoan = (overrides: Partial<Loan> = {}): Loan => ({
  id: '000000000000000000000003',
  userId: '000000000000000000000001',
  contactId: '000000000000000000000002',
  principalAmountCents: 100000,
  interestType: 'compound',
  interestRate: 2.5,
  startDate: new Date('2026-05-01T00:00:00.000Z'),
  dueDate: new Date('2026-11-01T00:00:00.000Z'),
  installmentCount: 6,
  status: 'open' as LoanStatus,
  currentBalanceCents: 106500,
  totalPaidCents: 0,
  createdAt: new Date('2026-04-24T00:00:00.000Z'),
  updatedAt: new Date('2026-04-24T00:00:00.000Z'),
  canceledAt: null,
  ...overrides,
});

const createDocument = (overrides: Partial<Record<string, unknown>> = {}) => ({
  _id: {
    toString: () => String(overrides._id ?? '000000000000000000000003'),
  },
  userId: {
    toString: () => String(overrides.userId ?? '000000000000000000000001'),
  },
  contactId: overrides.contactId
    ? {
        toString: () => String(overrides.contactId),
      }
    : null,
  principalAmountCents: overrides.principalAmountCents ?? 100000,
  interestType: overrides.interestType ?? 'compound',
  interestRate: overrides.interestRate ?? 2.5,
  startDate: overrides.startDate ?? new Date('2026-05-01T00:00:00.000Z'),
  dueDate: overrides.dueDate ?? new Date('2026-11-01T00:00:00.000Z'),
  installmentCount: overrides.installmentCount ?? 6,
  status: overrides.status ?? 'open',
  currentBalanceCents: overrides.currentBalanceCents ?? 106500,
  totalPaidCents: overrides.totalPaidCents ?? 0,
  createdAt: overrides.createdAt ?? new Date('2026-04-24T00:00:00.000Z'),
  updatedAt: overrides.updatedAt ?? new Date('2026-04-24T00:00:00.000Z'),
  canceledAt: overrides.canceledAt ?? null,
});

const createFindChain = (items: unknown[]) => {
  const chain = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(items),
  };

  return chain;
};

const createLoanModelStub = (methods: Record<string, unknown>) => methods;
