import {
  Injectable,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto, UpdateUserDto, UpdateProfileDto } from './dto';
import { Role } from '@prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async create(createUserDto: CreateUserDto) {
    const { email, password, ...rest } = createUserDto;

    // Check if user already exists
    const existingUser = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await this.prisma.user.create({
      data: {
        email,
        password: hashedPassword,
        ...rest,
      },
    });

    const { password: _, ...result } = user;
    return result;
  }

  async findAll(options?: {
    role?: Role;
    isActive?: boolean;
    search?: string;
  }) {
    const where: any = {};

    if (options?.role) {
      where.role = options.role;
    }

    if (options?.isActive !== undefined) {
      where.isActive = options.isActive;
    }

    if (options?.search) {
      where.OR = [
        { firstName: { contains: options.search, mode: 'insensitive' } },
        { lastName: { contains: options.search, mode: 'insensitive' } },
        { email: { contains: options.search, mode: 'insensitive' } },
      ];
    }

    const users = await this.prisma.user.findMany({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        bio: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        projectIds: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return users;
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        bio: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        projectIds: true,
        projects: {
          select: {
            id: true,
            name: true,
            status: true,
          },
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return user;
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async update(id: string, updateUserDto: UpdateUserDto, currentUserId: string, currentUserRole: Role) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Only admins can update other users, or users can update themselves
    if (currentUserRole !== Role.ADMIN && currentUserId !== id) {
      throw new ForbiddenException('You can only update your own profile');
    }

    // Only admins can change roles
    if (updateUserDto.role && currentUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can change user roles');
    }

    // Only admins can deactivate users
    if (updateUserDto.isActive !== undefined && currentUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can change user status');
    }

    // Check email uniqueness if updating email
    if (updateUserDto.email && updateUserDto.email !== user.email) {
      const existingUser = await this.prisma.user.findUnique({
        where: { email: updateUserDto.email },
      });

      if (existingUser) {
        throw new ConflictException('Email already in use');
      }
    }

    // Hash password if provided
    let data: any = { ...updateUserDto };
    if (updateUserDto.password) {
      data.password = await bcrypt.hash(updateUserDto.password, 10);
    }

    const updatedUser = await this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        bio: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        projectIds: true,
      },
    });

    return updatedUser;
  }

  async updateProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundException(`User not found`);
    }

    // If changing password, verify current password
    if (updateProfileDto.newPassword) {
      if (!updateProfileDto.currentPassword) {
        throw new BadRequestException('Current password is required to change password');
      }

      const passwordMatch = await bcrypt.compare(
        updateProfileDto.currentPassword,
        user.password,
      );

      if (!passwordMatch) {
        throw new BadRequestException('Current password is incorrect');
      }
    }

    // Build update data
    const updateData: any = {};

    if (updateProfileDto.firstName) {
      updateData.firstName = updateProfileDto.firstName;
    }

    if (updateProfileDto.lastName) {
      updateData.lastName = updateProfileDto.lastName;
    }

    if (updateProfileDto.avatar !== undefined) {
      updateData.avatar = updateProfileDto.avatar;
    }

    if (updateProfileDto.bio !== undefined) {
      updateData.bio = updateProfileDto.bio;
    }

    if (updateProfileDto.newPassword) {
      updateData.password = await bcrypt.hash(updateProfileDto.newPassword, 10);
    }

    // Update user
    const updatedUser = await this.prisma.user.update({
      where: { id: userId },
      data: updateData,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        bio: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        projectIds: true,
      },
    });

    return updatedUser;
  }

  async remove(id: string, currentUserId: string, currentUserRole: Role) {
    // Check if user exists
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    // Only admins can delete users
    if (currentUserRole !== Role.ADMIN) {
      throw new ForbiddenException('Only admins can delete users');
    }

    // Prevent self-deletion
    if (currentUserId === id) {
      throw new ForbiddenException('You cannot delete your own account');
    }

    await this.prisma.user.delete({
      where: { id },
    });

    return { message: 'User deleted successfully' };
  }

  async deactivate(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async activate(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: true },
    });
  }

  async toggleActive(id: string) {
    const user = await this.prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      throw new NotFoundException(`User with ID ${id} not found`);
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: !user.isActive },
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        avatar: true,
        bio: true,
        role: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
        projectIds: true,
      },
    });
  }
}
