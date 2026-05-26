import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateMenuDto) {
    return this.prisma.menu.create({
      data: dto,
      include: {
        category: true,
      },
    });
  }

  async findAll() {
    return this.prisma.menu.findMany({
      include: {
        category: true,
      },
    });
  }

  async findOne(id: number) {
    const menu = await this.prisma.menu.findUnique({
      where: { id },
      include: {
        category: true,
      },
    });

    if (!menu) {
      throw new NotFoundException('Menu tidak ditemukan');
    }

    return menu;
  }

  async update(id: number, dto: UpdateMenuDto) {
    const menu = await this.prisma.menu.findUnique({
      where: { id },
    });

    if (!menu) {
      throw new NotFoundException('Menu tidak ditemukan');
    }

    return this.prisma.menu.update({
      where: { id },
      data: dto,
      include: {
        category: true,
      },
    });
  }

  async remove(id: number) {
    const menu = await this.prisma.menu.findUnique({
      where: { id },
    });

    if (!menu) {
      throw new NotFoundException('Menu tidak ditemukan');
    }

    return this.prisma.menu.delete({
      where: { id },
    });
  }
}
