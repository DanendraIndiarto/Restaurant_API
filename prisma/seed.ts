import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const adminExists = await prisma.user.findUnique({
    where: {
      username: 'admin',
    },
  });

  const cashierExists = await prisma.user.findUnique({
    where: {
      username: 'kasir',
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const adminPassword = await bcrypt.hash('admin123', 10);

  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const cashierPassword = await bcrypt.hash('kasir123', 10);

  if (!adminExists) {
    await prisma.user.create({
      data: {
        username: 'admin',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        password: adminPassword,
        role: Role.ADMIN,
      },
    });

    console.log('Admin berhasil dibuat');
  } else {
    console.log('Admin sudah ada');
  }

  if (!cashierExists) {
    await prisma.user.create({
      data: {
        username: 'kasir',
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        password: cashierPassword,
        role: Role.CASHIER,
      },
    });

    console.log('Kasir berhasil dibuat');
  } else {
    console.log('Kasir sudah ada');
  }

  console.log('Seeder berhasil');
}

main()
  .catch((e) => {
    console.error(e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
