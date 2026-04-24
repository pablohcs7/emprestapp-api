import { Module } from '@nestjs/common';

import { AuthPersistenceModule } from './infrastructure/auth-persistence.module';
import { AuthApplicationService } from './application/auth.application.service';
import { AuthController } from './auth.controller';
import { AuthTokenService } from './token.service';
import { PasswordService } from './password.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [UsersModule, AuthPersistenceModule],
  controllers: [AuthController],
  providers: [AuthApplicationService, AuthTokenService, PasswordService],
  exports: [AuthApplicationService, AuthTokenService],
})
export class AuthModule {}
