import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { Prisma } from '@prisma/client';

@Injectable()
export class UserRepository {
  constructor(private prisma: PrismaService) {}

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async findById(id: number) {
    return this.prisma.user.findUnique({ where: { id } });
  }

  async create(data: Prisma.UserCreateInput) {
    return this.prisma.user.create({ data });
  }

  async findAll() {
    return this.prisma.user.findMany({
      select: { id: true, email: true, name: true, role: true, createdAt: true },
    });
  }

  async findByIdWithProfile(id: number) {
    return this.prisma.user.findUnique({
      where: { id },
      include: { profile: true, post: true },
    });
  }

  async findPaginated(page: number, perPage: number) {
    return this.prisma.user.findMany({
      skip: (page - 1) * perPage,
      take: perPage,
      select: { id: true, email: true, name: true, role: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(id: number, data: Prisma.UserUpdateInput) {
    return this.prisma.user.update({ where: { id }, data });
  }

  async delete(id: number) {
    return this.prisma.user.delete({ where: { id } });
  }

  async findByRole(role: 'USER' | 'ADMIN') {
    return this.prisma.user.findMany({ where: { role } });
  }

  async count() {
    return this.prisma.user.count();
  }
}
