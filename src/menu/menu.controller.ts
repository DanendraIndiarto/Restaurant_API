import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';

import { diskStorage } from 'multer';

import { extname } from 'path';

import { MenuService } from './menu.service';

import { CreateMenuDto } from './dto/create-menu.dto';
import { UpdateMenuDto } from './dto/update-menu.dto';

import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guard/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';

@Controller('menu')
export class MenuController {
  constructor(private readonly menuService: MenuService) {}

  // PUBLIC: hanya menu aktif
  @Get()
  findAll() {
    return this.menuService.findAll();
  }

  // ADMIN: semua menu (termasuk nonaktif)
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Get('admin/all')
  findAllForAdmin() {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    return this.menuService.findAllForAdmin();
  }

  // PUBLIC
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.findOne(id);
  }

  // ADMIN ONLY
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Post()
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueName = Date.now() + extname(file.originalname);
          callback(null, uniqueName);
        },
      }),
    }),
  )
  create(
    @Body() dto: CreateMenuDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (file) {
      dto.image = file.filename;
    }
    return this.menuService.create(dto);
  }

  // ADMIN ONLY
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id')
  @UseInterceptors(
    FileInterceptor('image', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueName = Date.now() + extname(file.originalname);
          callback(null, uniqueName);
        },
      }),
    }),
  )
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateMenuDto,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (file) {
      dto.image = file.filename;
    }
    return this.menuService.update(id, dto);
  }

  // ADMIN ONLY - SOFT DELETE
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.menuService.remove(id);
  }

  // ADMIN ONLY - RESTORE MENU
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('ADMIN')
  @Patch(':id/restore')
  restore(@Param('id', ParseIntPipe) id: number) {
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-unsafe-call
    return this.menuService.restore(id);
  }
}
