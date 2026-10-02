export class CommentEntity {
  id: string;
  content: string;
  taskId: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;

  constructor(partial: Partial<CommentEntity>) {
    Object.assign(this, partial);
  }
}
