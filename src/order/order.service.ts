import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from './dto/update-order-status.dto';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateOrderDto, cashierId: number) {
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

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const paymentMethodEnum =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      dto.paymentMethod === 'QRIS' ? PaymentMethod.QRIS : PaymentMethod.CASH;

    return this.prisma.order.create({
      data: {
        customerName: dto.customerName,
        tableNumber: dto.tableNumber,
        total,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        paymentMethod: paymentMethodEnum,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        paymentStatus: PaymentStatus.UNPAID,
        cashierId: cashierId,
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
        cashier: true,
      },
    });
  }

  async findAll(cashierId?: number) {
    const where = cashierId ? { cashierId } : {};

    return this.prisma.order.findMany({
      where,
      include: {
        orderItems: {
          include: {
            menu: true,
          },
        },
        cashier: true,
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
        cashier: true,
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

  async updatePayment(id: number, paymentMethod: string, amount: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order tidak ditemukan');
    }

    // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
    const paymentMethodEnum =
      // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
      paymentMethod === 'CASH' ? PaymentMethod.CASH : PaymentMethod.QRIS;

    return this.prisma.order.update({
      where: { id },
      data: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        paymentMethod: paymentMethodEnum,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        paymentStatus: PaymentStatus.PAID,
        total: amount,
      },
    });
  }

  async remove(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
    });

    if (!order) {
      throw new NotFoundException('Order tidak ditemukan');
    }

    await this.prisma.orderItem.deleteMany({
      where: { orderId: id },
    });

    return this.prisma.order.delete({
      where: { id },
    });
  }

  async removeAll() {
    await this.prisma.orderItem.deleteMany();
    return this.prisma.order.deleteMany();
  }

  async history() {
    return this.prisma.order.findMany({
      include: {
        orderItems: {
          include: {
            menu: true,
          },
        },
        cashier: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async historyDetail(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: {
          include: {
            menu: true,
          },
        },
        cashier: true,
      },
    });

    if (!order) {
      throw new NotFoundException('History tidak ditemukan');
    }

    return order;
  }

  async report(type: string, userRole: string, userId: number) {
    const tz = 'Asia/Jakarta';
    const nowString = new Date().toLocaleString('en-US', { timeZone: tz });
    const now = new Date(nowString);

    const startDate = new Date(nowString);

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

    const offset =
      new Date().getTime() -
      new Date(new Date().toLocaleString('en-US', { timeZone: tz })).getTime();
    const targetUtcDate = new Date(startDate.getTime() + offset);

    const whereCondition: {
      createdAt: {
        gte: Date;
      };
      cashierId?: number;
    } = {
      createdAt: {
        gte: targetUtcDate,
      },
    };

    if (userRole === 'CASHIER') {
      whereCondition.cashierId = userId;
    }

    const orders = await this.prisma.order.findMany({
      where: whereCondition,
      include: {
        orderItems: {
          include: {
            menu: true,
          },
        },
        cashier: true,
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
      paymentMethod:
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        order.paymentMethod === PaymentMethod.CASH ? 'CASH' : 'QRIS',
      paymentStatus:
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        order.paymentStatus === PaymentStatus.PAID ? 'PAID' : 'UNPAID',
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      cashier: order.cashier?.username || 'Sistem',
      date: order.createdAt.toLocaleDateString('id-ID', { timeZone: tz }),
      time: order.createdAt
        .toLocaleTimeString('id-ID', { timeZone: tz })
        .replace(/\./g, ':'),
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
      items: order.orderItems.map((item) => ({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
        menu: item.menu.name,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
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
