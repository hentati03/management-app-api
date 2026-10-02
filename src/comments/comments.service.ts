import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { Role } from '@prisma/client';
import { CommentsGateway } from './comments.gateway';

@Injectable()
export class CommentsService {
  constructor(
    private prisma: PrismaService,
    @Inject(forwardRef(() => CommentsGateway))
    private commentsGateway: CommentsGateway,
  ) {}

  async create(createCommentDto: CreateCommentDto, authorId: string) {
    const { taskId, content } = createCommentDto;

    // Verify task exists
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    const comment = await this.prisma.comment.create({
      data: {
        content,
        taskId,
        authorId,
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Emit real-time event
    this.commentsGateway.emitCommentCreated(taskId, comment);

    return comment;
  }

  async findAllByTask(taskId: string) {
    const task = await this.prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      throw new NotFoundException(`Task with ID ${taskId} not found`);
    }

    return this.prisma.comment.findMany({
      where: { taskId },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findOne(id: string) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    return comment;
  }

  async update(
    id: string,
    updateCommentDto: UpdateCommentDto,
    userId: string,
    userRole: Role,
  ) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    // Only the author or admin can update
    if (comment.authorId !== userId && userRole !== Role.ADMIN) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    const updatedComment = await this.prisma.comment.update({
      where: { id },
      data: { content: updateCommentDto.content },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true,
          },
        },
        task: {
          select: {
            id: true,
            title: true,
          },
        },
      },
    });

    // Emit real-time event
    this.commentsGateway.emitCommentUpdated(comment.taskId, updatedComment);

    return updatedComment;
  }

  async remove(id: string, userId: string, userRole: Role) {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
    });

    if (!comment) {
      throw new NotFoundException(`Comment with ID ${id} not found`);
    }

    // Only the author or admin can delete
    if (comment.authorId !== userId && userRole !== Role.ADMIN) {
      throw new ForbiddenException('You can only delete your own comments');
    }

    const taskId = comment.taskId;

    await this.prisma.comment.delete({
      where: { id },
    });

    // Emit real-time event
    this.commentsGateway.emitCommentDeleted(taskId, id);

    return { message: 'Comment deleted successfully' };
  }
}
