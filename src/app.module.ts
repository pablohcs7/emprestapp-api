import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { buildMongoConnectionOptions } from './common/database/mongoose.helpers';
import { AppConfig } from './config/config.types';
import { RuntimeConfigModule } from './config/runtime-config.module';
import { AuthModule } from './modules/auth/auth.module';
import { ContactsModule } from './modules/contacts/contacts.module';

@Module({
  imports: [
    RuntimeConfigModule,
    MongooseModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (configService: ConfigService<AppConfig>) => {
        const database = configService.getOrThrow<AppConfig['database']>('database');

        return {
          ...buildMongoConnectionOptions({ database }),
          lazyConnection: true,
          retryAttempts: 0,
        };
      },
    }),
    AuthModule,
    ContactsModule,
  ],
})
export class AppModule {}
