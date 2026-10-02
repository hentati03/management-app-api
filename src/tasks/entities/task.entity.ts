import { TaskStatus, TaskPriority } from '@prisma/client';

export class TaskEntity {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate?: Date;
  estimatedHours?: number;
  projectId: string;
  assigneeId?: string;
  creatorId: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<TaskEntity>) {
    Object.assign(this, partial);
  }
}
