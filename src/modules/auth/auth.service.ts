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
import { ResponseService } from '../../shared/response/response.service';
import { PasswordService } from './services/password.service';
import { TokenService } from './services/token.service';
import { OtpService } from './services/otp.service';
import { UserEntity } from '../users/entities/user.entity';
import { OtpType } from './enums/otp-type.enum';
import { AUTH_MESSAGES } from './constants/auth-messages';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private mailQueue: MailQueueService,
    private trans: TranslationService,
    private response: ResponseService,
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
      throw new ConflictException(this.trans.t(AUTH_MESSAGES.EMAIL_EXISTS));
    }

    const hashedPassword = await this.passwordService.hash(dto.password);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        name: dto.name,
      },
    });

    const otp = await this.otpService.create(user.id, OtpType.EMAIL_VERIFICATION);
    await this.mailQueue.sendVerificationEmail(user.email, otp);

    return this.response.success(
      { user: new UserEntity(user) },
      AUTH_MESSAGES.REGISTER_SUCCESS,
    );
  }

  // ─── VERIFY EMAIL ──────────────────────────────────────────────────────────

  async verifyEmail(email: string, code: string) {
    const user = await this.findUserByEmailOrFail(email);

    if (user.isVerified) {
      throw new BadRequestException(this.trans.t(AUTH_MESSAGES.EMAIL_ALREADY_VERIFIED));
    }

    await this.otpService.verify(user.id, code, OtpType.EMAIL_VERIFICATION);

    await this.prisma.user.update({
      where: { id: user.id },
      data: { isVerified: true },
    });

    const tokens = await this.tokenService.generateTokens(user.id, user.email);
    await this.tokenService.storeRefreshToken(user.id, tokens.refreshToken);

    return this.response.success(tokens, AUTH_MESSAGES.EMAIL_VERIFIED);
  }

  // ─── RESEND VERIFICATION OTP ───────────────────────────────────────────────

  async resendVerificationOtp(email: string) {
    const user = await this.findUserByEmailOrFail(email);

    if (user.isVerified) {
      throw new BadRequestException(this.trans.t(AUTH_MESSAGES.EMAIL_ALREADY_VERIFIED));
    }

    const otp = await this.otpService.create(user.id, OtpType.EMAIL_VERIFICATION);
    await this.mailQueue.sendVerificationEmail(user.email, otp);

    return this.response.message(AUTH_MESSAGES.VERIFICATION_OTP_SENT);
  }

  // ─── LOGIN ─────────────────────────────────────────────────────────────────

  async validateUser(email: string, password: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) return null;

    const isValid = await this.passwordService.compare(password, user.password);
    if (!isValid) return null;

    return user;
  }

  async login(user: { id: number; email: string; isVerified: boolean }) {
    if (!user.isVerified) {
      throw new ForbiddenException(this.trans.t(AUTH_MESSAGES.LOGIN_UNVERIFIED));
    }

    const tokens = await this.tokenService.generateTokens(user.id, user.email);
    await this.tokenService.storeRefreshToken(user.id, tokens.refreshToken);

    return this.response.success(
      { user: new UserEntity(user), ...tokens },
      AUTH_MESSAGES.LOGIN_SUCCESS,
    );
  }

  // ─── REFRESH TOKEN ─────────────────────────────────────────────────────────

  async refreshTokens(userId: number, email: string) {
    const tokens = await this.tokenService.generateTokens(userId, email);
    await this.tokenService.storeRefreshToken(userId, tokens.refreshToken);
    return this.response.success(tokens);
  }

  // ─── LOGOUT ────────────────────────────────────────────────────────────────

  async logout(userId: number) {
    await this.tokenService.revokeRefreshToken(userId);
    return this.response.message(AUTH_MESSAGES.LOGGED_OUT);
  }

  // ─── FORGOT PASSWORD ───────────────────────────────────────────────────────

  async forgotPassword(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });

    if (user) {
      const otp = await this.otpService.create(user.id, OtpType.PASSWORD_RESET);
      await this.mailQueue.sendPasswordResetEmail(user.email, otp);
    }

    return this.response.message(AUTH_MESSAGES.RESET_EMAIL_SENT);
  }

  // ─── RESET PASSWORD ────────────────────────────────────────────────────────

  async resetPassword(email: string, code: string, newPassword: string) {
    const user = await this.findUserByEmailOrFail(email);

    await this.otpService.verify(user.id, code, OtpType.PASSWORD_RESET);

    const hashedPassword = await this.passwordService.hash(newPassword);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        refreshToken: null,
      },
    });

    return this.response.message(AUTH_MESSAGES.PASSWORD_RESET);
  }

  // ─── CHANGE PASSWORD ───────────────────────────────────────────────────────

  async changePassword(userId: number, currentPassword: string, newPassword: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();

    const isValid = await this.passwordService.compare(currentPassword, user.password);
    if (!isValid) {
      throw new BadRequestException(this.trans.t(AUTH_MESSAGES.CURRENT_PASSWORD_INCORRECT));
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

    return this.response.success(tokens, AUTH_MESSAGES.PASSWORD_CHANGED);
  }

  // ─── GET PROFILE ───────────────────────────────────────────────────────────

  async getProfile(userId: number) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new UnauthorizedException();
    return this.response.success(new UserEntity(user));
  }

  // ─── PRIVATE HELPERS ───────────────────────────────────────────────────────

  private async findUserByEmailOrFail(email: string) {
    const user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      throw new BadRequestException(this.trans.t(AUTH_MESSAGES.INVALID_EMAIL));
    }
    return user;
  }
}
