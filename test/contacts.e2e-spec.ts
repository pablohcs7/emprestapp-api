import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

import { InMemoryContactLoanReadAdapter } from '../src/modules/contacts/infrastructure/in-memory-contact-loan-read.adapter';

describe('Contacts flow (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let mongod: MongoMemoryServer;
  let loanReadAdapter: InMemoryContactLoanReadAdapter;

  jest.setTimeout(60_000);

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();

    process.env.NODE_ENV = 'test';
    process.env.PORT = '3003';
    process.env.MONGODB_URI = mongod.getUri('emprestapp_contacts_test');
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
    loanReadAdapter = app.get(InMemoryContactLoanReadAdapter);
  });

  afterEach(async () => {
    loanReadAdapter.reset();
    await connection.dropDatabase();
  });

  afterAll(async () => {
    await connection.close(true);
    await app.close();
    await mongod.stop();
  });

  it('creates and lists contacts for the authenticated user', async () => {
    const session = await registerUser(app, 'owner@example.com');

    const createResponse = await request(app.getHttpServer())
      .post('/contacts')
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({
        fullName: 'John Smith',
        documentId: '12345678900',
        phone: '+5511999999999',
        notes: 'School friend',
      });

    expect(createResponse.status).toBe(201);
    expect(createResponse.body.data).toMatchObject({
      fullName: 'John Smith',
      documentId: '12345678900',
      phone: '+5511999999999',
      notes: 'School friend',
      status: 'active',
    });

    const listResponse = await request(app.getHttpServer())
      .get('/contacts?page=1&pageSize=20')
      .set('Authorization', `Bearer ${session.accessToken}`);

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toMatchObject({
      page: 1,
      pageSize: 20,
      total: 1,
    });
    expect(listResponse.body.data.items).toHaveLength(1);
  });

  it('retrieves and updates a contact for its owner', async () => {
    const session = await registerUser(app, 'owner@example.com');
    const created = await createContact(app, session.accessToken, 'John Smith');

    const detailResponse = await request(app.getHttpServer())
      .get(`/contacts/${created.id}`)
      .set('Authorization', `Bearer ${session.accessToken}`);

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.data.id).toBe(created.id);

    const updateResponse = await request(app.getHttpServer())
      .patch(`/contacts/${created.id}`)
      .set('Authorization', `Bearer ${session.accessToken}`)
      .send({
        phone: '+5511888888888',
      });

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data.phone).toBe('+5511888888888');
  });

  it('returns 403 when a user accesses another user contact', async () => {
    const owner = await registerUser(app, 'owner@example.com');
    const other = await registerUser(app, 'other@example.com');
    const created = await createContact(app, owner.accessToken, 'Private Contact');

    const response = await request(app.getHttpServer())
      .get(`/contacts/${created.id}`)
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

  it('archives and reactivates a contact', async () => {
    const session = await registerUser(app, 'owner@example.com');
    const created = await createContact(app, session.accessToken, 'John Smith');

    const archiveResponse = await request(app.getHttpServer())
      .post(`/contacts/${created.id}/archive`)
      .set('Authorization', `Bearer ${session.accessToken}`);

    expect(archiveResponse.status).toBe(200);
    expect(archiveResponse.body.data.status).toBe('archived');

    const reactivateResponse = await request(app.getHttpServer())
      .post(`/contacts/${created.id}/reactivate`)
      .set('Authorization', `Bearer ${session.accessToken}`);

    expect(reactivateResponse.status).toBe(200);
    expect(reactivateResponse.body.data.status).toBe('active');
  });

  it('returns CONTACT_HAS_ACTIVE_LOAN when archive is blocked by loan policy', async () => {
    const session = await registerUser(app, 'owner@example.com');
    const created = await createContact(app, session.accessToken, 'Blocked Contact');
    loanReadAdapter.setActiveLoanContacts([created.id]);

    const response = await request(app.getHttpServer())
      .post(`/contacts/${created.id}/archive`)
      .set('Authorization', `Bearer ${session.accessToken}`);

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      success: false,
      data: null,
      error: {
        code: 'CONTACT_HAS_ACTIVE_LOAN',
        message: 'Contact cannot be archived while it has an active loan',
        details: null,
      },
    });
  });

  it('returns CONTACT_HAS_LOAN_HISTORY when delete is blocked by loan policy', async () => {
    const session = await registerUser(app, 'owner@example.com');
    const created = await createContact(app, session.accessToken, 'History Contact');
    loanReadAdapter.setLoanHistoryContacts([created.id]);

    const response = await request(app.getHttpServer())
      .delete(`/contacts/${created.id}`)
      .set('Authorization', `Bearer ${session.accessToken}`);

    expect(response.status).toBe(422);
    expect(response.body).toEqual({
      success: false,
      data: null,
      error: {
        code: 'CONTACT_HAS_LOAN_HISTORY',
        message: 'Contact cannot be deleted while it has loan history',
        details: null,
      },
    });
  });

  it('deletes a contact when there is no loan history', async () => {
    const session = await registerUser(app, 'owner@example.com');
    const created = await createContact(app, session.accessToken, 'Delete Me');

    const response = await request(app.getHttpServer())
      .delete(`/contacts/${created.id}`)
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
      notes: 'School friend',
    });

  return response.body.data as { id: string };
};
