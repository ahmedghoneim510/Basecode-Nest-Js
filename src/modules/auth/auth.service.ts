import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { MailQueueService } from '../../infrastructure/mail/mail-queue.service';
import { TranslationService } from '../../shared/i18n/translation.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private config: ConfigService,
    private mailQueue: MailQueueService,
    private trans: TranslationService,
  ) {}

  // ─── REGISTER ──────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException(this.trans.t('auth.email_exists'));
    }

    const hashedPassword = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
      },
    });

    const otp = await this.createOtp(user.id, 'EMAIL_VERIFICATION');
    await this.mailQueue.sendVerificationEmail(user.email, otp);

    const { password, refreshToken, ...result } = user;
    return {
      message: this.trans.t('auth.register_success'),
      user: result,
    };
  }

  // ─── VERIFY EMAIL ──────────────────────────────────────────────────────────

  async verifyEmail(email: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException(this.trans.t('auth.invalid_email'));
    }

    if (user.isVerified) {
      throw new BadRequestException(this.trans.t('auth.email_already_verified'));
    }

    await this.verifyOtp(user.id, code, 'EMAIL_VERIFICATION');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true },
    });

    const tokens = await this.generateTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      message: this.trans.t('auth.email_verified'),
      ...tokens,
    };
  }

  // ─── RESEND VERIFICATION OTP ───────────────────────────────────────────────

  async resendVerificationOtp(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException(this.trans.t('auth.invalid_email'));
    }

    if (user.isVerified) {
      throw new BadRequestException(this.trans.t('auth.email_already_verified'));
    }

    const otp = await this.createOtp(user.id, 'EMAIL_VERIFICATION');
    await this.mailQueue.sendVerificationEmail(user.email, otp);

    return { message: this.trans.t('auth.verification_otp_sent') };
  }

  // ─── LOGIN ─────────────────────────────────────────────────────────────────

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return null;
    }

    const { password: _, refreshToken, ...result } = user;
    return result;
  }

  async login(user: { id: number; email: string; isVerified: boolean }) {
    if (!user.isVerified) {
      throw new ForbiddenException(this.trans.t('auth.login_unverified'));
    }

    const tokens = await this.generateTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    const { isVerified, ...userData } = user;
    return {
      user: userData,
      ...tokens,
    };
  }

  // ─── REFRESH TOKEN ─────────────────────────────────────────────────────────

  async refreshTokens(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken, {
        secret: this.config.get('jwt.refreshSecret'),
      });

      const user = await this.prisma.user.findUnique({
        where: { id: payload.sub },
      });

      if (!user || !user.refreshToken) {
        throw new ForbiddenException(this.trans.t('auth.access_denied'));
      }

      const isRefreshTokenValid = await bcrypt.compare(
        refreshToken,
        user.refreshToken,
      );

      if (!isRefreshTokenValid) {
        throw new ForbiddenException(this.trans.t('auth.access_denied'));
      }

      const tokens = await this.generateTokens(user.id, user.email);
      await this.updateRefreshToken(user.id, tokens.refreshToken);

      return tokens;
    } catch {
      throw new ForbiddenException(this.trans.t('auth.invalid_refresh_token'));
    }
  }

  // ─── LOGOUT ────────────────────────────────────────────────────────────────

  async logout(userId: number) {
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: null },
    });

    return { message: this.trans.t('auth.logged_out') };
  }

  // ─── FORGOT PASSWORD ───────────────────────────────────────────────────────

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (!user) {
      return { message: this.trans.t('auth.reset_email_sent') };
    }

    const otp = await this.createOtp(user.id, 'PASSWORD_RESET');
    await this.mailQueue.sendPasswordResetEmail(user.email, otp);

    return { message: this.trans.t('auth.reset_email_sent') };
  }

  // ─── RESET PASSWORD ────────────────────────────────────────────────────────

  async resetPassword(email: string, code: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException(this.trans.t('auth.invalid_request'));
    }

    await this.verifyOtp(user.id, code, 'PASSWORD_RESET');

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        refreshToken: null,
      },
    });

    return { message: this.trans.t('auth.password_reset') };
  }

  // ─── CHANGE PASSWORD ───────────────────────────────────────────────────────

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }

    const isValid = await bcrypt.compare(currentPassword, user.password);
    if (!isValid) {
      throw new BadRequestException(this.trans.t('auth.current_password_incorrect'));
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        refreshToken: null,
      },
    });

    const tokens = await this.generateTokens(user.id, user.email);
    await this.updateRefreshToken(user.id, tokens.refreshToken);

    return {
      message: this.trans.t('auth.password_changed'),
      ...tokens,
    };
  }

  // ─── GET PROFILE ───────────────────────────────────────────────────────────

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new UnauthorizedException();
    }

    const { password, refreshToken, ...result } = user;
    return result;
  }

  // ─── HELPERS ───────────────────────────────────────────────────────────────

  private async createOtp(userId: number, type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET'): Promise<string> {
    await this.prisma.otp.updateMany({
      where: { userId, type, used: false },
      data: { used: true },
    });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    await this.prisma.otp.create({
      data: {
        code: await bcrypt.hash(code, 10),
        type,
        expiresAt,
        userId,
      },
    });

    return code;
  }

  private async verifyOtp(userId: number, code: string, type: 'EMAIL_VERIFICATION' | 'PASSWORD_RESET') {
    const otps = await this.prisma.otp.findMany({
      where: {
        userId,
        type,
        used: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
      take: 1,
    });

    if (otps.length === 0) {
      throw new BadRequestException(this.trans.t('auth.otp_expired'));
    }

    const otp = otps[0];
    const isValid = await bcrypt.compare(code, otp.code);

    if (!isValid) {
      throw new BadRequestException(this.trans.t('auth.otp_invalid'));
    }

    await this.prisma.otp.update({
      where: { id: otp.id },
      data: { used: true },
    });
  }

  private async generateTokens(userId: number, email: string) {
    const payload = { sub: userId, email };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.config.get('jwt.secret'),
        expiresIn: this.config.get('jwt.expiration', '15m'),
      }),
      this.jwtService.signAsync(payload, {
        secret: this.config.get('jwt.refreshSecret'),
        expiresIn: this.config.get('jwt.refreshExpiration', '7d'),
      }),
    ]);

    return { accessToken, refreshToken };
  }

  private async updateRefreshToken(userId: number, refreshToken: string) {
    const hashed = await bcrypt.hash(refreshToken, 10);
    await this.prisma.user.update({
      where: { id: userId },
      data: { refreshToken: hashed },
    });
  }
}
