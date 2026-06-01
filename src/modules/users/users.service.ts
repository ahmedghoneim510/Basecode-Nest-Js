import { Injectable, NotFoundException } from '@nestjs/common';
import { UserRepository } from './repositories/user.repository';
import { UserEntity } from './entities/user.entity';
import { TranslationService } from '../../shared/i18n/translation.service';
import { ResponseService } from '../../shared/response/response.service';
import { PaginationOptions } from '../../shared/response/response.interface';

@Injectable()
export class UsersService {
  constructor(
    private userRepo: UserRepository,
    private trans: TranslationService,
    private response: ResponseService,
  ) {}

  async findAll(options: PaginationOptions = {}) {
    const page = options.page || 1;
    const perPage = options.perPage || 10;

    const [users, total] = await Promise.all([
      this.userRepo.findPaginated(page, perPage),
      this.userRepo.count(),
    ]);

    const data = users.map((user) => new UserEntity(user));
    return this.response.paginate(data, total, { page, perPage });
  }

  async findOne(id: number) {
    const user = await this.userRepo.findByIdWithProfile(id);
    if (!user) {
      throw new NotFoundException(this.trans.t('user.not_found'));
    }
    return this.response.success(new UserEntity(user));
  }

  async update(id: number, data: { name?: string; email?: string }) {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundException(this.trans.t('user.not_found'));
    }
    const updated = await this.userRepo.update(id, data);
    return this.response.success(new UserEntity(updated), 'user.updated');
  }

  async remove(id: number) {
    const user = await this.userRepo.findById(id);
    if (!user) {
      throw new NotFoundException(this.trans.t('user.not_found'));
    }
    await this.userRepo.delete(id);
    return this.response.message('user.deleted');
  }
}
