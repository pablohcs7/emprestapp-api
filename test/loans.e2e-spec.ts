import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

import { InMemoryLoanPaymentReadAdapter } from '../src/modules/loans/infrastructure/in-memory-loan-payment-read.adapter';

describe('Loans flow (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let mongod: MongoMemoryServer;
  let loanPaymentReadAdapter: InMemoryLoanPaymentReadAdapter;

  jest.setTimeout(60_000);

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();

    process.env.NODE_ENV = 'test';
    process.env.PORT = '3004';
    process.env.MONGODB_URI = mongod.getUri('emprestapp_loans_test');
    process.env.JWT_ACCESS_SECRET = 'access-secret-value';
    process.env.JWT_ACCESS_TTL = '15m';
    process.env.JWT_REFRESH_SECRET = 'refresh-secret-value';
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
    loanPaymentReadAdapter = app.get(InMemoryLoanPaymentReadAdapter);
  });

  afterEach(async () => {
    loanPaymentReadAdapter.reset();
    await connection.dropDatabase();
  });

  afterAll(async () => {
    await connection.close(true);
    await app.close();
    await mongod.stop();
  });

  it('creates a loan without contact', async () => {
    const session = await registerUser(app, 'owner@example.com');

    const response = await request(app.getHttpServer())
      .post('/loans')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({
        principalAmountCents: 100000,
        interestType: 'none',
        startDate: '2026-05-01',
      });

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({
      success: true,
      error: null,
    });
    expect(response.body.data).toMatchObject({
      contactId: null,
      principalAmountCents: 100000,
      interestType: 'none',
      interestRate: null,
      status: 'open',
      paymentSummary: {
        totalPaidCents: 0,
        currentBalanceCents: expect.any(Number),
      },
    });
    expect(response.body.data.id).toEqual(expect.any(String));
    expect(response.body.data.installments).toHaveLength(1);
  });

  it('creates a loan with contact', async () => {
    const session = await registerUser(app, 'owner@example.com');
    const contact = await createContact(app, session.accessToken, 'John Smith');

    const response = await request(app.getHttpServer())
      .post('/loans')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({
        contactId: contact.id,
        principalAmountCents: 150000,
        interestType: 'none',
        startDate: '2026-05-01',
      });

    expect(response.status).toBe(201);
    expect(response.body.data).toMatchObject({
      contactId: contact.id,
      principalAmountCents: 150000,
      interestType: 'none',
      status: 'open',
    });
  });

  it('lists loans and hides canceled loans by default', async () => {
    const session = await registerUser(app, 'owner@example.com');
    const activeLoan = await createLoan(app, session.accessToken, {
      principalAmountCents: 100000,
      interestType: 'none',
      startDate: '2026-05-01',
    });
    const canceledLoan = await createLoan(app, session.accessToken, {
      principalAmountCents: 200000,
      interestType: 'none',
      startDate: '2026-05-02',
    });

    await request(app.getHttpServer())
      .post(`/loans/${canceledLoan.id}/cancel`)
      .set('Authorization', `Bearer ${session.accessToken}`);

    const defaultListResponse = await request(app.getHttpServer())
      .get('/loans?page=1&pageSize=20')
      .set('Authorization', `Bearer ${session.accessToken}`);

    expect(defaultListResponse.status).toBe(200);
    expect(defaultListResponse.body.data).toMatchObject({
      page: 1,
      pageSize: 20,
      total: 1,
    });
    expect(defaultListResponse.body.data.items).toHaveLength(1);
    expect(defaultListResponse.body.data.items[0].id).toBe(activeLoan.id);
    expect(defaultListResponse.body.data.items[0].status).toBe('open');

    const canceledListResponse = await request(app.getHttpServer())
      .get('/loans?status=canceled&page=1&pageSize=20')
      .set('Authorization', `Bearer ${session.accessToken}`);

    expect(canceledListResponse.status).toBe(200);
    expect(canceledListResponse.body.data.total).toBe(1);
    expect(canceledListResponse.body.data.items[0].id).toBe(canceledLoan.id);
    expect(canceledListResponse.body.data.items[0].status).toBe('canceled');
  });

  it('returns loan detail', async () => {
    const session = await registerUser(app, 'owner@example.com');
    const contact = await createContact(app, session.accessToken, 'Detail Contact');
    const created = await createLoan(app, session.accessToken, {
      contactId: contact.id,
      principalAmountCents: 120000,
      interestType: 'none',
      startDate: '2026-05-01',
      installmentPlan: { count: 2 },
    });

    const response = await request(app.getHttpServer())
      .get(`/loans/${created.id}`)
      .set('Authorization', `Bearer ${session.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: created.id,
      contactId: contact.id,
      principalAmountCents: 120000,
      status: 'open',
      paymentSummary: {
        totalPaidCents: 0,
        currentBalanceCents: expect.any(Number),
      },
    });
    expect(response.body.data.installments).toHaveLength(2);
  });

  it('links a contact to a loan', async () => {
    const session = await registerUser(app, 'owner@example.com');
    const contact = await createContact(app, session.accessToken, 'Linked Contact');
    const created = await createLoan(app, session.accessToken, {
      principalAmountCents: 100000,
      interestType: 'none',
      startDate: '2026-05-01',
    });

    const response = await request(app.getHttpServer())
      .patch(`/loans/${created.id}/link-contact`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({
        contactId: contact.id,
      });

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: created.id,
      contactId: contact.id,
      status: 'open',
    });
  });

  it('returns 403 when accessing another user loan', async () => {
    const owner = await registerUser(app, 'owner@example.com');
    const other = await registerUser(app, 'other@example.com');
    const created = await createLoan(app, owner.accessToken, {
      principalAmountCents: 100000,
      interestType: 'none',
      startDate: '2026-05-01',
    });

    const response = await request(app.getHttpServer())
      .get(`/loans/${created.id}`)
      .set('Authorization', `Bearer ${other.accessToken}`);

    expect(response.status).toBe(403);
    expect(response.body).toEqual({
      success: false,
      data: null,
      error: {
        code: 'FORBIDDEN_RESOURCE',
        message: 'Forbidden resource',
        details: null,
      },
    });
  });

  it('returns LOAN_HAS_PAYMENTS when cancel is blocked by payments', async () => {
    const session = await registerUser(app, 'owner@example.com');
    const created = await createLoan(app, session.accessToken, {
      principalAmountCents: 100000,
      interestType: 'none',
      startDate: '2026-05-01',
    });

    loanPaymentReadAdapter.setLoansWithPayments([created.id]);

    const response = await request(app.getHttpServer())
      .post(`/loans/${created.id}/cancel`)
      .set('Authorization', `Bearer ${session.accessToken}`);

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      success: false,
      data: null,
      error: {
        code: 'LOAN_HAS_PAYMENTS',
        message: 'Loan cannot be changed while it has payments',
        details: null,
      },
    });
  });

  it('cancels a loan successfully', async () => {
    const session = await registerUser(app, 'owner@example.com');
    const created = await createLoan(app, session.accessToken, {
      principalAmountCents: 100000,
      interestType: 'none',
      startDate: '2026-05-01',
    });

    const response = await request(app.getHttpServer())
      .post(`/loans/${created.id}/cancel`)
      .set('Authorization', `Bearer ${session.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      id: created.id,
      status: 'canceled',
      canceledAt: expect.any(String),
    });
  });

  it('deletes a loan successfully', async () => {
    const session = await registerUser(app, 'owner@example.com');
    const created = await createLoan(app, session.accessToken, {
      principalAmountCents: 100000,
      interestType: 'none',
      startDate: '2026-05-01',
    });

    const response = await request(app.getHttpServer())
      .delete(`/loans/${created.id}`)
      .set('Authorization', `Bearer ${session.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        deleted: true,
      },
      error: null,
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

const createContact = async (
  app: INestApplication,
  accessToken: string,
  fullName: string,
) => {
  const response = await request(app.getHttpServer())
    .post('/contacts')
    .set('Authorization', `Bearer ${accessToken}`)
    .send({
      fullName,
      documentId: '12345678900',
      phone: '+5511999999999',
      notes: 'Loan contact',
    });

  return response.body.data as { id: string };
};

const createLoan = async (
  app: INestApplication,
  accessToken: string,
  input: {
    contactId?: string;
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

  return response.body.data as { id: string };
};
