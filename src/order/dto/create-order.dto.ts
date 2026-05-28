import {
  IsArray,
  IsNotEmpty,
  IsString,
  ValidateNested,
  IsOptional,
  IsIn,
  IsInt,
} from 'class-validator';

import { Type } from 'class-transformer';
import { CreateOrderItemDto } from './create-order-item.dto';

export class CreateOrderDto {
  @IsString()
  @IsNotEmpty()
  customerName!: string;

  @IsString()
  @IsNotEmpty()
  tableNumber!: string;

  @IsInt()
  total!: number;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateOrderItemDto)
  items!: CreateOrderItemDto[];

  @IsOptional()
  @IsString()
  @IsIn(['CASH', 'QRIS'])
  paymentMethod?: string = 'CASH';

  @IsOptional()
  @IsIn(['UNPAID', 'PAID'])
  paymentStatus?: string = 'UNPAID';
}
