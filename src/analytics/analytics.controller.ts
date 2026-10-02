import { Controller, Get, Param, Query } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { CurrentUser, Roles } from '../common';
import type { User } from '@prisma/client';
import { Role } from '@prisma/client';

@Controller('analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('dashboard')
  getDashboard(@CurrentUser() user: User) {
    return this.analyticsService.getDashboardStats(user.id, user.role);
  }

  @Get('project/:projectId')
  getProjectAnalytics(@Param('projectId') projectId: string) {
    return this.analyticsService.getProjectAnalytics(projectId);
  }

  @Get('user/:userId/workload')
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  getUserWorkload(@Param('userId') userId: string) {
    return this.analyticsService.getUserWorkload(userId);
  }

  @Get('my/workload')
  getMyWorkload(@CurrentUser() user: User) {
    return this.analyticsService.getUserWorkload(user.id);
  }

  @Get('team/performance')
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  getTeamPerformance() {
    return this.analyticsService.getTeamPerformance();
  }

  @Get('time-report')
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  getTimeReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Query('userId') userId?: string,
  ) {
    return this.analyticsService.getTimeReport(startDate, endDate, userId);
  }

  @Get('my/time-report')
  getMyTimeReport(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: User,
  ) {
    return this.analyticsService.getTimeReport(startDate, endDate, user.id);
  }

  @Get('productivity/trends')
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  getProductivityTrends(
    @Query('weeks') weeks?: string,
    @Query('userId') userId?: string,
  ) {
    return this.analyticsService.getProductivityTrends(
      weeks ? parseInt(weeks) : 4,
      userId,
    );
  }

  @Get('my/productivity/trends')
  getMyProductivityTrends(
    @Query('weeks') weeks?: string,
    @CurrentUser() user?: User,
  ) {
    return this.analyticsService.getProductivityTrends(
      weeks ? parseInt(weeks) : 4,
      user?.id,
    );
  }
}
