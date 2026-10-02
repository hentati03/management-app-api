import { TaskStatus, TaskPriority } from '@prisma/client';

export class TaskResponseDto {
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
}

export class TaskWithRelationsDto extends TaskResponseDto {
  project: {
    id: string;
    name: string;
  };
  assignee?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
  _count?: {
    comments: number;
    timeEntries: number;
  };
}
