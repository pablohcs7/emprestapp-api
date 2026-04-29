import { IsMongoId } from 'class-validator';

export class LinkLoanContactDto {
  @IsMongoId()
  contactId!: string;
}
