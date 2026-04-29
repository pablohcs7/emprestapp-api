import { IsMongoId } from 'class-validator';

export class PaymentIdParamsDto {
  @IsMongoId()
  paymentId!: string;
}
