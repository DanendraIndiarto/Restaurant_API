import { Body, Controller, Post, UseGuards } from '@nestjs/common';

import { AuthService } from './auth.service';

import { JwtAuthGuard } from './guard/jwt-auth.guard';
import { RolesGuard } from './guard/roles.guard';
import { Roles } from './decorator/roles.decorator';

import { CreateCashierDto } from './dto/create-cashier.dto';
import { LoginDto } from './dto/login.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // LOGIN ADMIN / CASHIER
  @Post('login')
  login(@Body() dto: LoginDto) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-argument, @typescript-eslint/no-unsafe-member-access
    return this.authService.login(dto.username, dto.password);
  }

  // ADMIN ONLY
  @UseGuards(JwtAuthGuard, RolesGuard)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @Roles('ADMIN')
  @Post('create-cashier')
  createCashier(@Body() dto: CreateCashierDto) {
    return this.authService.createCashier(dto);
  }
}
