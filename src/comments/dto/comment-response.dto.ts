export class CommentResponseDto {
  id: string;
  content: string;
  taskId: string;
  authorId: string;
  createdAt: Date;
  updatedAt: Date;
}

export class CommentWithAuthorDto extends CommentResponseDto {
  author: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string;
  };
}
