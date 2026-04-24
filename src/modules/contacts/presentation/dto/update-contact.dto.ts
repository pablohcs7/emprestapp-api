import { Transform } from 'class-transformer';
import {
  IsOptional,
  IsString,
  MaxLength,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

const normalizeText = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim() : value;

@ValidatorConstraint({ name: 'atLeastOneField', async: false })
class AtLeastOneFieldConstraint implements ValidatorConstraintInterface {
  validate(value: UpdateContactDto): boolean {
    return Boolean(
      value.fullName !== undefined ||
        value.documentId !== undefined ||
        value.phone !== undefined ||
        value.notes !== undefined,
    );
  }

  defaultMessage(): string {
    return 'At least one contact field must be provided';
  }
}

export class UpdateContactDto {
  @IsOptional()
  @IsString()
  @MaxLength(120)
  @Transform(({ value }) => normalizeText(value))
  fullName?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Transform(({ value }) => normalizeText(value))
  documentId?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  @Transform(({ value }) => normalizeText(value))
  phone?: string;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  @Transform(({ value }) => normalizeText(value))
  notes?: string;

  @Validate(AtLeastOneFieldConstraint)
  private readonly atLeastOneField: UpdateContactDto = this;
}
