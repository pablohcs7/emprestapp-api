import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { RefreshSessionRepository } from '../domain/refresh-session.repository';
import {
  RefreshSessionDocument,
  refreshSessionSchema,
} from './persistence/refresh-session.schema';
import { MongooseRefreshSessionRepository } from './persistence/refresh-session.repository';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: RefreshSessionDocument.name,
        schema: refreshSessionSchema,
      },
    ]),
  ],
  providers: [
    MongooseRefreshSessionRepository,
    {
      provide: RefreshSessionRepository,
      useClass: MongooseRefreshSessionRepository,
    },
  ],
  exports: [RefreshSessionRepository, MongooseRefreshSessionRepository],
})
export class AuthPersistenceModule {}
