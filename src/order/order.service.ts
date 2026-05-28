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
  // 1. CREATE ORDER - FIXED (NO ESLINT ERRORS)
  // ==========================================
  async create(dto: CreateOrderDto, cashierId: number) {
    try {
      const assignedCashierId = cashierId === 0 ? null : cashierId;

      // Validasi
      if (!dto.total && dto.total !== 0) {
        throw new BadRequestException('Total tidak boleh kosong');
      }

      if (!dto.items || dto.items.length === 0) {
        throw new BadRequestException('Items tidak boleh kosong');
      }

      // Siapkan data items dengan tipe yang jelas
      const orderItemsData = dto.items.map((item) => ({
        menuId: item.menuId,
        qty: item.qty,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        subtotal: item.subtotal,
      }));

      const newOrder = await this.prisma.order.create({
        data: {
          customerName: dto.customerName,
          tableNumber: dto.tableNumber,
          total: dto.total,
          status: (dto.status ?? OrderStatus.PENDING) as OrderStatus,
          paymentMethod: (dto.paymentMethod ??
            PaymentMethod.CASH) as PaymentMethod,
          paymentStatus: (dto.paymentStatus ??
            PaymentStatus.UNPAID) as PaymentStatus,
          cashierId: assignedCashierId,
          orderItems: {
            create: orderItemsData,
          },
        },
      });

      return { message: 'Order berhasil dibuat', data: newOrder };
    } catch (error) {
      console.error('CRASH CREATE ORDER:', error);

      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === 'P2003') {
          throw new BadRequestException('Menu ID tidak valid');
        }
      }

      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Terjadi kesalahan saat membuat order',
      );
    }
  }

  // ==========================================
  // 2. REPORT
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
        throw new BadRequestException(
          'Tipe laporan tidak valid. Gunakan daily, weekly, monthly, atau yearly.',
        );
      }

      const whereClause: Prisma.OrderWhereInput = {
        createdAt: {
          gte: startDate,
          lte: now,
        },
      };

      if (role === 'CASHIER') {
        whereClause.cashierId = userId;
      }

      const ordersRaw = await this.prisma.order.findMany({
        where: whereClause,
        include: {
          cashier: {
            select: { username: true },
          },
          orderItems: {
            include: {
              menu: {
                select: { name: true },
              },
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      const totalOrders = ordersRaw.length;
      const totalIncome = ordersRaw.reduce(
        (sum, order) => sum + (order.total || 0),
        0,
      );

      const formattedOrders = ordersRaw.map((order) => {
        const dateObj = new Date(order.createdAt);

        return {
          id: order.id,
          customerName: order.customerName,
          tableNumber: order.tableNumber,
          total: order.total,
          status: order.status,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          date: dateObj.toLocaleDateString('id-ID'),
          time: dateObj.toLocaleTimeString('id-ID', {
            hour: '2-digit',
            minute: '2-digit',
          }),
          cashier: order.cashier?.username || 'Public / QR',
          items: order.orderItems.map((item) => ({
            menu: item.menu?.name || 'Menu Dihapus',
            qty: item.qty,
            subtotal: item.subtotal,
          })),
        };
      });

      return {
        type,
        totalOrders,
        totalIncome,
        orders: formattedOrders,
      };
    } catch (error) {
      console.error('ERROR DI ORDER SERVICE:', error);
      throw new InternalServerErrorException(
        error instanceof Error
          ? error.message
          : 'Terjadi kesalahan sistem saat memuat laporan',
      );
    }
  }

  // ==========================================
  // 3. HISTORY ALL
  // ==========================================
  async history() {
    return this.prisma.order.findMany({
      include: {
        cashier: { select: { username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  // ==========================================
  // 4. HISTORY DETAIL
  // ==========================================
  async historyDetail(id: number) {
    return this.prisma.order.findUnique({
      where: { id },
      include: {
        cashier: { select: { username: true } },
        orderItems: { include: { menu: true } },
      },
    });
  }

  // ==========================================
  // 5. GET ALL ORDER
  // ==========================================
  async findAll(cashierId?: number) {
    if (cashierId) {
      return this.prisma.order.findMany({
        where: { cashierId },
        include: { orderItems: { include: { menu: true } } },
      });
    }
    return this.prisma.order.findMany({
      include: { orderItems: { include: { menu: true } } },
    });
  }

  // ==========================================
  // 6. UPDATE STATUS
  // ==========================================
  async updateStatus(id: number, status: OrderStatus) {
    return this.prisma.order.update({
      where: { id },
      data: { status },
    });
  }

  // ==========================================
  // 7. UPDATE PAYMENT
  // ==========================================
  async updatePayment(
    id: number,
    paymentMethod: PaymentMethod,
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    _amount: number,
  ) {
    return this.prisma.order.update({
      where: { id },
      data: {
        paymentMethod,
        paymentStatus: PaymentStatus.PAID,
      },
    });
  }

  // ==========================================
  // 8. REMOVE SINGLE
  // ==========================================
  async remove(id: number) {
    return this.prisma.order.delete({ where: { id } });
  }

  // ==========================================
  // 9. REMOVE ALL
  // ==========================================
  async removeAll() {
    return this.prisma.order.deleteMany();
  }

  // ==========================================
  // 10. FIND ONE
  // ==========================================
  async findOne(id: number) {
    return this.prisma.order.findUnique({
      where: { id },
      include: { orderItems: { include: { menu: true } } },
    });
  }
}
