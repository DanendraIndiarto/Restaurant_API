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

      if (!dto.total && dto.total !== 0) {
        throw new BadRequestException('Total tidak boleh kosong');
      }

      if (!dto.items || dto.items.length === 0) {
        throw new BadRequestException('Items tidak boleh kosong');
      }

      // Ambil harga menu dari database
      const menuIds = dto.items.map((item) => item.menuId);
      const menus = await this.prisma.menu.findMany({
        where: { id: { in: menuIds } },
        select: { id: true, price: true },
      });

      const menuPriceMap = new Map(menus.map((m) => [m.id, m.price]));

      // Hitung subtotal otomatis
      const orderItemsData = dto.items.map((item) => {
        const price = menuPriceMap.get(item.menuId);
        if (!price) {
          throw new BadRequestException(
            `Menu dengan ID ${item.menuId} tidak ditemukan`,
          );
        }
        return {
          menuId: item.menuId,
          qty: item.qty,
          subtotal: price * item.qty,
        };
      });

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

      // Set ke WIB (UTC+7)
      const wibOffset = 7 * 60 * 60 * 1000;
      const nowWIB = new Date(now.getTime() + wibOffset);

      let startDateWIB = new Date(nowWIB);

      if (type === 'daily') {
        startDateWIB.setHours(0, 0, 0, 0);
      } else if (type === 'weekly') {
        const day = startDateWIB.getDay();
        const diff = startDateWIB.getDate() - day + (day === 0 ? -6 : 1);
        startDateWIB.setDate(diff);
        startDateWIB.setHours(0, 0, 0, 0);
      } else if (type === 'monthly') {
        startDateWIB = new Date(nowWIB.getFullYear(), nowWIB.getMonth(), 1);
      } else if (type === 'yearly') {
        startDateWIB = new Date(nowWIB.getFullYear(), 0, 1);
      } else {
        throw new BadRequestException(
          'Tipe laporan tidak valid. Gunakan daily, weekly, monthly, atau yearly.',
        );
      }

      const startDateUTC = new Date(startDateWIB.getTime() - wibOffset);
      const endDateUTC = new Date(nowWIB.getTime() - wibOffset);
      endDateUTC.setHours(23, 59, 59, 999);

      const whereClause: Prisma.OrderWhereInput = {
        createdAt: {
          gte: startDateUTC,
          lte: endDateUTC,
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
        const dateUTC = new Date(order.createdAt);
        const dateWIB = new Date(dateUTC.getTime() + wibOffset);

        return {
          id: order.id,
          customerName: order.customerName,
          tableNumber: order.tableNumber,
          total: order.total,
          status: order.status,
          paymentMethod: order.paymentMethod,
          paymentStatus: order.paymentStatus,
          date: dateWIB.toLocaleDateString('id-ID'),
          time: dateWIB.toLocaleTimeString('id-ID', {
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
      // Kasir: lihat order miliknya ATAU order dari user (cashierId = null)
      return this.prisma.order.findMany({
        where: {
          OR: [{ cashierId: cashierId }, { cashierId: null }],
        },
        include: {
          orderItems: {
            include: { menu: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      });
    }
    // Admin: lihat semua order
    return this.prisma.order.findMany({
      include: { orderItems: { include: { menu: true } } },
      orderBy: { createdAt: 'desc' },
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

  // ==========================================
  // 11. CLAIM ORDER (CASHIER CLAIM ORDER FROM USER)
  // ==========================================
  async claimOrder(orderId: number, cashierId: number) {
    // Cek apakah order ada
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new BadRequestException('Order tidak ditemukan');
    }

    // Cek apakah order sudah diambil kasir lain
    if (order.cashierId !== null) {
      throw new BadRequestException('Pesanan sudah diambil oleh kasir lain');
    }

    // Update cashierId
    return this.prisma.order.update({
      where: { id: orderId },
      data: { cashierId: cashierId },
    });
  }
}
