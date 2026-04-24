import { Transform } from 'class-transformer';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

const normalizeText = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim() : value;

export class CreateContactDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  @Transform(({ value }) => normalizeText(value))
  fullName!: string;

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
}
