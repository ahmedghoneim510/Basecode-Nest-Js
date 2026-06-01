import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';

export interface TokenPayload {
  sub: number;
  email: string;
}

export interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

@Injectable()
export class TokenService {
  constructor(
    private jwtService: JwtService,
    private config: ConfigService,
    private prisma: PrismaService,
  ) {}

  async generateTokens(userId: number, email: string): Promise<TokenPair> {
    const payload: TokenPayload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow('jwt.secret'),
        expiresIn: this.config.get('jwt.expiration', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.getOrThrow('jwt.refreshSecret'),
        expiresIn: this.config.get('jwt.refreshExpiration', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  async storeRefreshToken(userId: number, refreshToken: string): Promise<void> {
    const hashed = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashed },
    });
  }

  async validateRefreshToken(userId: number, refreshToken: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user?.refreshToken) return false;
    return bcrypt.compare(refreshToken, user.refreshToken);
  }

  async revokeRefreshToken(userId: number): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });
  }

  verifyRefreshToken(token: string): TokenPayload {
    return this.jwtService.verify<TokenPayload>(token, {
      secret: this.config.getOrThrow('jwt.refreshSecret'),
    });
  }
}
