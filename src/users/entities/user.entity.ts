import { Role } from '@prisma/client';

export class UserEntity {
  id: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  bio?: string;
  role: Role;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
  projectIds: string[];

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }

  // Exclude password from response
  toResponse() {
    const { password, ...userWithoutPassword } = this;
    return userWithoutPassword;
  }
}
