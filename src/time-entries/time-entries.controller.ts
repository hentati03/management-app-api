import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  Query,
} from '@nestjs/common';
import { TimeEntriesService } from './time-entries.service';
import { CreateTimeEntryDto, UpdateTimeEntryDto } from './dto';
import { CurrentUser, Roles } from '../common';
import type { User } from '@prisma/client';
import { Role } from '@prisma/client';

@Controller('time-entries')
export class TimeEntriesController {
  constructor(private readonly timeEntriesService: TimeEntriesService) {}

  @Post()
  create(
    @Body() createTimeEntryDto: CreateTimeEntryDto,
    @CurrentUser() user: User,
  ) {
    return this.timeEntriesService.create(createTimeEntryDto, user.id);
  }

  @Get()
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  findAll(
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.timeEntriesService.findAll(startDate, endDate);
  }

  @Get('my')
  findMyTimeEntries(@CurrentUser() user: User) {
    return this.timeEntriesService.findMyTimeEntries(user.id);
  }

  @Get('my-entries')
  findMyEntriesWithFilter(
    @CurrentUser() user: User,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.timeEntriesService.findByDateRange(
      user.id,
      startDate || '',
      endDate || '',
      user.role,
    );
  }

  @Get('task/:taskId')
  findByTask(@Param('taskId') taskId: string) {
    return this.timeEntriesService.findByTask(taskId);
  }

  @Get('user/:userId')
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  findByUser(
    @Param('userId') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.timeEntriesService.findByUser(userId, startDate, endDate);
  }

  @Get('project/:projectId')
  findByProject(@Param('projectId') projectId: string) {
    return this.timeEntriesService.findByProject(projectId);
  }

  @Get('date-range')
  findByDateRange(
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @CurrentUser() user: User,
  ) {
    return this.timeEntriesService.findByDateRange(
      user.id,
      startDate,
      endDate,
      user.role,
    );
  }

  @Get('task/:taskId/total')
  getTaskTotalTime(@Param('taskId') taskId: string) {
    return this.timeEntriesService.getTaskTotalTime(taskId);
  }

  @Get('user/:userId/total')
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  getUserTotalTime(
    @Param('userId') userId: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.timeEntriesService.getUserTotalTime(userId, startDate, endDate);
  }

  @Get('my/total')
  getMyTotalTime(
    @CurrentUser() user: User,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    return this.timeEntriesService.getUserTotalTime(user.id, startDate, endDate);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.timeEntriesService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTimeEntryDto: UpdateTimeEntryDto,
    @CurrentUser() user: User,
  ) {
    return this.timeEntriesService.update(
      id,
      updateTimeEntryDto,
      user.id,
      user.role,
    );
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: User) {
    return this.timeEntriesService.remove(id, user.id, user.role);
  }
}
