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
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

interface AuthenticatedSocket extends Socket {
  userId?: string;
}

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
  namespace: '/comments',
})
export class CommentsGateway
  implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server: Server;

  private logger: Logger = new Logger('CommentsGateway');

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  afterInit(server: Server) {
    this.logger.log('Comments WebSocket Gateway initialized');
  }

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token =
        client.handshake.auth.token ||
        client.handshake.headers.authorization?.split(' ')[1];

      if (!token) {
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
      this.logger.log(`Client connected to comments: ${client.id}`);
    } catch (error) {
      this.logger.error(`Connection error: ${error.message}`);
      client.disconnect();
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Client disconnected from comments: ${client.id}`);
  }

  @SubscribeMessage('joinTask')
  handleJoinTask(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { taskId: string },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    client.join(`task:${data.taskId}`);
    this.logger.log(`User ${client.userId} joined task room: ${data.taskId}`);
    return { success: true };
  }

  @SubscribeMessage('leaveTask')
  handleLeaveTask(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { taskId: string },
  ) {
    if (!client.userId) {
      return { error: 'Not authenticated' };
    }

    client.leave(`task:${data.taskId}`);
    return { success: true };
  }

  // Method to emit comment events from CommentsService
  emitCommentCreated(taskId: string, comment: any) {
    this.server.to(`task:${taskId}`).emit('commentCreated', comment);
  }

  emitCommentUpdated(taskId: string, comment: any) {
    this.server.to(`task:${taskId}`).emit('commentUpdated', comment);
  }

  emitCommentDeleted(taskId: string, commentId: string) {
    this.server.to(`task:${taskId}`).emit('commentDeleted', { commentId });
  }
}
