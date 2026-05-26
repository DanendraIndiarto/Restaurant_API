import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';

import { CategoryService } from './category.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';

import { JwtAuthGuard } from 'src/auth/guard/jwt-auth.guard';
import { RolesGuard } from 'src/auth/guard/roles.guard';
import { Roles } from 'src/auth/decorator/roles.decorator';

@Controller('category')
export class CategoryController {
  constructor(private readonly categoryService: CategoryService) {}

  // PUBLIC
  @Get()
  findAll() {
    return this.categoryService.findAll();
  }

  // PUBLIC
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.findOne(id);
  }

  // ADMIN ONLY
  @UseGuards(JwtAuthGuard, RolesGuard)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @Roles('ADMIN')
  @Post()
  create(@Body() dto: CreateCategoryDto) {
    return this.categoryService.create(dto);
  }

  // ADMIN ONLY
  @UseGuards(JwtAuthGuard, RolesGuard)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @Roles('ADMIN')
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCategoryDto,
  ) {
    return this.categoryService.update(id, dto);
  }

  // ADMIN ONLY
  @UseGuards(JwtAuthGuard, RolesGuard)
  // eslint-disable-next-line @typescript-eslint/no-unsafe-call
  @Roles('ADMIN')
  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.categoryService.remove(id);
  }
}
