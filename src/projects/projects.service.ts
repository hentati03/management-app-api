import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { AddMembersDto } from './dto/add-member.dto';
import { ProjectStatus, Role } from '@prisma/client';

@Injectable()
export class ProjectsService {
  constructor(private prisma: PrismaService) {}

  async create(createProjectDto: CreateProjectDto, creatorId: string) {
    const { memberIds, startDate, endDate, ...rest } = createProjectDto;

    const project = await this.prisma.project.create({
      data: {
        ...rest,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        creatorId,
        memberIds: memberIds || [],
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        members: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // Update users' projectIds
    if (memberIds && memberIds.length > 0) {
      await this.prisma.user.updateMany({
        where: { id: { in: memberIds } },
        data: {
          projectIds: { push: project.id },
        },
      });
    }

    return project;
  }

  async findAll(options?: {
    status?: ProjectStatus;
    search?: string;
    creatorId?: string;
    memberId?: string;
  }) {
    const where: any = {};

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.search) {
      where.OR = [
        { name: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    if (options?.creatorId) {
      where.creatorId = options.creatorId;
    }

    if (options?.memberId) {
      where.memberIds = { has: options.memberId };
    }

    const projects = await this.prisma.project.findMany({
      where,
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        members: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        tasks: {
          select: {
            id: true,
            status: true,
          },
        },
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return projects;
  }

  async findOne(id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        members: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            dueDate: true,
            assigneeId: true,
          },
        },
        _count: {
          select: { tasks: true, chatMessages: true },
        },
      },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    return project;
  }

  async update(
    id: string,
    updateProjectDto: UpdateProjectDto,
    userId: string,
    userRole: Role,
  ) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    // Only creator, project managers, or admins can update
    const canUpdate =
      userRole === Role.ADMIN ||
      userRole === Role.PROJECT_MANAGER ||
      project.creatorId === userId;

    if (!canUpdate) {
      throw new ForbiddenException('You do not have permission to update this project');
    }

    const { memberIds, startDate, endDate, ...rest } = updateProjectDto;

    const updatedProject = await this.prisma.project.update({
      where: { id },
      data: {
        ...rest,
        startDate: startDate ? new Date(startDate) : undefined,
        endDate: endDate ? new Date(endDate) : undefined,
        ...(memberIds && { memberIds }),
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        members: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    return updatedProject;
  }

  async remove(id: string, userId: string, userRole: Role) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    // Only creator or admins can delete
    const canDelete = userRole === Role.ADMIN || project.creatorId === userId;

    if (!canDelete) {
      throw new ForbiddenException('You do not have permission to delete this project');
    }

    await this.prisma.project.delete({
      where: { id },
    });

    return { message: 'Project deleted successfully' };
  }

  async addMembers(id: string, addMembersDto: AddMembersDto, userId: string, userRole: Role) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    // Only creator, project managers, or admins can add members
    const canManageMembers =
      userRole === Role.ADMIN ||
      userRole === Role.PROJECT_MANAGER ||
      project.creatorId === userId;

    if (!canManageMembers) {
      throw new ForbiddenException('You do not have permission to manage project members');
    }

    // Filter out already existing members
    const newMemberIds = addMembersDto.memberIds.filter(
      (memberId) => !project.memberIds.includes(memberId),
    );

    if (newMemberIds.length === 0) {
      return this.findOne(id);
    }

    const updatedProject = await this.prisma.project.update({
      where: { id },
      data: {
        memberIds: { push: newMemberIds },
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        members: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // Update users' projectIds
    await this.prisma.user.updateMany({
      where: { id: { in: newMemberIds } },
      data: {
        projectIds: { push: id },
      },
    });

    return updatedProject;
  }

  async removeMember(id: string, memberId: string, userId: string, userRole: Role) {
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${id} not found`);
    }

    // Only creator, project managers, or admins can remove members
    const canManageMembers =
      userRole === Role.ADMIN ||
      userRole === Role.PROJECT_MANAGER ||
      project.creatorId === userId;

    if (!canManageMembers) {
      throw new ForbiddenException('You do not have permission to manage project members');
    }

    // Remove member from project
    const updatedMemberIds = project.memberIds.filter((id) => id !== memberId);

    const updatedProject = await this.prisma.project.update({
      where: { id },
      data: {
        memberIds: updatedMemberIds,
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        members: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
      },
    });

    // Remove project from user's projectIds
    const user = await this.prisma.user.findUnique({
      where: { id: memberId },
    });

    if (user) {
      const updatedProjectIds = user.projectIds.filter((pId) => pId !== id);
      await this.prisma.user.update({
        where: { id: memberId },
        data: { projectIds: updatedProjectIds },
      });
    }

    return updatedProject;
  }

  async getMyProjects(userId: string) {
    return this.prisma.project.findMany({
      where: {
        OR: [
          { creatorId: userId },
          { memberIds: { has: userId } },
        ],
      },
      include: {
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        members: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        tasks: {
          select: {
            id: true,
            status: true,
          },
        },
        _count: {
          select: { tasks: true },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
