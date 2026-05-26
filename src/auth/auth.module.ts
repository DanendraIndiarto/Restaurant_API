import { Module } from '@nestjs/common';

import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';

import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

import { PrismaService } from 'src/prisma/prisma.service';

import { JwtStrategy } from './strategy/jwt.strategy';

@Module({
  imports: [
    PassportModule,

    JwtModule.register({
      secret: 'SECRET_KEY',

      signOptions: {
        expiresIn: '1d',
      },
    }),
  ],

  controllers: [AuthController],

  providers: [AuthService, PrismaService, JwtStrategy],

  exports: [JwtModule],
})
export class AuthModule {}
