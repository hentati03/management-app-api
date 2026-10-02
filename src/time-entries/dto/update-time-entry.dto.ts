import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
} from 'class-validator';

export class UpdateTimeEntryDto {
  @IsDateString()
  @IsOptional()
  startTime?: string;

  @IsDateString()
  @IsOptional()
  endTime?: string;

  @IsInt()
  @Min(1)
  @IsOptional()
  theoDuration?: number;

  @IsInt()
  @Min(1)
  @IsOptional()
  realDuration?: number;

  @IsString()
  @IsOptional()
  description?: string;

  @IsDateString()
  @IsOptional()
  date?: string;
}
