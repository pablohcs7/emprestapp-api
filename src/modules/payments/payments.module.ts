import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { LoanCalculationService } from '../loans/domain/loan-calculation.service';
import { LoansModule } from '../loans/loans.module';
import { UsersModule } from '../users/users.module';
import { PaymentRecalculationService } from './application/payment-recalculation.service';
import { PaymentsApplicationService } from './application/payments.application.service';
import { PaymentsReadService } from './application/payments-read.service';
import { PaymentRepository } from './domain/payment.repository';
import { MongoosePaymentRepository } from './infrastructure/persistence/payment.repository';
import { paymentSchema, PaymentDocument } from './infrastructure/persistence/payment.schema';
import { PaymentsController } from './payments.controller';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    LoansModule,
    forwardRef(() => UsersModule),
    MongooseModule.forFeature([
      {
        name: PaymentDocument.name,
        schema: paymentSchema,
      },
    ]),
  ],
  controllers: [PaymentsController],
  providers: [
    LoanCalculationService,
    PaymentRecalculationService,
    PaymentsApplicationService,
    PaymentsReadService,
    MongoosePaymentRepository,
    {
      provide: PaymentRepository,
      useClass: MongoosePaymentRepository,
    },
  ],
  exports: [PaymentRepository],
})
export class PaymentsModule {}
