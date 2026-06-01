import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../../infrastructure/prisma/prisma.service';
import { TranslationService } from '../../../shared/i18n/translation.service';

type OtpType = 'EMAIL_VERIFICATION' | 'PASSWORD_RESET';

const OTP_EXPIRY_MINUTES = 10;
const OTP_MAX_ATTEMPTS = 5;

@Injectable()
export class OtpService {
  private readonly logger = new Logger(OtpService.name);

  constructor(
    private prisma: PrismaService,
    private trans: TranslationService,
  ) {}

  async create(userId: number, type: OtpType): Promise<string> {
    // Invalidate previous OTPs of same type
    await this.prisma.otp.updateMany({
      where: { userId, type, used: false },
      data: { used: true },
    });

    const code = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    await this.prisma.otp.create({
      data: {
        code: await bcrypt.hash(code, 10),
        type,
        expiresAt,
        userId,
      },
    });

    this.logger.debug(`OTP created for user ${userId} (type: ${type})`);
    return code;
  }

  async verify(userId: number, code: string, type: OtpType): Promise<void> {
    // Check attempt count (brute-force protection)
    const recentAttempts = await this.prisma.otp.count({
      where: {
        userId,
        type,
        createdAt: { gt: new Date(Date.now() - OTP_EXPIRY_MINUTES * 60 * 1000) },
      },
    });

    if (recentAttempts > OTP_MAX_ATTEMPTS) {
      throw new BadRequestException(this.trans.t('auth.otp_too_many_attempts'));
    }

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
}
