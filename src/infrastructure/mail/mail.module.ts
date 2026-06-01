import { Global, Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MailService } from './mail.service';
import { MailQueueService } from './mail-queue.service';
import { MailProcessor } from './mail.processor';

@Global()
@Module({
  imports: [
    BullModule.registerQueue({ name: 'mail' }),
  ],
  providers: [MailService, MailQueueService, MailProcessor],
  exports: [MailService, MailQueueService],
})
export class MailModule {}
