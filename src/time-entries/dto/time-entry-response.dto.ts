import { TaskResponseDto } from '../../tasks/dto';
import { UserResponseDto } from '../../users/dto';

export class TimeEntryResponseDto {
  id: string;
  startTime: Date;
  endTime: Date;
  theoDuration: number;
  realDuration: number;
  description: string | null;
  date: Date;
  taskId: string;
  userId: string;
  task?: TaskResponseDto;
  user?: UserResponseDto;
}
