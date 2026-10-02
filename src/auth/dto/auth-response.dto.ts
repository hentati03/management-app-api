import { Role } from '@prisma/client';

export class UserResponseDto {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
}

export class AuthResponseDto {
  accessToken: string;
}
