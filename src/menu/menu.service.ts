import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';

@Injectable()
export class MenuService {
  constructor(private prisma: PrismaService) {}

  // PUBLIC: hanya menu yang aktif
  async findAll() {
    return this.prisma.menu.findMany({
      where: { isActive: true },
      include: {
        category: true,
      },
    });
  }

  // ADMIN: semua menu (termasuk yang nonaktif)
  async findAllForAdmin() {
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

  async create(dto: CreateMenuDto) {
    return this.prisma.menu.create({
      data: {
        ...dto,
        isActive: true, // menu baru langsung aktif
      },
      include: {
        category: true,
      },
    });
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

  // SOFT DELETE: hanya nonaktifkan
  async remove(id: number) {
    const menu = await this.prisma.menu.findUnique({
      where: { id },
    });

    if (!menu) {
      throw new NotFoundException('Menu tidak ditemukan');
    }

    return this.prisma.menu.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // RESTORE: mengaktifkan kembali
  async restore(id: number) {
    const menu = await this.prisma.menu.findUnique({
      where: { id },
    });

    if (!menu) {
      throw new NotFoundException('Menu tidak ditemukan');
    }

    return this.prisma.menu.update({
      where: { id },
      data: { isActive: true },
    });
  }
}
