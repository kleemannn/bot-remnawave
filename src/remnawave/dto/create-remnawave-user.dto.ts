import { IsDate, IsNotEmpty, IsString } from 'class-validator';

export class CreateRemnawaveUserDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  squadId!: string;

  @IsDate()
  expiresAt!: Date;
}
