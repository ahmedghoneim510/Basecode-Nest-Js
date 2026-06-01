import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../../infrastructure/prisma/prisma.service';
import { MailQueueService } from '../../infrastructure/mail/mail-queue.service';
import { TranslationService } from '../../shared/i18n/translation.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { OtpService } from './services/otp.service';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private mailQueue: MailQueueService,
    private trans: TranslationService,
    private passwordService: PasswordService,
    private tokenService: TokenService,
    private otpService: OtpService,
  ) {}

  // ─── REGISTER ──────────────────────────────────────────────────────────────

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new ConflictException(this.trans.t('auth.email_exists'));
    }

    const hashedPassword = await this.passwordService.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
      },
    });

    const otp = await this.otpService.create(user.id, 'EMAIL_VERIFICATION');
    await this.mailQueue.sendVerificationEmail(user.email, otp);

    const { password, refreshToken, ...result } = user;
    return {
      message: this.trans.t('auth.register_success'),
      user: result,
    };
  }

  // ─── VERIFY EMAIL ──────────────────────────────────────────────────────────

  async verifyEmail(email: string, code: string) {
    const user = await this.findUserByEmailOrFail(email);

    if (user.isVerified) {
      throw new BadRequestException(this.trans.t('auth.email_already_verified'));
    }

    await this.otpService.verify(user.id, code, 'EMAIL_VERIFICATION');

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true },
    });

    const tokens = await this.tokenService.generateTokens(user.id, user.email);
    await this.tokenService.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      message: this.trans.t('auth.email_verified'),
      ...tokens,
    };
  }

  // ─── RESEND VERIFICATION OTP ───────────────────────────────────────────────

  async resendVerificationOtp(email: string) {
    const user = await this.findUserByEmailOrFail(email);

    if (user.isVerified) {
      throw new BadRequestException(this.trans.t('auth.email_already_verified'));
    }

    const otp = await this.otpService.create(user.id, 'EMAIL_VERIFICATION');
    await this.mailQueue.sendVerificationEmail(user.email, otp);

    return { message: this.trans.t('auth.verification_otp_sent') };
  }

  // ─── LOGIN ─────────────────────────────────────────────────────────────────

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;

    const isValid = await this.passwordService.compare(password, user.password);
    if (!isValid) return null;

    const { password: _, refreshToken, ...result } = user;
    return result;
  }

  async login(user: { id: number; email: string; isVerified: boolean }) {
    if (!user.isVerified) {
      throw new ForbiddenException(this.trans.t('auth.login_unverified'));
    }

    const tokens = await this.tokenService.generateTokens(user.id, user.email);
    await this.tokenService.storeRefreshToken(user.id, tokens.refreshToken);

    const { isVerified, ...userData } = user;
    return {
      user: userData,
      ...tokens,
    };
  }

  // ─── REFRESH TOKEN ─────────────────────────────────────────────────────────

  async refreshTokens(userId: number, email: string) {
    const tokens = await this.tokenService.generateTokens(userId, email);
    await this.tokenService.storeRefreshToken(userId, tokens.refreshToken);
    return tokens;
  }

  // ─── LOGOUT ────────────────────────────────────────────────────────────────

  async logout(userId: number) {
    await this.tokenService.revokeRefreshToken(userId);
    return { message: this.trans.t('auth.logged_out') };
  }

  // ─── FORGOT PASSWORD ───────────────────────────────────────────────────────

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    // Don't reveal if user exists (security best practice)
    if (user) {
      const otp = await this.otpService.create(user.id, 'PASSWORD_RESET');
      await this.mailQueue.sendPasswordResetEmail(user.email, otp);
    }

    return { message: this.trans.t('auth.reset_email_sent') };
  }

  // ─── RESET PASSWORD ────────────────────────────────────────────────────────

  async resetPassword(email: string, code: string, newPassword: string) {
    const user = await this.findUserByEmailOrFail(email);

    await this.otpService.verify(user.id, code, 'PASSWORD_RESET');

    const hashedPassword = await this.passwordService.hash(newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        refreshToken: null, // revoke all sessions
      },
    });

    return { message: this.trans.t('auth.password_reset') };
  }

  // ─── CHANGE PASSWORD ───────────────────────────────────────────────────────

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const isValid = await this.passwordService.compare(currentPassword, user.password);
    if (!isValid) {
      throw new BadRequestException(this.trans.t('auth.current_password_incorrect'));
    }

    const hashedPassword = await this.passwordService.hash(newPassword);

    await this.prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        refreshToken: null,
      },
    });

    const tokens = await this.tokenService.generateTokens(user.id, user.email);
    await this.tokenService.storeRefreshToken(user.id, tokens.refreshToken);

    return {
      message: this.trans.t('auth.password_changed'),
      ...tokens,
    };
  }

  // ─── GET PROFILE ───────────────────────────────────────────────────────────

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const { password, refreshToken, ...result } = user;
    return result;
  }

  // ─── PRIVATE HELPERS ───────────────────────────────────────────────────────

  private async findUserByEmailOrFail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException(this.trans.t('auth.invalid_email'));
    }
    return user;
  }
}
