import { Controller, Get, Param, ParseIntPipe, Delete, Query, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Cached, Invalidate } from '../../common/decorators/cached.decorator';
import { Roles } from '../../common/decorators';
import { RolesGuard } from '../../common/guards';
import { CurrentUser } from '../../common/decorators';

@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('users')
export class UsersController {
  constructor(private usersService: UsersService) {}

  @Get()
  @Cached('users:all', 30)
  findAll(
    @Query('page') page?: string,
    @Query('perPage') perPage?: string,
  ) {
    return this.usersService.findAll({
      page: page ? parseInt(page, 10) : 1,
      perPage: perPage ? parseInt(perPage, 10) : 10,
    });
  }

  @Get(':id')
  @Cached('users:detail', 60)
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  @Delete(':id')
  @Roles('ADMIN')
  @Invalidate('users:all')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
