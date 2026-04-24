import { INestApplication, ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { ConfigService } from '@nestjs/config';

import { AppModule } from './app.module';
import { GlobalHttpExceptionFilter } from './common/errors/global-http-exception.filter';
import { ApiEnvelopeInterceptor } from './common/http/api-envelope.interceptor';
import { AppConfig } from './config/config.types';

export const configureApp = (app: INestApplication): void => {
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
