export class ChatMessageResponseDto {
  id: string;
  content: string;
  createdAt: Date;
  projectId: string;
  senderId: string;
  sender?: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}
