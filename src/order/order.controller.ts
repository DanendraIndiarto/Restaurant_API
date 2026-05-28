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
  NotFoundException,
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

  // CREATE (PUBLIC)
  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.orderService.create(dto, 0);
  }

  // REPORT
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CASHIER', 'ADMIN')
  @Get('report/:type')
  report(@Param('type') type: string, @Req() req) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (!req.user) {
      throw new NotFoundException('Unauthorized');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.orderService.report(type, req.user.role, req.user.id);
  }

  // HISTORY ALL
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CASHIER')
  @Get('history/all')
  history() {
    return this.orderService.history();
  }

  // HISTORY DETAIL (HARUS DI ATAS /:id)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CASHIER')
  @Get('history/detail/:id')
  historyDetail(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.historyDetail(id);
  }

  // GET ALL
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CASHIER')
  @Get()
  findAll(@Req() req) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
    if (req.user.role === 'ADMIN') {
      return this.orderService.findAll();
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.orderService.findAll(req.user.id);
  }

  // UPDATE STATUS
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CASHIER')
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateOrderStatusDto,
  ) {
    return this.orderService.updateStatus(id, dto.status);
  }

  // UPDATE PAYMENT
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CASHIER')
  @Patch(':id/payment')
  updatePayment(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: { paymentMethod: string; amount: number },
  ) {
    return this.orderService.updatePayment(id, body.paymentMethod, body.amount);
  }

  // DELETE
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.remove(id);
  }

  // DELETE ALL
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('all/clear')
  removeAll() {
    return this.orderService.removeAll();
  }

  // DETAIL ORDER
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CASHIER')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.findOne(id);
  }
}
