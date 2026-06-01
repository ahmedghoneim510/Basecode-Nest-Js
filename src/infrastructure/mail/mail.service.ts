import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter;

  constructor(private config: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: this.config.get('mail.host'),
      port: this.config.get<number>('mail.port'),
      secure: false,
      auth: {
        user: this.config.get('mail.user'),
        pass: this.config.get('mail.pass'),
      },
    });
  }

  async sendOtp(to: string, code: string, subject: string) {
    this.logger.log(`Sending "${subject}" email to ${to}`);

    await this.transporter.sendMail({
      from: this.config.get('mail.from'),
      to,
      subject,
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>${subject}</h2>
          <p>Your verification code is:</p>
          <h1 style="letter-spacing: 8px; font-size: 36px; color: #333;">${code}</h1>
          <p>This code expires in 10 minutes.</p>
          <p>If you didn't request this, please ignore this email.</p>
        </div>
      `,
    });
  }

  async sendVerificationEmail(to: string, code: string) {
    return this.sendOtp(to, code, 'Verify Your Email');
  }

  async sendPasswordResetEmail(to: string, code: string) {
    return this.sendOtp(to, code, 'Reset Your Password');
  }
}
