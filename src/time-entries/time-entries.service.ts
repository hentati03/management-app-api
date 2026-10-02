import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateTimeEntryDto, UpdateTimeEntryDto } from './dto';
import { Role } from '@prisma/client';

@Injectable()
export class TimeEntriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(createTimeEntryDto: CreateTimeEntryDto, userId: string) {
    // Verify task exists
    const task = await this.prisma.task.findUnique({
      where: { id: createTimeEntryDto.taskId },
      include: { 
        project: {
          select: {
            id: true,
            name: true,
            memberIds: true,
          }
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          }
        }
      },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    // Check if user is assigned to the task or is a project member
    const isAssigned = task.assigneeId === userId;
    const isMember = task.project.memberIds.includes(userId);

    console.log('Time Entry Validation:', {
      userId,
      taskId: task.id,
      taskAssigneeId: task.assigneeId,
      isAssigned,
      projectMemberIds: task.project.memberIds,
      isMember,
    });

    if (!isAssigned && !isMember) {
      throw new ForbiddenException(
        `You must be assigned to the task or be a project member to log time. User: ${userId}, Assigned: ${task.assigneeId}, Members: ${task.project.memberIds.join(', ')}`,
      );
    }

    return this.prisma.timeEntry.create({
      data: {
        startTime: new Date(createTimeEntryDto.startTime),
        endTime: new Date(createTimeEntryDto.endTime),
        theoDuration: createTimeEntryDto.theoDuration,
        realDuration: createTimeEntryDto.realDuration,
        description: createTimeEntryDto.description,
        date: createTimeEntryDto.date
          ? new Date(createTimeEntryDto.date)
          : new Date(),
        taskId: createTimeEntryDto.taskId,
        userId,
      },
      include: {
        task: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
  }

  async findAll(startDate?: string, endDate?: string) {
    const whereClause: any = {};

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) {
        whereClause.date.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.date.lte = new Date(endDate);
      }
    }

    return this.prisma.timeEntry.findMany({
      where: whereClause,
      include: {
        task: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            avatar: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findOne(id: string) {
    const timeEntry = await this.prisma.timeEntry.findUnique({
      where: { id },
      include: {
        task: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });

    if (!timeEntry) {
      throw new NotFoundException('Time entry not found');
    }

    return timeEntry;
  }

  async findByTask(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    return this.prisma.timeEntry.findMany({
      where: { taskId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findByUser(userId: string, startDate?: string, endDate?: string) {
    const whereClause: any = { userId };

    if (startDate || endDate) {
      whereClause.date = {};
      if (startDate) {
        whereClause.date.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.date.lte = new Date(endDate);
      }
    }

    return this.prisma.timeEntry.findMany({
      where: whereClause,
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        task: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findMyTimeEntries(userId: string) {
    return this.findByUser(userId);
  }

  async findByProject(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return this.prisma.timeEntry.findMany({
      where: {
        task: {
          projectId,
        },
      },
      include: {
        task: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async findByDateRange(
    userId: string,
    startDate: string,
    endDate: string,
    userRole: Role,
  ) {
    const whereClause: any = {};

    // Only add date filters if valid dates are provided
    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    // Non-admin users can only see their own time entries
    if (userRole !== Role.ADMIN && userRole !== Role.PROJECT_MANAGER) {
      whereClause.userId = userId;
    } else {
      // For managers, still filter by user for /my-entries endpoint
      whereClause.userId = userId;
    }

    return this.prisma.timeEntry.findMany({
      where: whereClause,
      include: {
        task: {
          include: {
            project: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    });
  }

  async update(
    id: string,
    updateTimeEntryDto: UpdateTimeEntryDto,
    userId: string,
    userRole: Role,
  ) {
    const timeEntry = await this.prisma.timeEntry.findUnique({
      where: { id },
    });

    if (!timeEntry) {
      throw new NotFoundException('Time entry not found');
    }

    // Only the owner or admin can update
    if (timeEntry.userId !== userId && userRole !== Role.ADMIN) {
      throw new ForbiddenException(
        'You can only update your own time entries',
      );
    }

    const data: any = {};

    if (updateTimeEntryDto.startTime) {
      data.startTime = new Date(updateTimeEntryDto.startTime);
    }
    if (updateTimeEntryDto.endTime) {
      data.endTime = new Date(updateTimeEntryDto.endTime);
    }
    if (updateTimeEntryDto.theoDuration !== undefined) {
      data.theoDuration = updateTimeEntryDto.theoDuration;
    }
    if (updateTimeEntryDto.realDuration !== undefined) {
      data.realDuration = updateTimeEntryDto.realDuration;
    }
    if (updateTimeEntryDto.description !== undefined) {
      data.description = updateTimeEntryDto.description;
    }
    if (updateTimeEntryDto.date) {
      data.date = new Date(updateTimeEntryDto.date);
    }

    return this.prisma.timeEntry.update({
      where: { id },
      data,
      include: {
        task: true,
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true,
            isActive: true,
            createdAt: true,
            updatedAt: true,
          },
        },
      },
    });
  }

  async remove(id: string, userId: string, userRole: Role) {
    const timeEntry = await this.prisma.timeEntry.findUnique({
      where: { id },
    });

    if (!timeEntry) {
      throw new NotFoundException('Time entry not found');
    }

    // Only the owner or admin can delete
    if (timeEntry.userId !== userId && userRole !== Role.ADMIN) {
      throw new ForbiddenException(
        'You can only delete your own time entries',
      );
    }

    await this.prisma.timeEntry.delete({
      where: { id },
    });

    return { message: 'Time entry deleted successfully' };
  }

  // Get total time logged for a task
  async getTaskTotalTime(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException('Task not found');
    }

    const timeEntries = await this.prisma.timeEntry.findMany({
      where: { taskId },
    });

    const totalTheoDuration = timeEntries.reduce(
      (sum, entry) => sum + entry.theoDuration,
      0,
    );
    const totalRealDuration = timeEntries.reduce(
      (sum, entry) => sum + entry.realDuration,
      0,
    );

    return {
      taskId,
      totalTheoDuration,
      totalRealDuration,
      entriesCount: timeEntries.length,
    };
  }

  // Get total time logged by a user
  async getUserTotalTime(userId: string, startDate?: string, endDate?: string) {
    const whereClause: any = { userId };

    if (startDate && endDate) {
      whereClause.date = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    }

    const timeEntries = await this.prisma.timeEntry.findMany({
      where: whereClause,
    });

    const totalTheoDuration = timeEntries.reduce(
      (sum, entry) => sum + entry.theoDuration,
      0,
    );
    const totalRealDuration = timeEntries.reduce(
      (sum, entry) => sum + entry.realDuration,
      0,
    );

    return {
      userId,
      totalTheoDuration,
      totalRealDuration,
      entriesCount: timeEntries.length,
    };
  }
}
