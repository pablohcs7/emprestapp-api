import { Controller, Get, ServiceUnavailableException } from '@nestjs/common';
import { InjectConnection } from '@nestjs/mongoose';
import { Connection } from 'mongoose';

@Controller('health')
export class HealthController {
  constructor(@InjectConnection() private readonly connection: Connection) {}

  @Get()
  async check() {
    if (process.env.NODE_ENV === 'test') {
      return {
        status: 'ok',
      };
    }

    try {
      if (!this.connection.db) {
        throw new Error('Database connection not initialized');
      }

      await this.connection.db.admin().ping();
    } catch {
      throw new ServiceUnavailableException('Database unavailable');
    }

    return {
      status: 'ok',
    };
  }
}
