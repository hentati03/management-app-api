import {
  Controller,
  Get,
  Delete,
  Param,
  Query,
} from '@nestjs/common';
import { ChatService } from './chat.service';
import { ChatGateway } from './chat.gateway';
import { CurrentUser } from '../common';
import type { User } from '@prisma/client';
import { Role } from '@prisma/client';

@Controller('chat')
export class ChatController {
  constructor(
    private readonly chatService: ChatService,
    private readonly chatGateway: ChatGateway,
  ) {}

  @Get('project/:projectId/messages')
  getMessages(
    @Param('projectId') projectId: string,
    @Query('limit') limit?: string,
    @Query('cursor') cursor?: string,
    @CurrentUser() user?: User,
  ) {
    return this.chatService.getMessagesByProject(
      projectId,
      user!.id,
      limit ? parseInt(limit) : 50,
      cursor,
    );
  }

  @Get('project/:projectId/members')
  getProjectMembers(@Param('projectId') projectId: string) {
    return this.chatService.getProjectMembers(projectId);
  }

  @Get('project/:projectId/online')
  getOnlineUsers(@Param('projectId') projectId: string) {
    return {
      onlineUsers: this.chatGateway.getOnlineUsers(projectId),
    };
  }

  @Get('message/:id')
  getMessage(@Param('id') id: string) {
    return this.chatService.getMessage(id);
  }

  @Delete('message/:id')
  deleteMessage(@Param('id') id: string, @CurrentUser() user: User) {
    return this.chatService.deleteMessage(id, user.id, user.role === Role.ADMIN);
  }
}
