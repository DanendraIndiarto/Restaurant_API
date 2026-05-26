import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { OrderService } from './order.service';

import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guard/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // PUBLIC (customer tanpa login)
  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.orderService.create(dto);
  }

  // CASHIER & ADMIN
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CASHIER', 'ADMIN')
  @Get()
  findAll() {
    return this.orderService.findAll();
  }

  // CASHIER & ADMIN
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CASHIER', 'ADMIN')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.findOne(id);
  }

  // CASHIER ONLY
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CASHIER')
  @Patch(':id')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateStatus(id, dto.status);
  }

  // HISTORY PEMBELIAN
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CASHIER')
  @Get('history/all')
  history() {
    return this.orderService.history();
  }

  // DETAIL HISTORY
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CASHIER')
  @Get('history/:id')
  historyDetail(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.historyDetail(id);
  }

  // REPORT
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CASHIER', 'ADMIN')
  @Get('report/:type')
  report(@Param('type') type: string) {
    return this.orderService.report(type);
  }
}
