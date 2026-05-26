import { IsNotEmpty, IsString } from 'class-validator';

export class CreateCashierDto {
  @IsString()
  @IsNotEmpty()
  username!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;
}
