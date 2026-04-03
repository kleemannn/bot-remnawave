import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsPositive, IsString, MaxLength } from 'class-validator';

export class CreateSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(64)
  username!: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  days!: number;
}
