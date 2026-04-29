import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { AuthPersistenceModule } from '../auth/infrastructure/auth-persistence.module';
import { ContactsModule } from '../contacts/contacts.module';
import { LoansModule } from '../loans/loans.module';
import { PaymentsModule } from '../payments/payments.module';
import { UserRepository } from './domain/user.repository';
import { UserExportService } from './application/user-export.service';
import { UsersProfileComplianceService } from './application/users-profile-compliance.service';
import { MongooseUserRepository } from './infrastructure/persistence/user.repository';
import { userSchema, UserDocument } from './infrastructure/persistence/user.schema';
import { UsersController } from './users.controller';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    AuthPersistenceModule,
    forwardRef(() => ContactsModule),
    forwardRef(() => LoansModule),
    forwardRef(() => PaymentsModule),
    MongooseModule.forFeature([
      {
        name: UserDocument.name,
        schema: userSchema,
      },
    ]),
  ],
  controllers: [UsersController],
  providers: [
    MongooseUserRepository,
    UserExportService,
    UsersProfileComplianceService,
    {
      provide: UserRepository,
      useClass: MongooseUserRepository,
    },
  ],
  exports: [
    UserRepository,
    MongooseUserRepository,
    UserExportService,
    UsersProfileComplianceService,
  ],
})
export class UsersModule {}
