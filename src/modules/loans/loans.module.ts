import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { ContactsModule } from '../contacts/contacts.module';
import { LoanLifecyclePolicyService } from './application/loan-lifecycle-policy.service';
import { LoansReadService } from './application/loans-read.service';
import { LoansApplicationService } from './application/loans.application.service';
import { InstallmentRepository } from './domain/installment.repository';
import { LoanCalculationService } from './domain/loan-calculation.service';
import { LoanPaymentReadPort } from './domain/loan-payment-read.port';
import { LoanRepository } from './domain/loan.repository';
import { InMemoryLoanPaymentReadAdapter } from './infrastructure/in-memory-loan-payment-read.adapter';
import { MongooseInstallmentRepository } from './infrastructure/persistence/installment.repository';
import { InstallmentDocument, installmentSchema } from './infrastructure/persistence/installment.schema';
import { MongooseLoanRepository } from './infrastructure/persistence/loan.repository';
import { LoanDocument, loanSchema } from './infrastructure/persistence/loan.schema';
import { LoansController } from './loans.controller';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    ContactsModule,
    MongooseModule.forFeature([
      {
        name: LoanDocument.name,
        schema: loanSchema,
      },
      {
        name: InstallmentDocument.name,
        schema: installmentSchema,
      },
    ]),
  ],
  controllers: [LoansController],
  providers: [
    LoanCalculationService,
    LoansApplicationService,
    LoansReadService,
    LoanLifecyclePolicyService,
    MongooseLoanRepository,
    MongooseInstallmentRepository,
    InMemoryLoanPaymentReadAdapter,
    {
      provide: LoanRepository,
      useClass: MongooseLoanRepository,
    },
    {
      provide: InstallmentRepository,
      useClass: MongooseInstallmentRepository,
    },
    {
      provide: LoanPaymentReadPort,
      useExisting: InMemoryLoanPaymentReadAdapter,
    },
  ],
  exports: [
    LoanRepository,
    InstallmentRepository,
    LoanPaymentReadPort,
    InMemoryLoanPaymentReadAdapter,
  ],
})
export class LoansModule {}
