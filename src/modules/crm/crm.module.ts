import { Module } from '@nestjs/common';
import { CrmEventListenerService } from './services/crm-event-listener.service';
import { PrismaContactRepository } from './services/prisma-contact.repository';
import { CONTACT_REPOSITORY } from './ports/out/contact-repository.interface';

@Module({
  imports: [],
  controllers: [],
  providers: [
    CrmEventListenerService,
    {
      provide: CONTACT_REPOSITORY,
      useClass: PrismaContactRepository,
    },
  ],
  exports: [],
})
export class CrmModule {}
