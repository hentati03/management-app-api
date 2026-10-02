import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, TaskStatus, ProjectStatus } from '@prisma/client';

@Injectable()
export class AnalyticsService {
  constructor(private readonly prisma: PrismaService) {}

  // Dashboard overview - global stats
  async getDashboardStats(userId: string, userRole: Role) {
    const isAdmin = userRole === Role.ADMIN;
    const isManager = userRole === Role.PROJECT_MANAGER;

    // Get counts based on role
    const [
      totalProjects,
      totalTasks,
      totalUsers,
      totalTimeEntries,
    ] = await Promise.all([
      isAdmin || isManager
        ? this.prisma.project.count()
        : this.prisma.project.count({
            where: {
              OR: [
                { creatorId: userId },
                { memberIds: { has: userId } },
              ],
            },
          }),
      isAdmin || isManager
        ? this.prisma.task.count()
        : this.prisma.task.count({
            where: {
              OR: [
                { assigneeId: userId },
                { creatorId: userId },
              ],
            },
          }),
      isAdmin ? this.prisma.user.count() : null,
      this.prisma.timeEntry.count({
        where: isAdmin || isManager ? {} : { userId },
      }),
    ]);

    // Task status breakdown
    const tasksByStatus = await this.prisma.task.groupBy({
      by: ['status'],
      _count: { status: true },
      where: isAdmin || isManager
        ? {}
        : {
            OR: [
              { assigneeId: userId },
              { creatorId: userId },
            ],
          },
    });

    // Project status breakdown
    const projectsByStatus = await this.prisma.project.groupBy({
      by: ['status'],
      _count: { status: true },
      where: isAdmin || isManager
        ? {}
        : {
            OR: [
              { creatorId: userId },
              { memberIds: { has: userId } },
            ],
          },
    });

    // Recent activity (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentTasks = await this.prisma.task.count({
      where: {
        createdAt: { gte: sevenDaysAgo },
        ...(isAdmin || isManager
          ? {}
          : {
              OR: [
                { assigneeId: userId },
                { creatorId: userId },
              ],
            }),
      },
    });

    const recentTimeEntries = await this.prisma.timeEntry.count({
      where: {
        createdAt: { gte: sevenDaysAgo },
        ...(isAdmin || isManager ? {} : { userId }),
      },
    });

    return {
      overview: {
        totalProjects,
        totalTasks,
        totalUsers,
        totalTimeEntries,
      },
      tasksByStatus: tasksByStatus.reduce(
        (acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        },
        {} as Record<string, number>,
      ),
      projectsByStatus: projectsByStatus.reduce(
        (acc, item) => {
          acc[item.status] = item._count.status;
          return acc;
        },
        {} as Record<string, number>,
      ),
      recentActivity: {
        tasksCreatedLast7Days: recentTasks,
        timeEntriesLast7Days: recentTimeEntries,
      },
    };
  }

  // Project-specific analytics
  async getProjectAnalytics(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
        tasks: true,
        _count: {
          select: {
            tasks: true,
            chatMessages: true,
          },
        },
      },
    });

    if (!project) {
      return null;
    }

    // Task statistics
    const tasksByStatus = await this.prisma.task.groupBy({
      by: ['status'],
      _count: { status: true },
      where: { projectId },
    });

    const tasksByPriority = await this.prisma.task.groupBy({
      by: ['priority'],
      _count: { priority: true },
      where: { projectId },
    });

    // Time tracking for project
    const timeEntries = await this.prisma.timeEntry.findMany({
      where: {
        task: { projectId },
      },
    });

    const totalTheoDuration = timeEntries.reduce(
      (sum, entry) => sum + entry.theoDuration,
      0,
    );
    const totalRealDuration = timeEntries.reduce(
      (sum, entry) => sum + entry.realDuration,
      0,
    );

    // Tasks per member
    const tasksPerMember = await this.prisma.task.groupBy({
      by: ['assigneeId'],
      _count: { assigneeId: true },
      where: {
        projectId,
        assigneeId: { not: null },
      },
    });

    // Overdue tasks
    const overdueTasks = await this.prisma.task.count({
      where: {
        projectId,
        dueDate: { lt: new Date() },
        status: { not: TaskStatus.DONE },
      },
    });

    // Completion rate
    const completedTasks = project.tasks.filter(
      (t) => t.status === TaskStatus.DONE,
    ).length;
    const completionRate =
      project.tasks.length > 0
        ? Math.round((completedTasks / project.tasks.length) * 100)
        : 0;

    return {
      project: {
        id: project.id,
        name: project.name,
        status: project.status,
        startDate: project.startDate,
        endDate: project.endDate,
        membersCount: project.members.length,
      },
      taskStats: {
        total: project._count.tasks,
        byStatus: tasksByStatus.reduce(
          (acc, item) => {
            acc[item.status] = item._count.status;
            return acc;
          },
          {} as Record<string, number>,
        ),
        byPriority: tasksByPriority.reduce(
          (acc, item) => {
            acc[item.priority] = item._count.priority;
            return acc;
          },
          {} as Record<string, number>,
        ),
        overdue: overdueTasks,
        completionRate,
      },
      timeTracking: {
        totalTheoDuration,
        totalRealDuration,
        efficiency:
          totalTheoDuration > 0
            ? Math.round((totalTheoDuration / totalRealDuration) * 100)
            : 0,
        entriesCount: timeEntries.length,
      },
      tasksPerMember,
      chatMessages: project._count.chatMessages,
    };
  }

  // User workload analytics
  async getUserWorkload(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });

    if (!user) {
      return null;
    }

    // Tasks assigned to user
    const assignedTasks = await this.prisma.task.findMany({
      where: { assigneeId: userId },
      include: {
        project: {
          select: { id: true, name: true },
        },
      },
    });

    const tasksByStatus = await this.prisma.task.groupBy({
      by: ['status'],
      _count: { status: true },
      where: { assigneeId: userId },
    });

    // Time tracking
    const timeEntries = await this.prisma.timeEntry.findMany({
      where: { userId },
    });

    const totalTheoDuration = timeEntries.reduce(
      (sum, entry) => sum + entry.theoDuration,
      0,
    );
    const totalRealDuration = timeEntries.reduce(
      (sum, entry) => sum + entry.realDuration,
      0,
    );

    // Projects involved
    const projects = await this.prisma.project.findMany({
      where: {
        OR: [
          { creatorId: userId },
          { memberIds: { has: userId } },
        ],
      },
      select: {
        id: true,
        name: true,
        status: true,
      },
    });

    // Overdue tasks
    const overdueTasks = assignedTasks.filter(
      (t) =>
        t.dueDate &&
        t.dueDate < new Date() &&
        t.status !== TaskStatus.DONE,
    ).length;

    // Recent activity (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentTimeEntries = await this.prisma.timeEntry.findMany({
      where: {
        userId,
        createdAt: { gte: thirtyDaysAgo },
      },
      orderBy: { date: 'desc' },
      take: 10,
      include: {
        task: {
          select: { id: true, title: true },
        },
      },
    });

    return {
      user,
      taskStats: {
        total: assignedTasks.length,
        byStatus: tasksByStatus.reduce(
          (acc, item) => {
            acc[item.status] = item._count.status;
            return acc;
          },
          {} as Record<string, number>,
        ),
        overdue: overdueTasks,
      },
      timeTracking: {
        totalTheoDuration,
        totalRealDuration,
        efficiency:
          totalTheoDuration > 0
            ? Math.round((totalTheoDuration / totalRealDuration) * 100)
            : 0,
      },
      projects: {
        count: projects.length,
        list: projects,
      },
      recentActivity: recentTimeEntries,
    };
  }

  // Team performance analytics (Admin/PM only)
  async getTeamPerformance() {
    const users = await this.prisma.user.findMany({
      where: { isActive: true },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
        role: true,
      },
    });

    const performance = await Promise.all(
      users.map(async (user) => {
        const [taskCount, completedTasks, timeEntries] = await Promise.all([
          this.prisma.task.count({ where: { assigneeId: user.id } }),
          this.prisma.task.count({
            where: { assigneeId: user.id, status: TaskStatus.DONE },
          }),
          this.prisma.timeEntry.aggregate({
            where: { userId: user.id },
            _sum: {
              theoDuration: true,
              realDuration: true,
            },
          }),
        ]);

        return {
          user,
          taskCount,
          completedTasks,
          completionRate:
            taskCount > 0
              ? Math.round((completedTasks / taskCount) * 100)
              : 0,
          totalTheoDuration: timeEntries._sum.theoDuration || 0,
          totalRealDuration: timeEntries._sum.realDuration || 0,
        };
      }),
    );

    return {
      teamSize: users.length,
      members: performance,
    };
  }

  // Time tracking report
  async getTimeReport(startDate: string, endDate: string, userId?: string) {
    const whereClause: any = {
      date: {
        gte: new Date(startDate),
        lte: new Date(endDate),
      },
    };

    if (userId) {
      whereClause.userId = userId;
    }

    const timeEntries = await this.prisma.timeEntry.findMany({
      where: whereClause,
      include: {
        task: {
          include: {
            project: {
              select: { id: true, name: true },
            },
          },
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: { date: 'asc' },
    });

    // Group by date
    const byDate = timeEntries.reduce(
      (acc, entry) => {
        const dateKey = entry.date.toISOString().split('T')[0];
        if (!acc[dateKey]) {
          acc[dateKey] = {
            date: dateKey,
            entries: [],
            totalTheoDuration: 0,
            totalRealDuration: 0,
          };
        }
        acc[dateKey].entries.push(entry);
        acc[dateKey].totalTheoDuration += entry.theoDuration;
        acc[dateKey].totalRealDuration += entry.realDuration;
        return acc;
      },
      {} as Record<string, any>,
    );

    // Group by project
    const byProject = timeEntries.reduce(
      (acc, entry) => {
        const projectId = entry.task.project.id;
        const projectName = entry.task.project.name;
        if (!acc[projectId]) {
          acc[projectId] = {
            projectId,
            projectName,
            totalTheoDuration: 0,
            totalRealDuration: 0,
            entriesCount: 0,
          };
        }
        acc[projectId].totalTheoDuration += entry.theoDuration;
        acc[projectId].totalRealDuration += entry.realDuration;
        acc[projectId].entriesCount += 1;
        return acc;
      },
      {} as Record<string, any>,
    );

    const totalTheoDuration = timeEntries.reduce(
      (sum, e) => sum + e.theoDuration,
      0,
    );
    const totalRealDuration = timeEntries.reduce(
      (sum, e) => sum + e.realDuration,
      0,
    );

    return {
      period: { startDate, endDate },
      summary: {
        totalEntries: timeEntries.length,
        totalTheoDuration,
        totalRealDuration,
        efficiency:
          totalTheoDuration > 0
            ? Math.round((totalTheoDuration / totalRealDuration) * 100)
            : 0,
      },
      byDate: Object.values(byDate),
      byProject: Object.values(byProject),
    };
  }

  // Productivity trends (last N weeks)
  async getProductivityTrends(weeks = 4, userId?: string) {
    const trends: any[] = [];
    const now = new Date();

    for (let i = 0; i < weeks; i++) {
      const weekEnd = new Date(now);
      weekEnd.setDate(weekEnd.getDate() - i * 7);
      const weekStart = new Date(weekEnd);
      weekStart.setDate(weekStart.getDate() - 7);

      const whereClause: any = {
        date: {
          gte: weekStart,
          lt: weekEnd,
        },
      };

      if (userId) {
        whereClause.userId = userId;
      }

      const [timeEntries, tasksCompleted] = await Promise.all([
        this.prisma.timeEntry.aggregate({
          where: whereClause,
          _sum: {
            theoDuration: true,
            realDuration: true,
          },
          _count: true,
        }),
        this.prisma.task.count({
          where: {
            status: TaskStatus.DONE,
            updatedAt: {
              gte: weekStart,
              lt: weekEnd,
            },
            ...(userId ? { assigneeId: userId } : {}),
          },
        }),
      ]);

      trends.push({
        weekStart: weekStart.toISOString().split('T')[0],
        weekEnd: weekEnd.toISOString().split('T')[0],
        totalTheoDuration: timeEntries._sum.theoDuration || 0,
        totalRealDuration: timeEntries._sum.realDuration || 0,
        timeEntriesCount: timeEntries._count,
        tasksCompleted,
      });
    }

    return trends.reverse();
  }
}
