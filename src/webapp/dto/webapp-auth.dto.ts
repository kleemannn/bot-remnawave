import { IsNotEmpty, IsString } from 'class-validator';

export class WebappAuthDto {
  @IsString()
  @IsNotEmpty()
  initData!: string;
}
