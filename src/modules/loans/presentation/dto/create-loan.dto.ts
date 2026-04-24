import { Type } from 'class-transformer';
import {
  IsDefined,
  IsIn,
  IsInt,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  Validate,
  ValidateNested,
  ValidationArguments,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

import { LoanInterestType } from '../loans.types';

@ValidatorConstraint({ name: 'interestRateRequiredForInterestType', async: false })
class InterestRateRequiredForInterestTypeConstraint
  implements ValidatorConstraintInterface
{
  validate(value: CreateLoanDto): boolean {
    if (value.interestType === 'none') {
      return value.interestRate === undefined;
    }

    return value.interestRate !== undefined;
  }

  defaultMessage(validationArguments?: ValidationArguments): string {
    const dto = validationArguments?.object as CreateLoanDto | undefined;

    return dto?.interestType === 'none'
      ? 'interestRate must not be provided when interestType is none'
      : 'interestRate is required when interestType is simple or compound';
  }
}

export class CreateLoanInstallmentPlanDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  count!: number;
}

export class CreateLoanDto {
  @IsOptional()
  @IsString()
  contactId?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  principalAmountCents!: number;

  @IsIn(['none', 'simple', 'compound'])
  interestType!: LoanInterestType;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 6 })
  @Min(0)
  interestRate?: number;

  @IsISO8601({ strict: true })
  startDate!: string;

  @IsOptional()
  @IsDefined()
  @ValidateNested()
  @Type(() => CreateLoanInstallmentPlanDto)
  installmentPlan?: CreateLoanInstallmentPlanDto;

  @Validate(InterestRateRequiredForInterestTypeConstraint)
  private readonly interestRateRequiredForInterestType: CreateLoanDto = this;
}
