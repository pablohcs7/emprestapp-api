import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { MongooseModule } from '@nestjs/mongoose';

import { buildMongoConnectionOptions } from './common/database/mongoose.helpers';
import { AppConfig } from './config/config.types';
import { RuntimeConfigModule } from './config/runtime-config.module';
import { HealthController } from './health.controller';
import { AuthModule } from './modules/auth/auth.module';
import { ContactsModule } from './modules/contacts/contacts.module';
import { DashboardModule } from './modules/dashboard/dashboard.module';
import { LoansModule } from './modules/loans/loans.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { UsersModule } from './modules/users/users.module';

@Module({
  controllers: [HealthController],
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
    LoansModule,
    PaymentsModule,
    DashboardModule,
    UsersModule,
  ],
})
export class AppModule {}
