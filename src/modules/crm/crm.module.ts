import { Module } from '@nestjs/common';
import { CrmController } from './crm.controller';
import { CrmEventListenerService } from './services/crm-event-listener.service';
import { PrismaContactRepository } from './services/prisma-contact.repository';
import { PrismaService } from '../../shared/database/prisma.service';
import { CONTACT_REPOSITORY } from './ports/out/contact-repository.interface';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [CrmController],
  providers: [
    PrismaService,
    CrmEventListenerService,
    {
      provide: CONTACT_REPOSITORY,
      useClass: PrismaContactRepository,
    },
  ],
  exports: [],
})
export class CrmModule {}

