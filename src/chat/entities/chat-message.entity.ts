export class ChatMessageEntity {
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

  constructor(partial: Partial<ChatMessageEntity>) {
    Object.assign(this, partial);
  }
}
