import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';

import { UserRepository } from './domain/user.repository';
import { MongooseUserRepository } from './infrastructure/persistence/user.repository';
import { userSchema, UserDocument } from './infrastructure/persistence/user.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      {
        name: UserDocument.name,
        schema: userSchema,
      },
    ]),
  ],
  providers: [
    MongooseUserRepository,
    {
      provide: UserRepository,
      useClass: MongooseUserRepository,
    },
  ],
  exports: [UserRepository, MongooseUserRepository],
})
export class UsersModule {}
