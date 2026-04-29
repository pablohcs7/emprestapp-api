import { Transform, Type } from 'class-transformer';
import {
  IsInt,
  IsISO8601,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  Min,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

const normalizeText = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim() : value;

@ValidatorConstraint({ name: 'isTodayOrPastDate', async: false })
class IsTodayOrPastDateConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    if (typeof value !== 'string') {
      return false;
    }

    const date = new Date(value);

    if (Number.isNaN(date.getTime())) {
      return false;
    }

    return date.getTime() <= Date.now();
  }

  defaultMessage(): string {
    return 'paidAt must be today or in the past';
  }
}

export class CreatePaymentDto {
  @IsMongoId()
  loanId!: string;

  @IsMongoId()
  installmentId!: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  amountCents!: number;

  @IsISO8601({ strict: true })
  @Validate(IsTodayOrPastDateConstraint)
  paidAt!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Transform(({ value }) => normalizeText(value))
  method?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => normalizeText(value))
  note?: string;
}
