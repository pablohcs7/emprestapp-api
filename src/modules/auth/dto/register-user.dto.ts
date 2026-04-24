import { Transform } from 'class-transformer';
import { IsEmail, IsNotEmpty, IsString, Matches, MinLength } from 'class-validator';

const normalizeText = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim() : value;

const normalizeEmail = (value: unknown): unknown =>
  typeof value === 'string' ? value.trim().toLowerCase() : value;

export class RegisterUserDto {
  @IsString()
  @IsNotEmpty()
  @Transform(({ value }) => normalizeText(value))
  fullName!: string;

  @IsEmail()
  @IsNotEmpty()
  @Transform(({ value }) => normalizeEmail(value))
  email!: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(/[A-Z]/, {
    message: 'password must include at least one uppercase letter',
  })
  @Matches(/[a-z]/, {
    message: 'password must include at least one lowercase letter',
  })
  @Matches(/[^A-Za-z0-9]/, {
    message: 'password must include at least one special character',
  })
  password!: string;
}
