import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { appConfigFactory } from './app.config';
import { validateEnvironment } from './env.validation';

@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      cache: true,
      expandVariables: true,
      load: [appConfigFactory],
      validate: validateEnvironment,
    }),
  ],
})
export class RuntimeConfigModule {}
