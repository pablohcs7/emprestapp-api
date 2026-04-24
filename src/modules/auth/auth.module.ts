import { forwardRef, Module } from '@nestjs/common';

import { AuthPersistenceModule } from './infrastructure/auth-persistence.module';
import { AuthApplicationService } from './application/auth.application.service';
import { AuthController } from './auth.controller';
import { AuthTokenService } from './token.service';
import { PasswordService } from './password.service';
import { UsersModule } from '../users/users.module';
import { JwtAuthGuard } from './jwt-auth.guard';

@Module({
  imports: [forwardRef(() => UsersModule), AuthPersistenceModule],
  controllers: [AuthController],
  providers: [
    AuthApplicationService,
    AuthTokenService,
    PasswordService,
    JwtAuthGuard,
  ],
  exports: [AuthApplicationService, AuthTokenService, JwtAuthGuard],
})
export class AuthModule {}
