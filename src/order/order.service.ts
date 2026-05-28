import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import {
  PaymentStatus,
  OrderStatus,
  PaymentMethod,
  Prisma,
} from '@prisma/client';

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // CREATE ORDER (FIXED)
  // ==========================================
  async create(dto: CreateOrderDto, cashierId: number) {
    try {
      const assignedCashierId = cashierId === 0 ? null : cashierId;

      const { items, ...orderData } = dto as unknown as {
        customerName: string;
        tableNumber: string;
        total: number;
        status?: OrderStatus;
        paymentMethod?: PaymentMethod;
        paymentStatus?: PaymentStatus;
        items: Array<{ menuId: number; qty: number; subtotal: number }>;
      };

      // ✅ VALIDASI WAJIB
      if (!orderData.customerName || !orderData.tableNumber) {
        throw new BadRequestException('Customer & table wajib diisi');
      }

      if (orderData.total === null || orderData.total === undefined) {
        throw new BadRequestException('Total tidak boleh kosong');
      }

      if (!Array.isArray(items) || items.length === 0) {
        throw new BadRequestException('Items tidak boleh kosong');
      }

      const newOrder = await this.prisma.order.create({
        data: {
          customerName: orderData.customerName.trim(),
          tableNumber: orderData.tableNumber.trim(),
          total: orderData.total,
          status: orderData.status ?? OrderStatus.PENDING,
          paymentMethod: orderData.paymentMethod ?? PaymentMethod.CASH,
          paymentStatus: orderData.paymentStatus ?? PaymentStatus.UNPAID,
          cashierId: assignedCashierId,

          orderItems: {
            create: items.map((item) => ({
              menuId: item.menuId,
              qty: item.qty,
              subtotal: item.subtotal,
            })),
          },
        },
        include: {
          orderItems: true,
        },
      });

      return {
        message: 'Order berhasil dibuat',
        data: newOrder,
      };
    } catch (error) {
      console.error('CRASH CREATE ORDER:', error);

      if (error instanceof BadRequestException) throw error;

      throw new InternalServerErrorException(
        'Terjadi kesalahan saat membuat order',
      );
    }
  }

  // ==========================================
  // REPORT (UNCHANGED BUT SAFE)
  // ==========================================
  async report(type: string, role: string, userId: number) {
    try {
      const now = new Date();
      let startDate = new Date();

      if (type === 'daily') {
        startDate.setHours(0, 0, 0, 0);
      } else if (type === 'weekly') {
        const day = startDate.getDay();
        const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
        startDate.setDate(diff);
        startDate.setHours(0, 0, 0, 0);
      } else if (type === 'monthly') {
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      } else if (type === 'yearly') {
        startDate = new Date(now.getFullYear(), 0, 1);
      } else {
        throw new BadRequestException('Tipe laporan tidak valid');
      }

      const whereClause: Prisma.OrderWhereInput = {
        createdAt: { gte: startDate, lte: now },
      };

      if (role === 'CASHIER') {
        whereClause.cashierId = userId;
      }

      const ordersRaw = await this.prisma.order.findMany({
        where: whereClause,
        include: {
          cashier: { select: { username: true } },
          orderItems: {
            include: {
              menu: { select: { name: true } },
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      });

      return {
        type,
        totalOrders: ordersRaw.length,
        totalIncome: ordersRaw.reduce((s, o) => s + (o.total ?? 0), 0),
        orders: ordersRaw,
      };
    } catch (error) {
      console.error('ERROR REPORT:', error);
      throw new InternalServerErrorException('Gagal ambil report');
    }
  }

  // ==========================================
  // SIMPLE CRUD (UNCHANGED)
  // ==========================================
  findAll(cashierId?: number) {
    return this.prisma.order.findMany({
      where: cashierId ? { cashierId } : undefined,
      include: { orderItems: { include: { menu: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  findOne(id: number) {
    return this.prisma.order.findUnique({
      where: { id },
      include: { orderItems: { include: { menu: true } } },
    });
  }

  updateStatus(id: number, status: OrderStatus) {
    return this.prisma.order.update({
      where: { id },
      data: { status },
    });
  }

  async updatePayment(id: number, paymentMethod: PaymentMethod) {
    return this.prisma.order.update({
      where: { id },
      data: {
        paymentMethod,
        paymentStatus: PaymentStatus.PAID,
      },
    });
  }

  remove(id: number) {
    return this.prisma.order.delete({ where: { id } });
  }

  removeAll() {
    return this.prisma.order.deleteMany();
  }
}
