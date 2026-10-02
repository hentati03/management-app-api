import { TaskEntity } from '../../tasks/entities/task.entity';
import { UserEntity } from '../../users/entities/user.entity';

export class TimeEntryEntity {
  id: string;
  startTime: Date;
  endTime: Date;
  theoDuration: number;
  realDuration: number;
  description: string | null;
  date: Date;
  taskId: string;
  userId: string;
  task?: TaskEntity;
  user?: UserEntity;

  constructor(partial: Partial<TimeEntryEntity>) {
    Object.assign(this, partial);
  }
}
