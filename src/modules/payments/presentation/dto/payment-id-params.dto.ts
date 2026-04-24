import { IsString } from 'class-validator';

export class PaymentIdParamsDto {
  @IsString()
  paymentId!: string;
}
