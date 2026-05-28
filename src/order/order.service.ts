import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; // Sesuaikan path jika folder prisma kamu berbeda
import { CreateOrderDto } from './dto/create-order.dto';
import { PaymentStatus } from '@prisma/client';

@Injectable()
export class OrderService {
  constructor(private readonly prisma: PrismaService) {}

  // ==========================================
  // 1. CREATE ORDER
  // ==========================================
  async create(dto: CreateOrderDto, cashierId: number) {
    try {
      // Menangani jika order dibuat oleh pelanggan langsung (cashierId = 0)
      const assignedCashierId = cashierId === 0 ? null : cashierId;

      // Destrukturisasi dto untuk memisahkan data order utama dan array items
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const { items, ...orderData } = dto as any;

      const newOrder = await this.prisma.order.create({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        data: {
          ...orderData,
          cashierId: assignedCashierId,
          orderItems: {
            // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
            create: items?.map((item: any) => ({
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              menuId: item.menuId,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              qty: item.qty,
              // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
              subtotal: item.subtotal,
            })),
          },
        },
        include: {
          orderItems: true,
        },
      });

      return { message: 'Order berhasil dibuat', data: newOrder };
    } catch (error) {
      console.error('CRASH CREATE ORDER:', error);
      throw new InternalServerErrorException('Gagal membuat order');
    }
  }

  // ==========================================
  // 2. REPORT (SINKRON DENGAN SCHEMA & FRONTEND)
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

      // Filter berdasarkan range tanggal
      const whereClause: any = {
        createdAt: {
          gte: startDate,
          lte: now,
        },
      };

      // Jika yang login CASHIER, batasi hanya melihat transaksi miliknya
      if (role === 'CASHIER') {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
        whereClause.cashierId = userId;
      }

      // Ambil data sesuai relasi nyata di schema.prisma kamu
      const ordersRaw = await this.prisma.order.findMany({
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        where: whereClause,
        include: {
          cashier: {
            select: { username: true }, // Model User menggunakan properti 'username'
          },
          orderItems: {
            include: {
              menu: {
                select: { name: true }, // Mengambil nama menu dari model Menu
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

      // Normalisasi data agar dibaca mulus oleh halaman page.tsx Next.js kamu
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
  // 5. GET ALL ORDER (DENGAN FILTER SINKRON KASIR)
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
  async updateStatus(id: number, status: any) {
    return this.prisma.order.update({
      where: { id },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: { status },
    });
  }

  // ==========================================
  // 7. UPDATE PAYMENT
  // ==========================================
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async updatePayment(id: number, paymentMethod: any, _amount: number) {
    // Logika opsional tambahan: bandingkan field 'amount' uang masuk dengan total belanja di sini jika perlu
    return this.prisma.order.update({
      where: { id },
      data: {
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        paymentMethod,
        paymentStatus: PaymentStatus.PAID, // Menggunakan enum PAID asli dari schema.prisma
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
