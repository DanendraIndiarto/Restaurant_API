import { PrismaClient, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  const username = 'adminrestaurant';
  const passwordPlain = 'restaurant123';

  // 1. Cek apakah user tersebut sudah ada
  const adminExists = await prisma.user.findUnique({
    where: { username },
  });

  // 2. Hash password baru
  const saltRounds = 10;
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
  const hashedPassword = await bcrypt.hash(passwordPlain, saltRounds);

  if (!adminExists) {
    // 3. Buat admin baru jika belum ada
    await prisma.user.create({
      data: {
        username: username,
        // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
        password: hashedPassword,
        role: Role.ADMIN,
      },
    });
    console.log(`✅ Admin berhasil dibuat: ${username}`);
  } else {
    // 4. Opsional: Update password jika admin sudah ada (agar sinkron dengan keinginan baru Anda)
    await prisma.user.update({
      where: { username },
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      data: { password: hashedPassword },
    });
    console.log(`ℹ️ Admin ${username} sudah ada, password telah diperbarui.`);
  }

  console.log('🚀 Seeder selesai.');
}

main()
  .catch((e) => {
    console.error('❌ Error seeder:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
