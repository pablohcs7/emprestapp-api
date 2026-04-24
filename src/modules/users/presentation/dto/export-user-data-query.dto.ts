import { Transform } from 'class-transformer';
import { IsOptional, IsString } from 'class-validator';

const normalizeFormat = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class ExportUserDataQueryDto {
  @IsOptional()
  @Transform(({ value }) => normalizeFormat(value))
  @IsString()
  format: string = 'json';
}
