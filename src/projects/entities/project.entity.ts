import { ProjectStatus } from '@prisma/client';

export class ProjectEntity {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  startDate?: Date;
  endDate?: Date;
  creatorId: string;
  memberIds: string[];
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<ProjectEntity>) {
    Object.assign(this, partial);
  }
}
