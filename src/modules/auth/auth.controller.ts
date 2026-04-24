import { Body, Controller, Post } from '@nestjs/common';

import { AuthApplicationService } from './application/auth.application.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { RegisterUserDto } from './dto/register-user.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authApplicationService: AuthApplicationService) {}

  @Post('register')
  register(@Body() input: RegisterUserDto) {
    return this.authApplicationService.register(input);
  }

  @Post('login')
  login(@Body() input: LoginDto) {
    return this.authApplicationService.login(input);
  }

  @Post('refresh')
  refresh(@Body() input: RefreshTokenDto) {
    return this.authApplicationService.refresh(input);
  }
}
