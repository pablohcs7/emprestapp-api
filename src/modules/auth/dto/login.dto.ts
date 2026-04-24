import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';

const normalizeEmail = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class LoginDto {
  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => normalizeEmail(value))
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
