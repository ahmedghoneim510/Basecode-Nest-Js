import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger } from '@nestjs/common';
import { Job } from 'bullmq';
import { MailService } from './mail.service';

export interface SendMailJob {
  to: string;
  code: string;
  type: 'verification' | 'password-reset';
}

@Processor('mail')
export class MailProcessor extends WorkerHost {
  private readonly logger = new Logger(MailProcessor.name);

  constructor(private mailService: MailService) {
    super();
  }

  async process(job: Job<SendMailJob>): Promise<void> {
    const { to, code, type } = job.data;

    this.logger.log(`Processing mail job ${job.id} → ${type} to ${to}`);

    try {
      if (type === 'verification') {
        await this.mailService.sendVerificationEmail(to, code);
      } else if (type === 'password-reset') {
        await this.mailService.sendPasswordResetEmail(to, code);
      }

      this.logger.log(`Mail job ${job.id} completed`);
    } catch (error) {
      this.logger.error(`Mail job ${job.id} failed: ${error.message}`);
      throw error;
    }
  }
}
