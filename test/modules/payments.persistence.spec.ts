import { Types } from 'mongoose';

import { PaymentRepository } from '../../src/modules/payments/domain/payment.repository';
import { Payment, PaymentStatus } from '../../src/modules/payments/domain/payment.types';
import { MongoosePaymentRepository } from '../../src/modules/payments/infrastructure/persistence/payment.repository';
import { paymentSchema } from '../../src/modules/payments/infrastructure/persistence/payment.schema';

describe('payments persistence foundation', () => {
  const userId = '000000000000000000000001';
  const loanId = '000000000000000000000002';
  const installmentId = '000000000000000000000003';
  const paymentId = '000000000000000000000004';

  it('defines the expected payment repository contract methods', async () => {
    class InMemoryPaymentRepository extends PaymentRepository {
      async register(input: any) {
        return createPayment({
          id: 'pay_1',
          userId: input.userId,
          loanId: input.loanId,
          installmentId: input.installmentId,
          amountCents: input.amountCents,
          paidAt: input.paidAt,
          method: input.method ?? null,
          note: input.note ?? null,
          status: 'active',
          canceledAt: null,
        });
      }

      async findById(paymentId: string) {
        return createPayment({ id: paymentId });
      }

      async findByIdForUser(paymentId: string, userId: string) {
        return createPayment({ id: paymentId, userId });
      }

      async listForUser(userId: string, filters: any) {
        return {
          items: [createPayment({ userId, loanId: filters.loanId ?? loanId })],
          total: 1,
        };
      }

      async listByLoanId(loanId: string, userId: string, filters: any) {
        return {
          items: [
            createPayment({
              userId,
              loanId,
              status: (filters.status?.includes('canceled')
                ? 'canceled'
                : 'active') as PaymentStatus,
            }),
          ],
          total: 1,
        };
      }

      async listActiveByLoanId(loanId: string, userId: string) {
        return [createPayment({ loanId, userId, status: 'active' })];
      }

      async listActiveByInstallmentId(installmentId: string, userId: string) {
        return [createPayment({ installmentId, userId, status: 'active' })];
      }

      async cancel(paymentId: string, userId: string, canceledAt: Date) {
        return createPayment({
          id: paymentId,
          userId,
          status: 'canceled',
          canceledAt,
        });
      }
    }

    const repository = new InMemoryPaymentRepository();

    await expect(repository.findByIdForUser(paymentId, userId)).resolves.toMatchObject({
      id: paymentId,
      userId,
    });
    expect(typeof repository.register).toBe('function');
    expect(typeof repository.findById).toBe('function');
    expect(typeof repository.findByIdForUser).toBe('function');
    expect(typeof repository.listForUser).toBe('function');
    expect(typeof repository.listByLoanId).toBe('function');
    expect(typeof repository.listActiveByLoanId).toBe('function');
    expect(typeof repository.listActiveByInstallmentId).toBe('function');
    expect(typeof repository.cancel).toBe('function');
  });

  it('creates the payment schema with ownership, defaults, validation, and timestamps', () => {
    const statusPath = paymentSchema.path('status');
    const canceledAtPath = paymentSchema.path('canceledAt');

    expect(paymentSchema.path('userId')).toBeDefined();
    expect(paymentSchema.path('loanId')).toBeDefined();
    expect(paymentSchema.path('installmentId')).toBeDefined();
    expect(paymentSchema.path('amountCents')).toBeDefined();
    expect(paymentSchema.path('paidAt')).toBeDefined();
    expect(statusPath.options.default).toBe('active');
    expect(canceledAtPath.options.default).toBeNull();
    expect(paymentSchema.get('timestamps')).toBe(true);
  });

  it('declares the indexes required by the payments data model', () => {
    const indexes = paymentSchema.indexes();

    expect(indexes).toEqual(
      expect.arrayContaining([
        [{ userId: 1, loanId: 1, paidAt: -1 }, { background: true }],
        [{ userId: 1, installmentId: 1, status: 1 }, { background: true }],
        [{ userId: 1, status: 1, paidAt: -1 }, { background: true }],
      ]),
    );
  });

  it('maps payment records and query filters through the mongoose adapter contract', async () => {
    const createdAt = new Date('2026-08-01T13:00:00.000Z');
    const canceledAt = new Date('2026-08-02T13:00:00.000Z');
    const paidAt = new Date('2026-08-01T00:00:00.000Z');
    const activeDocument = createModelDocument({
      _id: paymentId,
      userId,
      loanId,
      installmentId,
      amountCents: 5000,
      paidAt,
      method: 'pix',
      note: 'Partial payment',
      status: 'active',
      createdAt,
      canceledAt: null,
    });
    const canceledDocument = createModelDocument({
      _id: paymentId,
      userId,
      loanId,
      installmentId,
      amountCents: 3500,
      paidAt: new Date('2026-08-02T00:00:00.000Z'),
      method: 'cash',
      note: 'Canceled payment',
      status: 'canceled',
      createdAt,
      canceledAt,
    });

    const model = {
      create: jest.fn().mockResolvedValue(activeDocument),
      findById: jest.fn().mockResolvedValue(activeDocument),
      findOne: jest.fn().mockResolvedValue(activeDocument),
      countDocuments: jest.fn().mockResolvedValue(2),
      find: jest
        .fn()
        .mockReturnValueOnce(createFindChain([activeDocument, canceledDocument]))
        .mockReturnValueOnce(createFindChain([activeDocument, canceledDocument]))
        .mockReturnValueOnce(createSortedFindChain([activeDocument]))
        .mockReturnValueOnce(createSortedFindChain([activeDocument])),
      findOneAndUpdate: jest.fn().mockResolvedValue(canceledDocument),
    };

    const repository = new MongoosePaymentRepository(model as never);

    await expect(
      repository.register({
        userId,
        loanId,
        installmentId,
        amountCents: 5000,
        paidAt,
        method: 'pix',
        note: 'Partial payment',
      }),
    ).resolves.toMatchObject({
      id: paymentId,
      userId,
      loanId,
      installmentId,
      amountCents: 5000,
      status: 'active',
    });

    await expect(repository.findById(paymentId)).resolves.toMatchObject({
      id: paymentId,
    });
    await expect(repository.findByIdForUser(paymentId, userId)).resolves.toMatchObject({
      userId,
    });
    await expect(
      repository.listForUser(userId, {
        loanId,
        installmentId,
        status: ['active'],
        paidAtFrom: new Date('2026-08-01T00:00:00.000Z'),
        paidAtTo: new Date('2026-08-31T23:59:59.000Z'),
        page: 1,
        pageSize: 20,
      }),
    ).resolves.toEqual({
      items: expect.arrayContaining([
        expect.objectContaining({
          id: paymentId,
          status: 'active',
        }),
      ]),
      total: 2,
    });
    await expect(
      repository.listByLoanId(loanId, userId, {
        status: ['active', 'canceled'],
        paidAtFrom: new Date('2026-08-01T00:00:00.000Z'),
        paidAtTo: new Date('2026-08-31T23:59:59.000Z'),
        page: 1,
        pageSize: 20,
      }),
    ).resolves.toEqual({
      items: expect.arrayContaining([
        expect.objectContaining({
          id: paymentId,
          status: 'active',
        }),
        expect.objectContaining({
          status: 'canceled',
        }),
      ]),
      total: 2,
    });
    await expect(repository.listActiveByLoanId(loanId, userId)).resolves.toHaveLength(1);
    await expect(
      repository.listActiveByInstallmentId(installmentId, userId),
    ).resolves.toHaveLength(1);
    await expect(repository.cancel(paymentId, userId, canceledAt)).resolves.toMatchObject({
      id: paymentId,
      status: 'canceled',
      canceledAt,
    });

    expect(model.create).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: expect.any(Types.ObjectId),
        loanId: expect.any(Types.ObjectId),
        installmentId: expect.any(Types.ObjectId),
        amountCents: 5000,
        paidAt,
        method: 'pix',
        note: 'Partial payment',
        status: 'active',
        canceledAt: null,
      }),
    );
    expect(model.findById).toHaveBeenCalledWith(paymentId);
    expect(model.findOne).toHaveBeenCalledWith({
      _id: paymentId,
      userId: expect.any(Types.ObjectId),
    });
    expect(model.find).toHaveBeenNthCalledWith(1, {
      userId: expect.any(Types.ObjectId),
      loanId: expect.any(Types.ObjectId),
      installmentId: expect.any(Types.ObjectId),
      status: { $in: ['active'] },
      paidAt: {
        $gte: new Date('2026-08-01T00:00:00.000Z'),
        $lte: new Date('2026-08-31T23:59:59.000Z'),
      },
    });
    expect(model.find).toHaveBeenNthCalledWith(2, {
      userId: expect.any(Types.ObjectId),
      loanId: expect.any(Types.ObjectId),
      status: { $in: ['active', 'canceled'] },
      paidAt: {
        $gte: new Date('2026-08-01T00:00:00.000Z'),
        $lte: new Date('2026-08-31T23:59:59.000Z'),
      },
    });
    expect(model.find).toHaveBeenNthCalledWith(3, {
      userId: expect.any(Types.ObjectId),
      loanId: expect.any(Types.ObjectId),
      status: 'active',
    });
    expect(model.find).toHaveBeenNthCalledWith(4, {
      userId: expect.any(Types.ObjectId),
      installmentId: expect.any(Types.ObjectId),
      status: 'active',
    });
    expect(model.findOneAndUpdate).toHaveBeenCalledWith(
      {
        _id: paymentId,
        userId: expect.any(Types.ObjectId),
      },
      {
        status: 'canceled',
        canceledAt,
      },
      { returnDocument: 'after' },
    );
  });
});

