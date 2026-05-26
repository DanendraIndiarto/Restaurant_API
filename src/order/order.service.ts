import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from './dto/update-order-status.dto';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateOrderDto) {
    const menus = await Promise.all(
      dto.items.map(async (item) => {
        const menu = await this.prisma.menu.findUnique({
          where: {
            id: item.menuId,
          },
        });

        if (!menu) {
          throw new NotFoundException(
            `Menu dengan id ${item.menuId} tidak ditemukan`,
          );
        }

        return {
          menuId: item.menuId,
          qty: item.qty,
          subtotal: menu.price * item.qty,
        };
      }),
    );

    const total = menus.reduce(
      (accumulator, currentValue) => accumulator + currentValue.subtotal,
      0,
    );

    return this.prisma.order.create({
      data: {
        customerName: dto.customerName,
        tableNumber: dto.tableNumber,
        total,
        orderItems: {
          create: menus,
        },
      },
      include: {
        orderItems: {
          include: {
            menu: true,
          },
        },
      },
    });
  }

  async findAll() {
    return this.prisma.order.findMany({
      include: {
        orderItems: {
          include: {
            menu: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: {
            menu: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('Order tidak ditemukan');
    }

    return order;
  }

  async updateStatus(id: number, status: OrderStatus) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order tidak ditemukan');
    }

    return this.prisma.order.update({
      where: { id },
      data: { status },
    });
  }

  // HISTORY PEMBELIAN
  async history() {
    return this.prisma.order.findMany({
      include: {
        orderItems: {
          include: {
            menu: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // DETAIL HISTORY
  async historyDetail(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: {
            menu: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException('History tidak ditemukan');
    }

    return order;
  }

  // REPORT
  async report(type: string) {
    const now = new Date();

    const startDate = new Date();

    if (type === 'daily') {
      startDate.setHours(0, 0, 0, 0);
    } else if (type === 'weekly') {
      startDate.setDate(now.getDate() - 7);
    } else if (type === 'monthly') {
      startDate.setMonth(now.getMonth() - 1);
    } else if (type === 'yearly') {
      startDate.setFullYear(now.getFullYear() - 1);
    } else {
      throw new NotFoundException('Tipe report tidak valid');
    }

    const orders = await this.prisma.order.findMany({
      where: {
        createdAt: {
          gte: startDate,
        },
      },
      include: {
        orderItems: {
          include: {
            menu: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    const totalOrders = orders.length;

    const totalIncome = orders.reduce(
      (accumulator, order) => accumulator + order.total,
      0,
    );

    const formattedOrders = orders.map((order) => ({
      id: order.id,
      customerName: order.customerName,
      tableNumber: order.tableNumber,
      total: order.total,
      status: order.status,

      date: order.createdAt.toLocaleDateString('id-ID'),

      time: order.createdAt.toLocaleTimeString('id-ID'),

      items: order.orderItems.map((item) => ({
        menu: item.menu.name,
        qty: item.qty,
        subtotal: item.subtotal,
      })),
    }));

    return {
      type,
      totalOrders,
      totalIncome,
      orders: formattedOrders,
    };
  }
}
