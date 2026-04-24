import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthTokenPayload } from '../auth/token.service';
import { ExportUserDataQueryDto } from './presentation/dto/export-user-data-query.dto';
import { UserExportService } from './application/user-export.service';
import {
  UserNotFoundError,
  UsersProfileComplianceService,
} from './application/users-profile-compliance.service';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersProfileComplianceService: UsersProfileComplianceService,
    private readonly userExportService: UserExportService,
  ) {}

  @Get('me')
  async me(@CurrentUser() user: AuthTokenPayload) {
    try {
      return await this.usersProfileComplianceService.getProfile(user.sub);
    } catch (error) {
      throw mapUserErrorToHttpException(error);
    }
  }

  @Get('me/export')
  async export(
    @CurrentUser() user: AuthTokenPayload,
    @Query() query: ExportUserDataQueryDto,
    @Res({ passthrough: true })
    response: { setHeader(name: string, value: string): void },
  ) {
    const format = query.format;

    if (format !== 'json' && format !== 'csv') {
      throw new BadRequestException({
        code: 'INVALID_EXPORT_FORMAT',
        message: 'Invalid export format',
      });
    }

    const file = await this.userExportService.export(user.sub, format);

    response.setHeader(
      'Content-Disposition',
      `attachment; filename="${file.fileName}"`,
    );

    return file;
  }

  @Delete('me')
  async deleteAccount(@CurrentUser() user: AuthTokenPayload) {
    try {
      return await this.usersProfileComplianceService.deleteAccount(user.sub);
    } catch (error) {
      throw mapUserErrorToHttpException(error);
    }
  }
}

const mapUserErrorToHttpException = (error: unknown): Error => {
  if (error instanceof UserNotFoundError) {
    return new NotFoundException({
      code: 'USER_NOT_FOUND',
      message: 'User not found',
    });
  }

  return error instanceof Error ? error : new Error('Unexpected user error');
};
