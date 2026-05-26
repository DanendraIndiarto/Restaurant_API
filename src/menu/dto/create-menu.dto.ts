import { IsInt, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { Type } from 'class-transformer';

export class CreateMenuDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @Type(() => Number)
  @IsInt()
  price!: number;

  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsOptional()
  @IsString()
  image?: string;

  @Type(() => Number)
  @IsInt()
  categoryId!: number;
}
