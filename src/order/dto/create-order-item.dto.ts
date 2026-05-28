import { IsInt, Min } from 'class-validator';

export class CreateOrderItemDto {
  @IsInt()
  menuId!: number;

  @IsInt()
  @Min(1)
  qty!: number;
  subtotal: any;
}
