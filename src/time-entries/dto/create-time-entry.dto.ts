import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  IsNotEmpty,
} from 'class-validator';

export class CreateTimeEntryDto {
  @IsDateString()
  @IsNotEmpty()
  startTime: string;

  @IsDateString()
  @IsNotEmpty()
  endTime: string;

  @IsInt()
  @Min(1)
  theoDuration: number; // Theoretical duration in minutes

  @IsInt()
  @Min(1)
  realDuration: number; // Real duration in minutes

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  date?: string;

  @IsString()
  @IsNotEmpty()
  taskId: string;
}
