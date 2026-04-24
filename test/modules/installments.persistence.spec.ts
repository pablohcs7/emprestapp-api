import { Types } from 'mongoose';

import { InstallmentRepository } from '../../src/modules/loans/domain/installment.repository';
import {
  CreateInstallmentRecord,
  Installment,
  InstallmentStatus,
} from '../../src/modules/loans/domain/installment.types';
import { MongooseInstallmentRepository } from '../../src/modules/loans/infrastructure/persistence/installment.repository';
import { installmentSchema } from '../../src/modules/loans/infrastructure/persistence/installment.schema';

describe('installments persistence foundation', () => {
  const userId = '000000000000000000000001';
  const loanId = '000000000000000000000002';
  const installmentId = '000000000000000000000003';

  it('defines the expected installment repository contract methods', async () => {
    class InMemoryInstallmentRepository extends InstallmentRepository {
      async createMany(records: CreateInstallmentRecord[]) {
        return records.map((record, index) =>
          createInstallment({
            id: `inst_${index + 1}`,
            userId: record.userId,
            loanId: record.loanId,
            sequence: record.sequence,
            dueDate: record.dueDate,
            expectedAmountCents: record.expectedAmountCents,
            paidAmountCents: record.paidAmountCents ?? 0,
            remainingAmountCents:
              record.remainingAmountCents ?? record.expectedAmountCents,
            status: record.status ?? 'pending',
            canceledAt: record.canceledAt ?? null,
          }),
        );
      }

      async findById(installmentId: string) {
        return createInstallment({ id: installmentId });
      }

      async findByIdForUser(installmentId: string, userId: string) {
        return createInstallment({ id: installmentId, userId });
      }

      async findByLoanId(loanId: string, userId: string) {
        return [createInstallment({ loanId, userId })];
      }

      async findByLoanIdAndStatus(
        loanId: string,
        userId: string,
        status: InstallmentStatus,
      ) {
        return [createInstallment({ loanId, userId, status })];
      }

      async findByLoanIdAndSequence(
        loanId: string,
        userId: string,
        sequence: number,
      ) {
        return createInstallment({ loanId, userId, sequence });
      }

      async findNextOpenForLoan(loanId: string, userId: string) {
        return createInstallment({ loanId, userId, status: 'pending' });
      }

      async updateDerivedState(input: {
        installmentId: string;
        userId: string;
        paidAmountCents: number;
        remainingAmountCents: number;
        status: Exclude<InstallmentStatus, 'canceled'>;
      }) {
        return createInstallment({
          id: input.installmentId,
          userId: input.userId,
          paidAmountCents: input.paidAmountCents,
          remainingAmountCents: input.remainingAmountCents,
          status: input.status,
        });
      }

      async cancelByLoan(
        loanId: string,
        userId: string,
        canceledAt: Date,
      ) {
        return [
          createInstallment({
            loanId,
            userId,
            status: 'canceled',
            paidAmountCents: 0,
            remainingAmountCents: 0,
            canceledAt,
          }),
        ];
      }

      async deleteByLoan(loanId: string, userId: string) {
        return loanId === '000000000000000000000002' && userId === '000000000000000000000001';
      }
    }

    const repository = new InMemoryInstallmentRepository();

    await expect(
      repository.findByLoanIdAndStatus(loanId, userId, 'pending'),
    ).resolves.toEqual([
      expect.objectContaining({
        loanId,
        status: 'pending',
      }),
    ]);
    expect(typeof repository.createMany).toBe('function');
    expect(typeof repository.findById).toBe('function');
    expect(typeof repository.findByIdForUser).toBe('function');
    expect(typeof repository.findByLoanId).toBe('function');
    expect(typeof repository.findByLoanIdAndStatus).toBe('function');
    expect(typeof repository.findByLoanIdAndSequence).toBe('function');
    expect(typeof repository.findNextOpenForLoan).toBe('function');
    expect(typeof repository.updateDerivedState).toBe('function');
    expect(typeof repository.cancelByLoan).toBe('function');
    expect(typeof repository.deleteByLoan).toBe('function');
  });

  it('normalizes insertions and installment state queries in the mongoose adapter', async () => {
    const inserted: Array<Record<string, unknown>> = [];
    const model = {
      insertMany: jest.fn(async (records: Array<Record<string, unknown>>) => {
        inserted.push(...records);

        return records.map((record, index) =>
          createModelDocument({
            _id: new Types.ObjectId(`00000000000000000000000${index + 1}`),
            ...record,
          }),
        );
      }),
      findById: jest.fn(async (installmentId: string) =>
        createModelDocument({ _id: new Types.ObjectId(installmentId) }),
      ),
      findOne: jest.fn((query: Record<string, unknown>) => {
        const document = createModelDocument({
          _id: new Types.ObjectId('0000000000000000000000aa'),
          loanId: query.loanId,
          userId: query.userId,
          sequence: query.sequence ?? 1,
          dueDate: new Date('2026-06-01T00:00:00.000Z'),
          expectedAmountCents: 10000,
          paidAmountCents: 2500,
          remainingAmountCents: 7500,
          status: 'pending' as InstallmentStatus,
          createdAt: new Date('2026-04-24T00:00:00.000Z'),
          updatedAt: new Date('2026-04-24T00:00:00.000Z'),
          canceledAt: null,
        });

        return {
          ...document,
          sort: jest.fn(async () => document),
        };
      }),
      find: jest.fn((query: Record<string, unknown>) => ({
        sort: jest.fn(async () => [
          createModelDocument({
            _id: new Types.ObjectId('0000000000000000000000b1'),
            loanId: query.loanId,
            userId: query.userId,
            sequence: 1,
            dueDate: new Date('2026-06-01T00:00:00.000Z'),
            expectedAmountCents: 10000,
            paidAmountCents: 0,
            remainingAmountCents: 10000,
            status: 'pending' as InstallmentStatus,
            createdAt: new Date('2026-04-24T00:00:00.000Z'),
            updatedAt: new Date('2026-04-24T00:00:00.000Z'),
            canceledAt: null,
          }),
        ]),
      })),
    };

    const repository = new MongooseInstallmentRepository(model as never);

    await expect(
      repository.createMany([
        {
          userId,
          loanId,
          sequence: 1,
          dueDate: new Date('2026-06-01T00:00:00.000Z'),
          expectedAmountCents: 10000,
        },
      ]),
    ).resolves.toMatchObject([
      {
        loanId: expect.any(String),
        userId: expect.any(String),
        paidAmountCents: 0,
        remainingAmountCents: 10000,
        status: 'pending',
      },
    ]);

    expect(inserted[0]).toMatchObject({
      userId: expect.any(Types.ObjectId),
      loanId: expect.any(Types.ObjectId),
      paidAmountCents: 0,
      remainingAmountCents: 10000,
      status: 'pending',
      canceledAt: null,
    });

    await expect(repository.findByLoanId(loanId, userId)).resolves.toHaveLength(1);
    await expect(repository.findByLoanIdAndStatus(loanId, userId, 'pending')).resolves.toHaveLength(1);
    await expect(repository.findByLoanIdAndSequence(loanId, userId, 1)).resolves.toMatchObject({
      sequence: 1,
    });
    await expect(repository.findNextOpenForLoan(loanId, userId)).resolves.toMatchObject({
      status: 'pending',
    });

    expect(model.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        userId: expect.any(Types.ObjectId),
        loanId: expect.any(Types.ObjectId),
        paidAmountCents: 0,
        remainingAmountCents: 10000,
        status: 'pending',
        canceledAt: null,
      }),
    ]);
    expect(model.find).toHaveBeenNthCalledWith(1, {
      loanId: expect.any(Types.ObjectId),
      userId: expect.any(Types.ObjectId),
    });
    expect(model.find).toHaveBeenNthCalledWith(2, {
      loanId: expect.any(Types.ObjectId),
      userId: expect.any(Types.ObjectId),
      status: 'pending',
    });
    expect(model.findOne).toHaveBeenNthCalledWith(1, {
      loanId: expect.any(Types.ObjectId),
      userId: expect.any(Types.ObjectId),
      sequence: 1,
    });
    expect(model.findOne).toHaveBeenNthCalledWith(2, {
      loanId: expect.any(Types.ObjectId),
      userId: expect.any(Types.ObjectId),
      status: {
        $in: ['pending', 'overdue'],
      },
    });
  });

  it('cancels installments for a loan through the mongoose adapter', async () => {
    const canceledAt = new Date('2026-04-24T10:15:00.000Z');
    const model = {
      updateMany: jest.fn(async () => ({ modifiedCount: 1 })),
      find: jest.fn(() => ({
        sort: jest.fn(async () => [
          createModelDocument({
            _id: new Types.ObjectId('0000000000000000000000c1'),
            loanId: new Types.ObjectId(loanId),
            userId: new Types.ObjectId(userId),
            sequence: 1,
            dueDate: new Date('2026-06-01T00:00:00.000Z'),
            expectedAmountCents: 10000,
            paidAmountCents: 0,
            remainingAmountCents: 0,
            status: 'canceled' as InstallmentStatus,
            createdAt: new Date('2026-04-24T00:00:00.000Z'),
            updatedAt: new Date('2026-04-24T00:00:00.000Z'),
            canceledAt,
          }),
        ]),
      })),
    };

    const repository = new MongooseInstallmentRepository(model as never);

    await expect(
      repository.cancelByLoan(loanId, userId, canceledAt),
    ).resolves.toMatchObject([
      {
        status: 'canceled',
        paidAmountCents: 0,
        remainingAmountCents: 0,
        canceledAt,
      },
    ]);

    expect(model.updateMany).toHaveBeenCalledWith(
      {
        loanId: expect.any(Types.ObjectId),
        userId: expect.any(Types.ObjectId),
      },
      {
        $set: {
          status: 'canceled',
          paidAmountCents: 0,
          remainingAmountCents: 0,
          canceledAt,
        },
      },
    );
    expect(model.find).toHaveBeenCalledWith({
      loanId: expect.any(Types.ObjectId),
      userId: expect.any(Types.ObjectId),
    });
  });

  it('updates installment derived state through the mongoose adapter', async () => {
    const model = {
      findOneAndUpdate: jest.fn(async () =>
        createModelDocument({
          _id: new Types.ObjectId(installmentId),
          userId: new Types.ObjectId(userId),
          loanId: new Types.ObjectId(loanId),
          sequence: 1,
          paidAmountCents: 10000,
          remainingAmountCents: 0,
          status: 'paid' as InstallmentStatus,
        }),
      ),
    };

    const repository = new MongooseInstallmentRepository(model as never);

    await expect(
      repository.updateDerivedState({
        installmentId,
        userId,
        paidAmountCents: 10000,
        remainingAmountCents: 0,
        status: 'paid',
      }),
    ).resolves.toMatchObject({
      id: installmentId,
      paidAmountCents: 10000,
      remainingAmountCents: 0,
      status: 'paid',
    });

    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: expect.any(Types.ObjectId),
        userId: expect.any(Types.ObjectId),
      },
      {
        paidAmountCents: 10000,
        remainingAmountCents: 0,
        status: 'paid',
      },
      { returnDocument: 'after' },
    );
  });

  it('deletes installments for a loan through the mongoose adapter', async () => {
    const model = {
      deleteMany: jest.fn(async () => ({ deletedCount: 2 })),
    };

    const repository = new MongooseInstallmentRepository(model as never);

    await expect(repository.deleteByLoan(loanId, userId)).resolves.toBe(true);

    expect(model.deleteMany).toHaveBeenCalledWith({
      loanId: expect.any(Types.ObjectId),
      userId: expect.any(Types.ObjectId),
    });
  });

  it('creates the installment schema with required settlement fields and timestamps', () => {
    expect(installmentSchema.path('userId')).toBeDefined();
    expect(installmentSchema.path('loanId')).toBeDefined();
    expect(installmentSchema.path('sequence')).toBeDefined();
    expect(installmentSchema.path('paidAmountCents')).toBeDefined();
    expect(installmentSchema.path('remainingAmountCents')).toBeDefined();
    expect(installmentSchema.path('status')).toBeDefined();
    expect(installmentSchema.path('canceledAt')).toBeDefined();
    expect(installmentSchema.get('timestamps')).toBe(true);
  });

  it('declares the indexes required by the installments data model', () => {
    expect(installmentSchema.indexes()).toEqual(
      expect.arrayContaining([
        [{ loanId: 1, sequence: 1 }, { unique: true, background: true }],
        [{ userId: 1, loanId: 1, status: 1 }, { background: true }],
        [{ userId: 1, dueDate: 1, status: 1 }, { background: true }],
      ]),
    );
  });
});

