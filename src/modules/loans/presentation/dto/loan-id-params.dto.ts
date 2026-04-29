import { IsMongoId } from 'class-validator';

export class LoanIdParamsDto {
  @IsMongoId()
  loanId!: string;
}
