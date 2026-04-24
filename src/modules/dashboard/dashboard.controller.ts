import {
  Controller,
  Get,
  UseGuards,
  Query,
} from '@nestjs/common';

import { CurrentUser } from '../auth/current-user.decorator';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AuthTokenPayload } from '../auth/token.service';
import { DashboardHistoryService } from './application/dashboard-history.service';
import { DashboardSummaryService } from './application/dashboard-summary.service';
import { ListDashboardHistoryQueryDto } from './presentation/dto/list-dashboard-history-query.dto';

@UseGuards(JwtAuthGuard)
@Controller('dashboard')
export class DashboardController {
  constructor(
    private readonly dashboardSummaryService: DashboardSummaryService,
    private readonly dashboardHistoryService: DashboardHistoryService,
  ) {}

  @Get('summary')
  summary(@CurrentUser() user: AuthTokenPayload) {
    return this.dashboardSummaryService.getSummary(user.sub);
  }

  @Get('history')
  history(
    @CurrentUser() user: AuthTokenPayload,
    @Query() query: ListDashboardHistoryQueryDto,
  ) {
    return this.dashboardHistoryService.list(user.sub, {
      status: query.status,
      contactId: query.contactId,
      dueDateFrom: query.dueDateFrom ? new Date(query.dueDateFrom) : undefined,
      dueDateTo: query.dueDateTo ? new Date(query.dueDateTo) : undefined,
      periodFrom: query.periodFrom ? new Date(query.periodFrom) : undefined,
      periodTo: query.periodTo ? new Date(query.periodTo) : undefined,
      page: query.page,
      pageSize: query.pageSize,
    });
  }
}
