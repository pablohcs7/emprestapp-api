import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';

import { AppConfig } from '../../config/config.types';

@Injectable()
export class PasswordService {
  constructor(private readonly configService: ConfigService<AppConfig>) {}

  async hash(password: string): Promise<string> {
    return Promise.resolve(bcrypt.hashSync(password, this.getSaltRounds()));
  }

  async verify(password: string, passwordHash: string): Promise<boolean> {
    return Promise.resolve(bcrypt.compareSync(password, passwordHash));
  }

  private getSaltRounds(): number {
    const authConfig = this.configService.getOrThrow<AppConfig['auth']>('auth');

    if (!Number.isInteger(authConfig.bcryptSaltRounds) || authConfig.bcryptSaltRounds < 8) {
      throw new Error('Invalid bcrypt configuration');
    }

    return authConfig.bcryptSaltRounds;
  }
}
