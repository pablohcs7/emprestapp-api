import { IsMongoId } from 'class-validator';

export class ContactIdParamsDto {
  @IsMongoId()
  contactId!: string;
}
