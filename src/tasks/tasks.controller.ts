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
import { TasksService } from './tasks.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { CurrentUser, Roles } from '../common';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { TaskStatus, TaskPriority, Role } from '@prisma/client';

@Controller('tasks')
export class TasksController {
  constructor(private readonly tasksService: TasksService) {}

  @Post()
  create(
    @Body() createTaskDto: CreateTaskDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasksService.create(createTaskDto, user.sub);
  }

  @Get()
  findAll(
    @Query('projectId') projectId?: string,
    @Query('status') status?: TaskStatus,
    @Query('priority') priority?: TaskPriority,
    @Query('assigneeId') assigneeId?: string,
    @Query('creatorId') creatorId?: string,
    @Query('search') search?: string,
  ) {
    return this.tasksService.findAll({
      projectId,
      status,
      priority,
      assigneeId,
      creatorId,
      search,
    });
  }

  @Get('my-tasks')
  getMyTasks(@CurrentUser() user: JwtPayload) {
    return this.tasksService.getMyTasks(user.sub);
  }

  @Get('project/:projectId')
  getTasksByProject(@Param('projectId') projectId: string) {
    return this.tasksService.getTasksByProject(projectId);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.tasksService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateTaskDto: UpdateTaskDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasksService.update(id, updateTaskDto, user.sub, user.role);
  }

  @Patch(':id/status')
  updateStatus(
    @Param('id') id: string,
    @Body() updateTaskStatusDto: UpdateTaskStatusDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasksService.updateStatus(id, updateTaskStatusDto, user.sub, user.role);
  }

  @Patch(':id/assign/:assigneeId')
  assignTask(
    @Param('id') id: string,
    @Param('assigneeId') assigneeId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasksService.assignTask(id, assigneeId, user.sub, user.role);
  }

  @Patch(':id/unassign')
  unassignTask(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.tasksService.unassignTask(id, user.sub, user.role);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.tasksService.remove(id, user.sub, user.role);
  }
}
