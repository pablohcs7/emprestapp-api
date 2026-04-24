import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

describe('Dashboard and compliance flow (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let mongod: MongoMemoryServer;

  jest.setTimeout(60_000);

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();

    process.env.NODE_ENV = 'test';
    process.env.PORT = '3006';
    process.env.MONGODB_URI = mongod.getUri('emprestapp_dashboard_test');
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
  });

  afterEach(async () => {
    await connection.dropDatabase();
  });

  afterAll(async () => {
    await connection.close(true);
    await app.close();
    await mongod.stop();
  });

  it('returns dashboard summary metrics from open, overdue, and paid loans', async () => {
    const session = await registerUser(app, 'dash-summary@example.com');

    const openLoan = await createLoan(app, session.accessToken, {
      principalAmountCents: 100000,
      interestType: 'none',
      startDate: '2099-01-01',
    });
    const overdueLoan = await createLoan(app, session.accessToken, {
      principalAmountCents: 80000,
      interestType: 'none',
      startDate: '2020-01-01',
    });
    const paidLoan = await createLoan(app, session.accessToken, {
      principalAmountCents: 60000,
      interestType: 'none',
      startDate: '2099-02-01',
    });

    await createPayment(app, session.accessToken, {
      loanId: overdueLoan.id,
      installmentId: overdueLoan.installments[0].id,
      amountCents: 5000,
      paidAt: getPastIsoDate(),
    });
    await createPayment(app, session.accessToken, {
      loanId: paidLoan.id,
      installmentId: paidLoan.installments[0].id,
      amountCents: paidLoan.installments[0].expectedAmountCents,
      paidAt: getPastIsoDate(),
    });

    const response = await request(app.getHttpServer())
      .get('/dashboard/summary')
      .set('Authorization', `Bearer ${session.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      totalOutstandingCents: 175000,
      totalOverdueCents: 75000,
      totalReceivedCents: 65000,
      openLoansCount: 1,
      overdueLoansCount: 1,
    });
    expect(openLoan.id).toEqual(expect.any(String));
  });

  it('returns dashboard history with contact name and hides canceled loans by default', async () => {
    const session = await registerUser(app, 'dash-history@example.com');
    const contact = await createContact(app, session.accessToken, 'John Smith');
    const activeLoan = await createLoan(app, session.accessToken, {
      contactId: contact.id,
      principalAmountCents: 100000,
      interestType: 'none',
      startDate: '2099-01-01',
    });
    const canceledLoan = await createLoan(app, session.accessToken, {
      principalAmountCents: 50000,
      interestType: 'none',
      startDate: '2099-02-01',
    });

    await request(app.getHttpServer())
      .post(`/loans/${canceledLoan.id}/cancel`)
      .set('Authorization', `Bearer ${session.accessToken}`);

    const defaultResponse = await request(app.getHttpServer())
      .get('/dashboard/history?page=1&pageSize=20')
      .set('Authorization', `Bearer ${session.accessToken}`);

    expect(defaultResponse.status).toBe(200);
    expect(defaultResponse.body.data.total).toBe(1);
    expect(defaultResponse.body.data.items[0]).toMatchObject({
      id: activeLoan.id,
      contactId: contact.id,
      contactName: 'John Smith',
      status: 'open',
    });

    const canceledResponse = await request(app.getHttpServer())
      .get('/dashboard/history?status=canceled&page=1&pageSize=20')
      .set('Authorization', `Bearer ${session.accessToken}`);

    expect(canceledResponse.status).toBe(200);
    expect(canceledResponse.body.data.total).toBe(1);
    expect(canceledResponse.body.data.items[0]).toMatchObject({
      id: canceledLoan.id,
      status: 'canceled',
    });
  });

  it('returns the authenticated user profile', async () => {
    const session = await registerUser(app, 'profile@example.com');

    const response = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${session.accessToken}`);

    expect(response.status).toBe(200);
    expect(response.body.data).toMatchObject({
      fullName: 'Jane Doe',
      email: 'profile@example.com',
      status: 'active',
    });
  });

  it('exports user-owned data in json and csv', async () => {
    const session = await registerUser(app, 'export@example.com');
    const contact = await createContact(app, session.accessToken, 'Export Contact');
    const loan = await createLoan(app, session.accessToken, {
      contactId: contact.id,
      principalAmountCents: 100000,
      interestType: 'none',
      startDate: '2099-01-01',
    });
    await createPayment(app, session.accessToken, {
      loanId: loan.id,
      installmentId: loan.installments[0].id,
      amountCents: 5000,
      paidAt: getPastIsoDate(),
    });

    const jsonResponse = await request(app.getHttpServer())
      .get('/users/me/export?format=json')
      .set('Authorization', `Bearer ${session.accessToken}`);

    expect(jsonResponse.status).toBe(200);
    expect(jsonResponse.headers['content-type']).toContain('application/json');
    expect(jsonResponse.body.data).toMatchObject({
      format: 'json',
      fileName: `emprestapp-export-${session.userId}.json`,
      contentType: 'application/json; charset=utf-8',
    });
    expect(jsonResponse.body.data.content).toContain('"contacts"');
    expect(jsonResponse.body.data.content).toContain('"payments"');

    const csvResponse = await request(app.getHttpServer())
      .get('/users/me/export?format=csv')
      .set('Authorization', `Bearer ${session.accessToken}`);

    expect(csvResponse.status).toBe(200);
    expect(csvResponse.body.data).toMatchObject({
      format: 'csv',
      fileName: `emprestapp-export-${session.userId}.csv`,
      contentType: 'text/csv; charset=utf-8',
    });
    expect(csvResponse.body.data.content).toContain('# user');
    expect(csvResponse.body.data.content).toContain('# loans');
  });

  it('returns INVALID_EXPORT_FORMAT for unsupported export formats', async () => {
    const session = await registerUser(app, 'invalid-export@example.com');

    const response = await request(app.getHttpServer())
      .get('/users/me/export?format=xml')
      .set('Authorization', `Bearer ${session.accessToken}`);

    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      success: false,
      data: null,
      error: {
        code: 'INVALID_EXPORT_FORMAT',
        message: 'Invalid export format',
        details: null,
      },
    });
  });

  it('logically deletes the user account and blocks further login', async () => {
    const session = await registerUser(app, 'delete-me@example.com');

    const deleteResponse = await request(app.getHttpServer())
      .delete('/users/me')
      .set('Authorization', `Bearer ${session.accessToken}`);

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body).toEqual({
      success: true,
      data: {
        status: 'deleted',
      },
      error: null,
    });

    const profileResponse = await request(app.getHttpServer())
      .get('/users/me')
      .set('Authorization', `Bearer ${session.accessToken}`);

    expect(profileResponse.status).toBe(200);
    expect(profileResponse.body.data.status).toBe('deleted');

    const loginResponse = await request(app.getHttpServer())
      .post('/auth/login')
      .send({
        email: 'delete-me@example.com',
        password: 'Strong#123',
      });

    expect(loginResponse.status).toBe(401);
    expect(loginResponse.body).toEqual({
      success: false,
      data: null,
      error: {
        code: 'UNAUTHORIZED',
        message: 'Invalid credentials',
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

  return {
    ...(response.body.data.session as {
      accessToken: string;
      refreshToken: string;
      expiresAt: string;
    }),
    userId: response.body.data.user.id as string,
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
      notes: 'Dashboard contact',
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
