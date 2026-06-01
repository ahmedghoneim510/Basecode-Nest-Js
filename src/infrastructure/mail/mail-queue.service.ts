import { Injectable } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { SendMailJob } from './mail.processor';

@Injectable()
export class MailQueueService {
  constructor(@InjectQueue('mail') private mailQueue: Queue<SendMailJob>) {}

  async sendVerificationEmail(to: string, code: string) {
    await this.mailQueue.add(
      'send-otp',
      { to, code, type: 'verification' },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
  }

  async sendPasswordResetEmail(to: string, code: string) {
    await this.mailQueue.add(
      'send-otp',
      { to, code, type: 'password-reset' },
      {
        attempts: 3,
        backoff: { type: 'exponential', delay: 2000 },
        removeOnComplete: true,
        removeOnFail: 50,
      },
    );
  }
}
