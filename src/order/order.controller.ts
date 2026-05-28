import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
  Req,
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
    return this.orderService.create(dto, 0);
  }

  // =========================
  // REPORT
  // =========================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CASHIER', 'ADMIN')
  @Get('report/:type')
  report(@Param('type') type: string, @Req() req) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const userRole = req.user.role;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const userId = req.user.id;

    return this.orderService.report(type, userRole, userId);
  }

  // =========================
  // HISTORY PEMBELIAN
  // =========================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CASHIER')
  @Get('history/all')
  history() {
    return this.orderService.history();
  }

  // =========================
  // DETAIL HISTORY
  // =========================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CASHIER')
  @Get('history/:id')
  historyDetail(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.historyDetail(id);
  }

  // =========================
  // GET ALL ORDER
  // =========================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CASHIER', 'ADMIN')
  @Get()
  findAll(@Req() req) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const userId = req.user.id;

    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-assignment
    const userRole = req.user.role;

    // ADMIN lihat semua
    if (userRole === 'ADMIN') {
      return this.orderService.findAll();
    }

    // CASHIER lihat order miliknya
    return this.orderService.findAll(userId);
  }

  // =========================
  // UPDATE STATUS
  // =========================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CASHIER')
  @Patch(':id')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateStatus(id, dto.status);
  }

  // =========================
  // UPDATE PAYMENT
  // =========================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CASHIER')
  @Patch(':id/payment')
  updatePayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { paymentMethod: string; amount: number },
  ) {
    return this.orderService.updatePayment(id, body.paymentMethod, body.amount);
  }

  // =========================
  // DELETE ORDER
  // =========================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.remove(id);
  }

  // =========================
  // DELETE ALL ORDER
  // =========================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('all/clear')
  removeAll() {
    return this.orderService.removeAll();
  }

  // =========================
  // DETAIL ORDER
  // TARUH PALING BAWAH
  // =========================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CASHIER', 'ADMIN')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.findOne(id);
  }
}
