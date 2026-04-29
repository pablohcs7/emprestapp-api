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

import { PaymentStatus } from '../payments.types';

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

export class ListPaymentsQueryDto {
  @IsOptional()
  @IsMongoId()
  @Transform(({ value }) => normalizeText(value))
  loanId?: string;

  @IsOptional()
  @IsMongoId()
  @Transform(({ value }) => normalizeText(value))
  installmentId?: string;

  @IsOptional()
  @Transform(({ value }) => splitStatuses(value))
  @IsArray()
  @ArrayUnique()
  @IsIn(['active', 'canceled'], { each: true })
  status?: PaymentStatus[];

  @IsOptional()
  @IsISO8601({ strict: true })
  paidAtFrom?: string;

  @IsOptional()
  @IsISO8601({ strict: true })
  paidAtTo?: string;

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
