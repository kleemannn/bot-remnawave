import { DealerTag } from '@prisma/client';
import { Type } from 'class-transformer';
import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsPositive,
  IsString,
  Matches,
  Min,
} from 'class-validator';

export class AddDealerDto {
  @IsString()
  @Matches(/^\d+$/)
  telegramId!: string;

  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsEnum(DealerTag)
  tag!: DealerTag;

  @Type(() => Number)
  @IsInt()
  @IsPositive()
  accessDays!: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  keyLimit!: number;
}