const createPayment = (overrides: Partial<Payment> = {}): Payment => ({
  id: '000000000000000000000004',
  userId: '000000000000000000000001',
  loanId: '000000000000000000000002',
  installmentId: '000000000000000000000003',
  amountCents: 5000,
  paidAt: new Date('2026-08-01T00:00:00.000Z'),
  method: 'pix',
  note: 'Partial payment',
  status: 'active',
  createdAt: new Date('2026-08-01T13:00:00.000Z'),
  updatedAt: new Date('2026-08-01T13:00:00.000Z'),
  canceledAt: null,
  ...overrides,
});

const createModelDocument = (overrides: Record<string, unknown>) => ({
  _id: new Types.ObjectId(),
  userId: new Types.ObjectId('000000000000000000000001'),
  loanId: new Types.ObjectId('000000000000000000000002'),
  installmentId: new Types.ObjectId('000000000000000000000003'),
  amountCents: 5000,
  paidAt: new Date('2026-08-01T00:00:00.000Z'),
  method: 'pix',
  note: 'Partial payment',
  status: 'active',
  createdAt: new Date('2026-08-01T13:00:00.000Z'),
  updatedAt: new Date('2026-08-01T13:00:00.000Z'),
  canceledAt: null,
  ...overrides,
});

const createFindChain = (items: unknown[]) => {
  const chain = {
    sort: jest.fn().mockReturnThis(),
    skip: jest.fn().mockReturnThis(),
    limit: jest.fn().mockResolvedValue(items),
  };

  return chain;
};

const createSortedFindChain = (items: unknown[]) => ({
  sort: jest.fn().mockResolvedValue(items),
});
