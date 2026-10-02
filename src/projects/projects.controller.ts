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
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMembersDto } from './dto/add-member.dto';
import { CurrentUser, Roles } from '../common';
import type { JwtPayload } from '../common/interfaces/jwt-payload.interface';
import { ProjectStatus, Role } from '@prisma/client';

@Controller('projects')
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  create(
    @Body() createProjectDto: CreateProjectDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.projectsService.create(createProjectDto, user.sub);
  }

  @Get()
  findAll(
    @Query('status') status?: ProjectStatus,
    @Query('search') search?: string,
    @Query('creatorId') creatorId?: string,
    @Query('memberId') memberId?: string,
  ) {
    return this.projectsService.findAll({ status, search, creatorId, memberId });
  }

  @Get('my-projects')
  getMyProjects(@CurrentUser() user: JwtPayload) {
    return this.projectsService.getMyProjects(user.sub);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.projectsService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() updateProjectDto: UpdateProjectDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.projectsService.update(id, updateProjectDto, user.sub, user.role);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.projectsService.remove(id, user.sub, user.role);
  }

  @Post(':id/members')
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  addMembers(
    @Param('id') id: string,
    @Body() addMembersDto: AddMembersDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.projectsService.addMembers(id, addMembersDto, user.sub, user.role);
  }

  @Delete(':id/members/:memberId')
  @Roles(Role.ADMIN, Role.PROJECT_MANAGER)
  removeMember(
    @Param('id') id: string,
    @Param('memberId') memberId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.projectsService.removeMember(id, memberId, user.sub, user.role);
  }
}
