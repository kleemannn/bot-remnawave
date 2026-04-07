import { Type } from 'class-transformer';
import { IsInt, IsNotEmpty, IsPositive, IsString } from 'class-validator';

export class WebappCreateSubscriptionDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  days!: number;
}
