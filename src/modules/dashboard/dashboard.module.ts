import { forwardRef, Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ContactsModule } from '../contacts/contacts.module';
import { LoansModule } from '../loans/loans.module';
import { PaymentsModule } from '../payments/payments.module';
import { UsersModule } from '../users/users.module';
import { DashboardHistoryService } from './application/dashboard-history.service';
import { DashboardSummaryService } from './application/dashboard-summary.service';
import { DashboardController } from './dashboard.controller';

@Module({
  imports: [
    AuthModule,
    ContactsModule,
    LoansModule,
    PaymentsModule,
    forwardRef(() => UsersModule),
  ],
  controllers: [DashboardController],
  providers: [DashboardSummaryService, DashboardHistoryService],
})
export class DashboardModule {}
