import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

describe('Payments flow (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let mongod: MongoMemoryServer;

  jest.setTimeout(60_000);

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();

    process.env.NODE_ENV = 'test';
    process.env.PORT = '3005';
    process.env.MONGODB_URI = mongod.getUri('emprestapp_payments_test');
    process.env.JWT_ACCESS_SECRET = '1234567890abcdef1234567890abcdef';
    process.env.JWT_ACCESS_TTL = '15m';
    process.env.JWT_REFRESH_SECRET = 'abcdef1234567890abcdef1234567890';
    process.env.JWT_REFRESH_TTL = '7d';
    process.env.BCRYPT_SALT_ROUNDS = '10';

    const { AppModule } = await import('../src/app.module');
    const { configureApp } = await import('../src/main');
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    configureApp(app);
    await app.init();

    connection = app.get<Connection>(getConnectionToken());
  });

  afterEach(async () => {
    await connection.dropDatabase();
  });

  afterAll(async () => {
    await connection.close(true);
    await app.close();
    await mongod.stop();
  });

  it('registers a partial payment against the next open installment', async () => {
    const session = await registerUser(app, 'payments-owner@example.com');
    const createdLoan = await createLoan(app, session.accessToken, {
      principalAmountCents: 100000,
      interestType: 'none',
      startDate: '2099-01-01',
      installmentPlan: { count: 2 },
    });
    const firstInstallment = createdLoan.installments[0];

    const response = await request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({
        loanId: createdLoan.id,
        installmentId: firstInstallment.id,
        amountCents: 5000,
        paidAt: getPastIsoDate(),
        method: 'pix',
        note: 'Partial payment',
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      loanId: createdLoan.id,
      installmentId: firstInstallment.id,
      amountCents: 5000,
      method: 'pix',
      note: 'Partial payment',
      status: 'active',
      canceledAt: null,
    });

    const detail = await request(app.getHttpServer())
      .get(`/loans/${createdLoan.id}`)
      .set('Authorization', `Bearer ${session.accessToken}`);

    expect(detail.status).toBe(200);
    expect(detail.body.data.paymentSummary.totalPaidCents).toBe(5000);
    expect(detail.body.data.installments[0]).toMatchObject({
      id: firstInstallment.id,
      paidAmountCents: 5000,
      remainingAmountCents: firstInstallment.expectedAmountCents - 5000,
      status: 'pending',
    });
  });

  it('rejects a non-sequential payment target', async () => {
    const session = await registerUser(app, 'payments-sequence@example.com');
    const createdLoan = await createLoan(app, session.accessToken, {
      principalAmountCents: 100000,
      interestType: 'none',
      startDate: '2099-01-01',
      installmentPlan: { count: 2 },
    });
    const secondInstallment = createdLoan.installments[1];

    const response = await request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({
        loanId: createdLoan.id,
        installmentId: secondInstallment.id,
        amountCents: 5000,
        paidAt: getPastIsoDate(),
      });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      success: false,
      data: null,
      error: {
        code: 'INVALID_PAYMENT_SEQUENCE',
        message: 'Payment must target the next open installment',
        details: null,
      },
    });
  });

  it('rejects an overpayment', async () => {
    const session = await registerUser(app, 'payments-overpay@example.com');
    const createdLoan = await createLoan(app, session.accessToken, {
      principalAmountCents: 100000,
      interestType: 'none',
      startDate: '2099-01-01',
    });
    const installment = createdLoan.installments[0];

    const response = await request(app.getHttpServer())
      .post('/payments')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({
        loanId: createdLoan.id,
        installmentId: installment.id,
        amountCents: installment.expectedAmountCents + 1,
        paidAt: getPastIsoDate(),
      });

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      success: false,
      data: null,
      error: {
        code: 'INVALID_PAYMENT_AMOUNT',
        message: 'Payment amount is invalid',
        details: null,
      },
    });
  });

  it('lists global payments with active-only default status', async () => {
    const session = await registerUser(app, 'payments-list@example.com');
    const activeLoan = await createLoan(app, session.accessToken, {
      principalAmountCents: 100000,
      interestType: 'none',
      startDate: '2099-01-01',
    });
    const canceledLoan = await createLoan(app, session.accessToken, {
      principalAmountCents: 90000,
      interestType: 'none',
      startDate: '2099-02-01',
    });

    await createPayment(app, session.accessToken, {
      loanId: activeLoan.id,
      installmentId: activeLoan.installments[0].id,
      amountCents: 5000,
      paidAt: getPastIsoDate(),
    });
    const canceledPayment = await createPayment(app, session.accessToken, {
      loanId: canceledLoan.id,
      installmentId: canceledLoan.installments[0].id,
      amountCents: 4000,
      paidAt: getPastIsoDate(),
    });
    await request(app.getHttpServer())
      .post(`/payments/${canceledPayment.id}/cancel`)
      .set('Authorization', `Bearer ${session.accessToken}`);

    const response = await request(app.getHttpServer())
      .get('/payments?page=1&pageSize=20')
      .set('Authorization', `Bearer ${session.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.total).toBe(1);
    expect(response.body.data.items).toHaveLength(1);
    expect(response.body.data.items[0].status).toBe('active');
  });

  it('lists loan history including canceled payments', async () => {
    const session = await registerUser(app, 'payments-history@example.com');
    const createdLoan = await createLoan(app, session.accessToken, {
      principalAmountCents: 100000,
      interestType: 'none',
      startDate: '2099-01-01',
    });

    const payment = await createPayment(app, session.accessToken, {
      loanId: createdLoan.id,
      installmentId: createdLoan.installments[0].id,
      amountCents: 5000,
      paidAt: getPastIsoDate(),
    });
    await request(app.getHttpServer())
      .post(`/payments/${payment.id}/cancel`)
      .set('Authorization', `Bearer ${session.accessToken}`);

    const response = await request(app.getHttpServer())
      .get(`/loans/${createdLoan.id}/payments?page=1&pageSize=20`)
      .set('Authorization', `Bearer ${session.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data.total).toBe(1);
    expect(response.body.data.items[0]).toMatchObject({
      id: payment.id,
      status: 'canceled',
      canceledAt: expect.any(String),
    });
  });

  it('cancels a payment and reopens the installment and loan state', async () => {
    const session = await registerUser(app, 'payments-cancel@example.com');
    const createdLoan = await createLoan(app, session.accessToken, {
      principalAmountCents: 100000,
      interestType: 'none',
      startDate: '2099-01-01',
    });
    const installment = createdLoan.installments[0];
    const payment = await createPayment(app, session.accessToken, {
      loanId: createdLoan.id,
      installmentId: installment.id,
      amountCents: installment.expectedAmountCents,
      paidAt: getPastIsoDate(),
    });

    const cancelResponse = await request(app.getHttpServer())
      .post(`/payments/${payment.id}/cancel`)
      .set('Authorization', `Bearer ${session.accessToken}`);

    expect(cancelResponse.status).toBe(200);
    expect(cancelResponse.body.data).toMatchObject({
      id: payment.id,
      status: 'canceled',
      canceledAt: expect.any(String),
    });

    const detail = await request(app.getHttpServer())
      .get(`/loans/${createdLoan.id}`)
      .set('Authorization', `Bearer ${session.accessToken}`);

    expect(detail.status).toBe(200);
    expect(detail.body.data.status).toBe('open');
    expect(detail.body.data.paymentSummary).toEqual({
      totalPaidCents: 0,
      currentBalanceCents: installment.expectedAmountCents,
    });
    expect(detail.body.data.installments[0]).toMatchObject({
      id: installment.id,
      paidAmountCents: 0,
      remainingAmountCents: installment.expectedAmountCents,
      status: 'pending',
    });
  });

  it('returns 404 when accessing another user loan payment history', async () => {
    const owner = await registerUser(app, 'payments-owner-2@example.com');
    const other = await registerUser(app, 'payments-other@example.com');
    const createdLoan = await createLoan(app, owner.accessToken, {
      principalAmountCents: 100000,
      interestType: 'none',
      startDate: '2099-01-01',
    });

    const response = await request(app.getHttpServer())
      .get(`/loans/${createdLoan.id}/payments?page=1&pageSize=20`)
      .set('Authorization', `Bearer ${other.accessToken}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      data: null,
      error: {
        code: 'LOAN_NOT_FOUND',
        message: 'Loan not found',
        details: null,
      },
    });
  });
});

const registerUser = async (app: INestApplication, email: string) => {
  const response = await request(app.getHttpServer()).post('/auth/register').send({
    fullName: 'Jane Doe',
    email,
    password: 'Strong#123',
  });

  return response.body.data.session as {
    accessToken: string;
    refreshToken: string;
    expiresAt: string;
  };
};

const createLoan = async (
  app: INestApplication,
  accessToken: string,
  input: {
    principalAmountCents: number;
    interestType: 'none' | 'simple' | 'compound';
    startDate: string;
    installmentPlan?: {
      count: number;
    };
  },
) => {
  const response = await request(app.getHttpServer())
    .post('/loans')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(input);

  return response.body.data as {
    id: string;
    installments: Array<{
      id: string;
      expectedAmountCents: number;
    }>;
  };
};

const createPayment = async (
  app: INestApplication,
  accessToken: string,
  input: {
    loanId: string;
    installmentId: string;
    amountCents: number;
    paidAt: string;
  },
) => {
  const response = await request(app.getHttpServer())
    .post('/payments')
    .set('Authorization', `Bearer ${accessToken}`)
    .send(input);

  return response.body.data as { id: string };
};

const getPastIsoDate = (): string => {
  const date = new Date(Date.now() - 24 * 60 * 60 * 1000);

  return date.toISOString().slice(0, 10);
};
