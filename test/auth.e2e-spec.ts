import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Connection } from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import request from 'supertest';

describe('Auth flow (e2e)', () => {
  let app: INestApplication;
  let connection: Connection;
  let mongod: MongoMemoryServer;

  jest.setTimeout(60_000);

  beforeAll(async () => {
    mongod = await MongoMemoryServer.create();

    process.env.NODE_ENV = 'test';
    process.env.PORT = '3002';
    process.env.MONGODB_URI = mongod.getUri('emprestapp_test');
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

  it('registers a user and returns an authenticated session', async () => {
    const response = await request(app.getHttpServer()).post('/auth/register').send({
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      password: 'Strong#123',
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user).toMatchObject({
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      status: 'active',
    });
    expect(response.body.data.session).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      expiresAt: expect.any(String),
    });
  });

  it('logs in an existing user and returns a fresh session', async () => {
    await request(app.getHttpServer()).post('/auth/register').send({
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      password: 'Strong#123',
    });

    const response = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'jane@example.com',
      password: 'Strong#123',
    });

    expect(response.status).toBe(201);
    expect(response.body.success).toBe(true);
    expect(response.body.data.user.email).toBe('jane@example.com');
    expect(response.body.data.session.refreshToken).toEqual(expect.any(String));
  });

  it('rotates refresh tokens for an existing session', async () => {
    const registerResponse = await request(app.getHttpServer())
      .post('/auth/register')
      .send({
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        password: 'Strong#123',
      });

    const refreshResponse = await request(app.getHttpServer())
      .post('/auth/refresh')
      .send({
        refreshToken: registerResponse.body.data.session.refreshToken,
      });

    expect(refreshResponse.status).toBe(201);
    expect(refreshResponse.body.success).toBe(true);
    expect(refreshResponse.body.data).toMatchObject({
      accessToken: expect.any(String),
      refreshToken: expect.any(String),
      expiresAt: expect.any(String),
    });
    expect(refreshResponse.body.data.refreshToken).not.toBe(
      registerResponse.body.data.session.refreshToken,
    );
  });

  it('rejects login with invalid credentials', async () => {
    await request(app.getHttpServer()).post('/auth/register').send({
      fullName: 'Jane Doe',
      email: 'jane@example.com',
      password: 'Strong#123',
    });

    const response = await request(app.getHttpServer()).post('/auth/login').send({
      email: 'jane@example.com',
      password: 'Wrong#123',
    });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({
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
