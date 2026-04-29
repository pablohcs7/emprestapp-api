import { Transform, Type } from 'class-transformer';
import {
  ArrayUnique,
  IsArray,
  IsIn,
  IsInt,
  IsISO8601,
  IsMongoId,
  IsOptional,
  Max,
  Min,
} from 'class-validator';

import { LoanStatus } from '../loans.types';

const normalizeText = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim() : value;

const splitStatuses = (value: unknown): unknown => {
  if (typeof value !== 'string') {
    return value;
  }

  return value
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
};

export class ListLoansQueryDto {
  @IsOptional()
  @Transform(({ value }) => splitStatuses(value))
  @IsArray()
  @ArrayUnique()
  @IsIn(['open', 'paid', 'overdue', 'canceled'], { each: true })
  status?: LoanStatus[];

  @IsOptional()
  @IsMongoId()
  @Transform(({ value }) => normalizeText(value))
  contactId?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  dueDateFrom?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  dueDateTo?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  periodFrom?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  periodTo?: string;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page: number = 1;

  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  pageSize: number = 20;
}
