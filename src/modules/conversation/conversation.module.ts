import { Module } from '@nestjs/common';
import { MetaWebhookController } from './services/meta-webhook.controller';
import { ReceiveMessageService } from './services/receive-message.service';
import { PrismaConversationRepository } from './services/prisma-conversation.repository';
import { PrismaInteractionRepository } from './services/prisma-interaction.repository';
import { CONVERSATION_REPOSITORY } from './ports/out/conversation-repository.interface';
import { INTERACTION_REPOSITORY } from './ports/out/interaction-repository.interface';

@Module({
  imports: [],
  controllers: [MetaWebhookController],
  providers: [
    ReceiveMessageService,
    {
      provide: CONVERSATION_REPOSITORY,
      useClass: PrismaConversationRepository,
    },
    {
      provide: INTERACTION_REPOSITORY,
      useClass: PrismaInteractionRepository,
    },
  ],
  exports: [],
})
export class ConversationModule {}
