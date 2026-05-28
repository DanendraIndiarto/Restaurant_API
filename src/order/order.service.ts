import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { PaymentMethod, PaymentStatus } from '@prisma/client';

import { CreateOrderDto } from './dto/create-order.dto';
import { OrderStatus } from './dto/update-order-status.dto';

@Injectable()
export class OrderService {
  constructor(private prisma: PrismaService) {}

  // =========================
  // CREATE ORDER
  // =========================
  async create(dto: CreateOrderDto, cashierId: number) {
    const menus = await Promise.all(
      dto.items.map(async (item) => {
        const menu = await this.prisma.menu.findUnique({
          where: { id: item.menuId },
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

    const total = menus.reduce((acc, item) => acc + item.subtotal, 0);

    return this.prisma.order.create({
      data: {
        customerName: dto.customerName,
        tableNumber: dto.tableNumber,
        total,
        paymentMethod:
          dto.paymentMethod === 'QRIS'
            ? PaymentMethod.QRIS
            : PaymentMethod.CASH,
        paymentStatus: PaymentStatus.UNPAID,
        cashierId,
        orderItems: {
          create: menus,
        },
      },
      include: {
        orderItems: { include: { menu: true } },
        cashier: true,
      },
    });
  }

  // =========================
  // GET ALL ORDER
  // =========================
  async findAll(cashierId?: number) {
    return this.prisma.order.findMany({
      where: cashierId ? { cashierId } : {},
      include: {
        orderItems: { include: { menu: true } },
        cashier: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // =========================
  // GET ONE ORDER
  // =========================
  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: { include: { menu: true } },
        cashier: true,
      },
    });

    if (!order) throw new NotFoundException('Order tidak ditemukan');

    return order;
  }

  // =========================
  // UPDATE STATUS
  // =========================
  async updateStatus(id: number, status: OrderStatus) {
    const order = await this.prisma.order.findUnique({ where: { id } });

    if (!order) throw new NotFoundException('Order tidak ditemukan');

    return this.prisma.order.update({
      where: { id },
      data: { status },
    });
  }

  // =========================
  // UPDATE PAYMENT
  // =========================
  async updatePayment(id: number, paymentMethod: string, amount: number) {
    const order = await this.prisma.order.findUnique({ where: { id } });

    if (!order) throw new NotFoundException('Order tidak ditemukan');

    return this.prisma.order.update({
      where: { id },
      data: {
        paymentMethod:
          paymentMethod === 'QRIS' ? PaymentMethod.QRIS : PaymentMethod.CASH,
        paymentStatus: PaymentStatus.PAID,
        total: amount,
      },
    });
  }

  // =========================
  // DELETE ORDER
  // =========================
  async remove(id: number) {
    const order = await this.prisma.order.findUnique({ where: { id } });

    if (!order) throw new NotFoundException('Order tidak ditemukan');

    await this.prisma.orderItem.deleteMany({
      where: { orderId: id },
    });

    return this.prisma.order.delete({ where: { id } });
  }

  // =========================
  // DELETE ALL ORDER
  // =========================
  async removeAll() {
    await this.prisma.orderItem.deleteMany();
    return this.prisma.order.deleteMany();
  }

  // =========================
  // HISTORY
  // =========================
  async history() {
    return this.prisma.order.findMany({
      include: {
        orderItems: { include: { menu: true } },
        cashier: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // =========================
  // HISTORY DETAIL
  // =========================
  async historyDetail(id: number) {
    const order = await this.prisma.order.findUnique({
      where: { id },
      include: {
        orderItems: { include: { menu: true } },
        cashier: true,
      },
    });

    if (!order) throw new NotFoundException('History tidak ditemukan');

    return order;
  }

  // =========================
  // REPORT (FIXED + CASHIER FILTER)
  // =========================
  async report(type: string, userRole: string, userId: number) {
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

    const where: {
      createdAt: { gte: Date };
      cashierId?: number;
    } = {
      createdAt: { gte: startDate },
    };

    // 🔥 INI PENTING: laporan per kasir
    if (userRole === 'CASHIER') {
      where.cashierId = userId;
    }

    const orders = await this.prisma.order.findMany({
      where,
      include: {
        orderItems: { include: { menu: true } },
        cashier: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const totalOrders = orders.length;

    const totalIncome = orders.reduce((sum, order) => {
      return sum + (order.total || 0);
    }, 0);

    return {
      type,
      totalOrders,
      totalIncome,
      orders: orders.map((order) => {
        const createdAt = order.createdAt;

        return {
          id: order.id,
          customerName: order.customerName,
          tableNumber: order.tableNumber,
          total: order.total,
          status: order.status,

          paymentMethod:
            order.paymentMethod === PaymentMethod.CASH ? 'CASH' : 'QRIS',

          paymentStatus:
            order.paymentStatus === PaymentStatus.PAID ? 'PAID' : 'UNPAID',

          cashier: order.cashier?.username ?? 'Sistem',

          date: createdAt.toLocaleDateString('id-ID'),

          time: createdAt.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          }),

          items: order.orderItems.map((item) => ({
            menu: item.menu?.name ?? 'Menu',
            qty: item.qty,
            subtotal: item.subtotal,
          })),
        };
      }),
    };
  }
}
