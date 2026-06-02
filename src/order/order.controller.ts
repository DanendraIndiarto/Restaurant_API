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
  UnauthorizedException,
} from '@nestjs/common';

import { OrderService } from './order.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guard/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';

interface RequestWithUser extends Request {
  user?: {
    id: number;
    username: string;
    role: 'ADMIN' | 'CASHIER';
  };
}

@Controller('order')
export class OrderController {
  constructor(private readonly orderService: OrderService) {}

  // =========================
  // CREATE (PUBLIC)
  // =========================
  @Post()
  create(@Body() dto: CreateOrderDto) {
    return this.orderService.create(dto, 0);
  }

  // =========================
  // REPORT (BASED CASHIER)
  // =========================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CASHIER')
  @Get('report/:type')
  report(@Param('type') type: string, @Req() req: RequestWithUser) {
    const user = req.user;

    if (!user?.id) {
      throw new UnauthorizedException(
        'Anda belum login atau token tidak valid',
      );
    }

    return this.orderService.report(type, user.role, user.id);
  }

  // =========================
  // HISTORY ALL
  // =========================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CASHIER')
  @Get('history/all')
  history() {
    return this.orderService.history();
  }

  // =========================
  // HISTORY DETAIL
  // =========================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CASHIER')
  @Get('history/detail/:id')
  historyDetail(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.historyDetail(id);
  }

  // =========================
  // GET ALL ORDER
  // =========================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CASHIER')
  @Get()
  findAll(@Req() req: RequestWithUser) {
    const user = req.user;

    if (!user?.id) {
      throw new UnauthorizedException('Anda belum login');
    }

    if (user.role === 'ADMIN') {
      return this.orderService.findAll();
    }

    return this.orderService.findAll(user.id);
  }

  // =========================
  // UPDATE STATUS
  // =========================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CASHIER')
  @Patch(':id/status')
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
    @Body() body: { paymentMethod: any; amount: number },
  ) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument
    return this.orderService.updatePayment(id, body.paymentMethod, body.amount);
  }

  // =========================
  // CLAIM ORDER (CASHIER CLAIM ORDER FROM USER)
  // =========================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('CASHIER')
  @Patch(':id/claim')
  claimOrder(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: RequestWithUser,
  ) {
    const user = req.user;
    if (!user?.id) {
      throw new UnauthorizedException('Anda belum login');
    }
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    return this.orderService.claimOrder(id, user.id);
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
  // DELETE ALL
  // =========================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete('all/clear')
  removeAll() {
    return this.orderService.removeAll();
  }

  // =========================
  // DETAIL ORDER
  // =========================
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN', 'CASHIER')
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.orderService.findOne(id);
  }
}
