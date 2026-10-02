import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { UpdateTaskStatusDto } from './dto/update-task-status.dto';
import { TaskStatus, TaskPriority, Role } from '@prisma/client';

@Injectable()
export class TasksService {
  constructor(private prisma: PrismaService) {}

  async create(createTaskDto: CreateTaskDto, creatorId: string) {
    const { dueDate, projectId, ...rest } = createTaskDto;

    // Verify project exists
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    const task = await this.prisma.task.create({
      data: {
        ...rest,
        dueDate: dueDate ? new Date(dueDate) : undefined,
        projectId,
        creatorId,
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        creator: {
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

    return task;
  }

  async findAll(options?: {
    projectId?: string;
    status?: TaskStatus;
    priority?: TaskPriority;
    assigneeId?: string;
    creatorId?: string;
    search?: string;
  }) {
    const where: any = {};

    if (options?.projectId) {
      where.projectId = options.projectId;
    }

    if (options?.status) {
      where.status = options.status;
    }

    if (options?.priority) {
      where.priority = options.priority;
    }

    if (options?.assigneeId) {
      where.assigneeId = options.assigneeId;
    }

    if (options?.creatorId) {
      where.creatorId = options.creatorId;
    }

    if (options?.search) {
      where.OR = [
        { title: { contains: options.search, mode: 'insensitive' } },
        { description: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const tasks = await this.prisma.task.findMany({
      where,
      include: {
        project: {
          select: { id: true, name: true },
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        _count: {
          select: { comments: true, timeEntries: true },
        },
      },
      orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
    });

    return tasks;
  }

  async findOne(id: string) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: {
        project: {
          select: { id: true, name: true },
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        comments: {
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                avatar: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        timeEntries: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
              },
            },
          },
          orderBy: { startTime: 'desc' },
        },
        _count: {
          select: { comments: true, timeEntries: true },
        },
      },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    return task;
  }

  async update(
    id: string,
    updateTaskDto: UpdateTaskDto,
    userId: string,
    userRole: Role,
  ) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // Check permissions: creator, assignee, project member, project creator, admin, or PM can update
    const canUpdate =
      userRole === Role.ADMIN ||
      userRole === Role.PROJECT_MANAGER ||
      task.creatorId === userId ||
      task.assigneeId === userId ||
      task.project.creatorId === userId ||
      task.project.memberIds.includes(userId);

    if (!canUpdate) {
      throw new ForbiddenException('You do not have permission to update this task');
    }

    const { dueDate, ...rest } = updateTaskDto;

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: {
        ...rest,
        ...(dueDate && { dueDate: new Date(dueDate) }),
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true,
          },
        },
        creator: {
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

    return updatedTask;
  }

  async updateStatus(
    id: string,
    updateTaskStatusDto: UpdateTaskStatusDto,
    userId: string,
    userRole: Role,
  ) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // Check permissions
    const canUpdate =
      userRole === Role.ADMIN ||
      userRole === Role.PROJECT_MANAGER ||
      task.creatorId === userId ||
      task.assigneeId === userId ||
      task.project.creatorId === userId;

    if (!canUpdate) {
      throw new ForbiddenException('You do not have permission to update this task');
    }

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: { status: updateTaskStatusDto.status },
      include: {
        project: {
          select: { id: true, name: true },
        },
        assignee: {
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

    return updatedTask;
  }

  async assignTask(id: string, assigneeId: string, userId: string, userRole: Role) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // Check permissions
    const canAssign =
      userRole === Role.ADMIN ||
      userRole === Role.PROJECT_MANAGER ||
      task.creatorId === userId ||
      task.project.creatorId === userId;

    if (!canAssign) {
      throw new ForbiddenException('You do not have permission to assign this task');
    }

    // Verify assignee exists
    const assignee = await this.prisma.user.findUnique({
      where: { id: assigneeId },
    });

    if (!assignee) {
      throw new NotFoundException(`User with ID ${assigneeId} not found`);
    }

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: { assigneeId },
      include: {
        project: {
          select: { id: true, name: true },
        },
        assignee: {
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

    return updatedTask;
  }

  async unassignTask(id: string, userId: string, userRole: Role) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // Check permissions
    const canUnassign =
      userRole === Role.ADMIN ||
      userRole === Role.PROJECT_MANAGER ||
      task.creatorId === userId ||
      task.project.creatorId === userId;

    if (!canUnassign) {
      throw new ForbiddenException('You do not have permission to unassign this task');
    }

    const updatedTask = await this.prisma.task.update({
      where: { id },
      data: { assigneeId: null },
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    });

    return updatedTask;
  }

  async remove(id: string, userId: string, userRole: Role) {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { project: true },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${id} not found`);
    }

    // Only creator, project creator, or admin can delete
    const canDelete =
      userRole === Role.ADMIN ||
      task.creatorId === userId ||
      task.project.creatorId === userId;

    if (!canDelete) {
      throw new ForbiddenException('You do not have permission to delete this task');
    }

    await this.prisma.task.delete({
      where: { id },
    });

    return { message: 'Task deleted successfully' };
  }

  async getMyTasks(userId: string) {
    return this.prisma.task.findMany({
      where: {
        OR: [{ assigneeId: userId }, { creatorId: userId }],
      },
      include: {
        project: {
          select: { id: true, name: true },
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        _count: {
          select: { comments: true },
        },
      },
      orderBy: [{ status: 'asc' }, { priority: 'desc' }, { dueDate: 'asc' }],
    });
  }

  async getTasksByProject(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException(`Project with ID ${projectId} not found`);
    }

    return this.prisma.task.findMany({
      where: { projectId },
      include: {
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        _count: {
          select: { comments: true, timeEntries: true },
        },
      },
      orderBy: [{ status: 'asc' }, { priority: 'desc' }],
    });
  }
}
