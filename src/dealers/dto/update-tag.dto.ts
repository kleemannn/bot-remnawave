import { DealerTag } from '@prisma/client';
import { IsEnum } from 'class-validator';

export class UpdateTagDto {
  @IsEnum(DealerTag)
  tag!: DealerTag;
}
