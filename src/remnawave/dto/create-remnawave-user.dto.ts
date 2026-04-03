import {
  IsDate,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateRemnawaveUserDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  squadId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(16)
  @Matches(/^[A-Z0-9_]+$/)
  tag?: string;

  @IsDate()
  expiresAt!: Date;
}
