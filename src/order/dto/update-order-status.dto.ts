import { IsEnum } from 'class-validator';

export enum OrderStatus {
  PENDING = 'PENDING',
  PROCESS = 'PROCESS',
  DONE = 'DONE',
  CANCEL = 'CANCEL',
}

export class UpdateOrderStatusDto {
  @IsEnum(OrderStatus)
  status!: OrderStatus;
}
