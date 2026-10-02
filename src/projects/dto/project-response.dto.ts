import { ProjectStatus } from '@prisma/client';

export class ProjectResponseDto {
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
}

export class ProjectWithRelationsDto extends ProjectResponseDto {
  creator: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  };
  members: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
    avatar?: string;
  }[];
  _count?: {
    tasks: number;
  };
}
