import { INestApplication, ValidationPipe } from '@nestjs/common';
import type { CorsOptions } from '@nestjs/common/interfaces/external/cors-options.interface';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from './common/errors/global-http-exception.filter';
import { ApiEnvelopeInterceptor } from './common/http/api-envelope.interceptor';
import { attachHttpObservability } from './common/http/http-observability';
import {
  attachAuthRateLimit,
  attachSecurityHeaders,
} from './common/http/security.middleware';
import { AppConfig } from './config/config.types';

export const configureApp = (app: INestApplication): void => {
  const corsOptions: CorsOptions = {
    origin: (origin: string | undefined, callback: (error: Error | null, allow?: boolean) => void) => {
      if (!origin) {
        callback(null, true);
        return;
      }

      const isLocalhostOrigin =
        /^http:\/\/localhost:\d+$/.test(origin) ||
        /^http:\/\/127\.0\.0\.1:\d+$/.test(origin);

      callback(isLocalhostOrigin ? null : new Error('Not allowed by CORS'), isLocalhostOrigin);
    },
    credentials: true,
  };

  app.enableCors(corsOptions);
  app.getHttpAdapter().getInstance().disable('x-powered-by');
  app.use(attachSecurityHeaders);
  app.use(attachAuthRateLimit);
  app.use(attachHttpObservability);

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.useGlobalInterceptors(new ApiEnvelopeInterceptor());
  app.useGlobalFilters(new GlobalHttpExceptionFilter());
};

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  configureApp(app);

  const configService = app.get(ConfigService<AppConfig>);
  const port = configService.getOrThrow<AppConfig['app']>('app').port;

  await app.listen(port);
}

if (require.main === module) {
  void bootstrap();
}
