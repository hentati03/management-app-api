import { Role } from '@prisma/client';

export class UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  bio?: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export class UserWithProjectsDto extends UserResponseDto {
  projectIds: string[];
}
