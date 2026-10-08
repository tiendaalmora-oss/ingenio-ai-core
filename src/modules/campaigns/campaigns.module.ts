import { Module } from '@nestjs/common';
import { DatabaseModule } from '../../shared/database/database.module';
import { OutboundEngineModule } from '../outbound-engine/outbound-engine.module';
import { CampaignsService } from './campaigns.service';
import { CampaignsController } from './campaigns.controller';
import { CampaignDripProcessor } from './processors/campaign-drip.processor';
import { EmailSenderService } from './services/email-sender.service';
import { PrismaService } from '../../shared/database/prisma.service';

@Module({
  imports: [DatabaseModule, OutboundEngineModule],
  controllers: [CampaignsController],
  providers: [
    PrismaService,
    CampaignsService,
    CampaignDripProcessor,
    EmailSenderService,
  ],
  exports: [CampaignsService],
})
export class CampaignsModule {}
