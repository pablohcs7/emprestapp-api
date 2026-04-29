import { INestApplication } from '@nestjs/common';
import { getConnectionToken } from '@nestjs/mongoose';
import { Test } from '@nestjs/testing';
import { Connection } from 'mongoose';
import request from 'supertest';

describe('App bootstrap (e2e)', () => {
  let app: INestApplication;

  jest.setTimeout(30000);

  beforeAll(async () => {
    process.env.NODE_ENV = 'test';
    process.env.PORT = '3001';
    process.env.MONGODB_URI = 'mongodb://localhost:27017/emprestapp_test';
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
  });

  afterAll(async () => {
    if (app) {
      const connection = app.get<Connection>(getConnectionToken(), {
        strict: false,
      });

      if (connection) {
        await connection.close(true);
      }

      await app.close();
    }
  });

  it('starts successfully with the global http layer enabled', async () => {
    const response = await request(app.getHttpServer()).get('/__missing_route__');

    expect(response.status).toBe(404);
    expect(response.body).toEqual({
      success: false,
      data: null,
      error: {
        code: 'NOT_FOUND',
        message: 'Cannot GET /__missing_route__',
        details: null,
      },
    });
  });

  it('returns a health payload through the standard envelope', async () => {
    const response = await request(app.getHttpServer()).get('/health');

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      success: true,
      data: {
        status: 'ok',
      },
      error: null,
    });
  });
});
