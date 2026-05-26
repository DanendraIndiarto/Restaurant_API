import { Module } from '@nestjs/common';
import { PrismaModule } from './prisma/prisma.module';
import { MenuModule } from './menu/menu.module';
import { CategoryModule } from './category/category.module';
import { OrderModule } from './order/order.module';
import { AuthModule } from './auth/auth.module';

@Module({
  imports: [PrismaModule, MenuModule, CategoryModule, OrderModule, AuthModule],
})
export class AppModule {}
