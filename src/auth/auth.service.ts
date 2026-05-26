import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { PrismaService } from 'src/prisma/prisma.service';

import * as bcrypt from 'bcrypt';
import { JwtService } from '@nestjs/jwt';

import { Role } from '@prisma/client';
import { CreateCashierDto } from './dto/create-cashier.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async login(username: string, password: string) {
    const user = await this.prisma.user.findUnique({
      where: { username },
    });

    if (!user) {
      throw new UnauthorizedException('User tidak ditemukan');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const valid = await bcrypt.compare(password, user.password);

    if (!valid) {
      throw new UnauthorizedException('Password salah');
    }

    return {
      access_token: this.jwtService.sign({
        sub: user.id,
        username: user.username,
        role: user.role,
      }),
    };
  }

  async createCashier(dto: CreateCashierDto) {
    const existingUser = await this.prisma.user.findUnique({
      where: {
        username: dto.username,
      },
    });

    if (existingUser) {
      throw new BadRequestException('Username sudah digunakan');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        username: dto.username,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        password: hashedPassword,
        role: Role.CASHIER,
      },
    });
  }
}