const createInstallment = (overrides: Partial<Installment> = {}): Installment => ({
  id: '000000000000000000000003',
  userId: '000000000000000000000001',
  loanId: '000000000000000000000002',
  sequence: 1,
  dueDate: new Date('2026-06-01T00:00:00.000Z'),
  expectedAmountCents: 10000,
  paidAmountCents: 0,
  remainingAmountCents: 10000,
  status: 'pending',
  createdAt: new Date('2026-04-24T00:00:00.000Z'),
  updatedAt: new Date('2026-04-24T00:00:00.000Z'),
  canceledAt: null,
  ...overrides,
});

const createModelDocument = (
  overrides: Record<string, unknown>,
): Record<string, unknown> => ({
  _id: new Types.ObjectId(),
  userId: new Types.ObjectId('000000000000000000000001'),
  loanId: new Types.ObjectId('000000000000000000000002'),
  sequence: 1,
  dueDate: new Date('2026-06-01T00:00:00.000Z'),
  expectedAmountCents: 10000,
  paidAmountCents: 0,
  remainingAmountCents: 10000,
  status: 'pending',
  createdAt: new Date('2026-04-24T00:00:00.000Z'),
  updatedAt: new Date('2026-04-24T00:00:00.000Z'),
  canceledAt: null,
  ...overrides,
});
