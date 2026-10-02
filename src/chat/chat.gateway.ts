import {
  WebSocketGateway,
  SubscribeMessage,
  MessageBody,
  WebSocketServer,
  ConnectedSocket,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards } from '@nestjs/common';
import { ChatService } from './chat.service';
import { CreateMessageDto } from './dto';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
  userEmail?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/chat',
})
export class ChatGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('ChatGateway');
  private connectedUsers: Map<string, Set<string>> = new Map(); // projectId -> Set of userIds

  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Chat WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
        this.logger.warn(`Client ${client.id} attempted connection without token`);
        client.disconnect();
        return;
      }

      const payload = this.jwtService.verify(token, {
        secret: this.configService.get<string>('JWT_SECRET'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.isActive) {
        client.disconnect();
        return;
      }

      client.userId = user.id;
      client.userEmail = user.email;

      this.logger.log(`Client connected: ${client.id} (User: ${user.email})`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    if (client.userId) {
      // Remove user from all project rooms
      this.connectedUsers.forEach((users, projectId) => {
        if (users.has(client.userId!)) {
          users.delete(client.userId!);
          this.server.to(`project:${projectId}`).emit('userLeft', {
            userId: client.userId,
            projectId,
          });
        }
      });
    }
    this.logger.log(`Client disconnected: ${client.id}`);
  }

  @SubscribeMessage('joinProject')
  async handleJoinProject(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { projectId: string },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    const { projectId } = data;

    try {
      // Verify user has access to project
      const project = await this.prisma.project.findUnique({
        where: { id: projectId },
        include: { members: true },
      });

      if (!project) {
        return { error: 'Project not found' };
      }

      const isMember = project.members.some((m) => m.id === client.userId);
      const isCreator = project.creatorId === client.userId;

      if (!isMember && !isCreator) {
        return { error: 'Access denied' };
      }

      // Join the project room
      client.join(`project:${projectId}`);

      // Track connected users
      if (!this.connectedUsers.has(projectId)) {
        this.connectedUsers.set(projectId, new Set());
      }
      this.connectedUsers.get(projectId)!.add(client.userId);

      // Notify others that user joined
      this.server.to(`project:${projectId}`).emit('userJoined', {
        userId: client.userId,
        projectId,
      });

      // Get recent messages
      const messages = await this.chatService.getMessagesByProject(
        projectId,
        client.userId,
        50,
      );

      // Get online users
      const onlineUsers = Array.from(
        this.connectedUsers.get(projectId) || [],
      );

      return {
        success: true,
        messages,
        onlineUsers,
      };
    } catch (error) {
      this.logger.error(`Error joining project: ${error.message}`);
      return { error: error.message };
    }
  }

  @SubscribeMessage('leaveProject')
  handleLeaveProject(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { projectId: string },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    const { projectId } = data;
    client.leave(`project:${projectId}`);

    // Remove from connected users
    if (this.connectedUsers.has(projectId)) {
      this.connectedUsers.get(projectId)!.delete(client.userId);
    }

    // Notify others
    this.server.to(`project:${projectId}`).emit('userLeft', {
      userId: client.userId,
      projectId,
    });

    return { success: true };
  }

  @SubscribeMessage('sendMessage')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() createMessageDto: CreateMessageDto,
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      const message = await this.chatService.createMessage(
        createMessageDto,
        client.userId,
      );

      // Broadcast to all users in the project room
      this.server
        .to(`project:${createMessageDto.projectId}`)
        .emit('newMessage', message);

      return { success: true, message };
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);
      return { error: error.message };
    }
  }

  @SubscribeMessage('deleteMessage')
  async handleDeleteMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { messageId: string; projectId: string },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    try {
      const user = await this.prisma.user.findUnique({
        where: { id: client.userId },
      });

      const result = await this.chatService.deleteMessage(
        data.messageId,
        client.userId,
        user?.role === 'ADMIN',
      );

      // Broadcast deletion to all users in the project room
      this.server.to(`project:${data.projectId}`).emit('messageDeleted', {
        messageId: data.messageId,
      });

      return { success: true, ...result };
    } catch (error) {
      this.logger.error(`Error deleting message: ${error.message}`);
      return { error: error.message };
    }
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { projectId: string; isTyping: boolean },
  ) {
    if (!client.userId) {
      return;
    }

    // Broadcast typing status to others in the room
    client.to(`project:${data.projectId}`).emit('userTyping', {
      userId: client.userId,
      isTyping: data.isTyping,
    });
  }

  // Method to get online users for a project (can be called from controller)
  getOnlineUsers(projectId: string): string[] {
    return Array.from(this.connectedUsers.get(projectId) || []);
  }
}
