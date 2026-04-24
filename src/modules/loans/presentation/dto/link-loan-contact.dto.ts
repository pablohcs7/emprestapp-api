import { IsString } from 'class-validator';

export class LinkLoanContactDto {
  @IsString()
  contactId!: string;
}
