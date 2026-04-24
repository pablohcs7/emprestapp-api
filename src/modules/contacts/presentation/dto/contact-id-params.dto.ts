import { IsNotEmpty, IsString } from 'class-validator';

export class ContactIdParamsDto {
  @IsString()
  @IsNotEmpty()
  contactId!: string;
}
