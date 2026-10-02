import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMessageDto } from './dto';

@Injectable()
export class ChatService {
  constructor(private readonly prisma: PrismaService) {}

  async createMessage(createMessageDto: CreateMessageDto, senderId: string) {
    const { content, projectId } = createMessageDto;

    // Verify project exists and user is a member
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const isMember = project.members.some((member) => member.id === senderId);
    const isCreator = project.creatorId === senderId;

    if (!isMember && !isCreator) {
      throw new ForbiddenException(
        'You must be a project member to send messages',
      );
    }

    return this.prisma.chatMessage.create({
      data: {
        content,
        projectId,
        senderId,
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });
  }

  async getMessagesByProject(
    projectId: string,
    userId: string,
    limit = 50,
    cursor?: string,
  ) {
    // Verify project exists and user has access
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: { members: true },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    const isMember = project.members.some((member) => member.id === userId);
    const isCreator = project.creatorId === userId;

    if (!isMember && !isCreator) {
      throw new ForbiddenException(
        'You must be a project member to view messages',
      );
    }

    const messages = await this.prisma.chatMessage.findMany({
      where: { projectId },
      take: limit,
      ...(cursor && {
        skip: 1,
        cursor: { id: cursor },
      }),
      orderBy: { createdAt: 'desc' },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    // Reverse to get chronological order
    return messages.reverse();
  }

  async getMessage(id: string) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    return message;
  }

  async deleteMessage(id: string, userId: string, isAdmin: boolean) {
    const message = await this.prisma.chatMessage.findUnique({
      where: { id },
    });

    if (!message) {
      throw new NotFoundException('Message not found');
    }

    // Only sender or admin can delete
    if (message.senderId !== userId && !isAdmin) {
      throw new ForbiddenException('You can only delete your own messages');
    }

    await this.prisma.chatMessage.delete({
      where: { id },
    });

    return { message: 'Message deleted successfully', deletedId: id };
  }

  // Get project members for online status tracking
  async getProjectMembers(projectId: string) {
    const project = await this.prisma.project.findUnique({
      where: { id: projectId },
      include: {
        members: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
    });

    if (!project) {
      throw new NotFoundException('Project not found');
    }

    return {
      creator: project.creator,
      members: project.members,
    };
  }
}
