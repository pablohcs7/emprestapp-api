import { IsString } from 'class-validator';

export class LoanIdParamsDto {
  @IsString()
  loanId!: string;
}
