import { forwardRef, Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { AuthModule } from '../auth/auth.module';
import { ContactLifecyclePolicyService } from './application/contact-lifecycle-policy.service';
import { ContactsApplicationService } from './application/contacts.application.service';
import { ContactsController } from './contacts.controller';
import { ContactLoanReadPort } from './domain/contact-loan-read.port';
import { ContactRepository } from './domain/contact.repository';
import { InMemoryContactLoanReadAdapter } from './infrastructure/in-memory-contact-loan-read.adapter';
import { MongooseContactRepository } from './infrastructure/persistence/contact.repository';
import { ContactDocument, contactSchema } from './infrastructure/persistence/contact.schema';

@Module({
  imports: [
    forwardRef(() => AuthModule),
    MongooseModule.forFeature([
      {
        name: ContactDocument.name,
        schema: contactSchema,
      },
    ]),
  ],
  controllers: [ContactsController],
  providers: [
    ContactsApplicationService,
    ContactLifecyclePolicyService,
    MongooseContactRepository,
    InMemoryContactLoanReadAdapter,
    {
      provide: ContactRepository,
      useClass: MongooseContactRepository,
    },
    {
      provide: ContactLoanReadPort,
      useExisting: InMemoryContactLoanReadAdapter,
    },
  ],
  exports: [
    ContactRepository,
    ContactLoanReadPort,
    InMemoryContactLoanReadAdapter,
  ],
})
export class ContactsModule {}
