import { Exclude, Expose } from 'class-transformer';
import { Role } from '@prisma/client';

export class UserEntity {
  @Expose()
  id: number;

  @Expose()
  email: string;

  @Expose()
  name: string | null;

  @Expose()
  role: Role;

  @Expose()
  createdAt: Date;

  @Expose()
  updatedAt: Date;

  @Exclude()
  password: string;

  @Exclude()
  refreshToken: string | null;

  @Exclude()
  isVerified: boolean;

  constructor(partial: Partial<UserEntity>) {
    Object.assign(this, partial);
  }
}
