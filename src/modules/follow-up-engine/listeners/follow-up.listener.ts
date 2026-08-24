import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../shared/database/prisma.service';
import { ContextBuilderService } from '../../llm-orchestrator/services/context-builder.service';
import { HermesClientService } from '../../llm-orchestrator/services/hermes-client.service';

@Injectable()
export class FollowUpListenerService {
  private readonly logger = new Logger(FollowUpListenerService.name);

  constructor(
    private readonly contextBuilder: ContextBuilderService,
    private readonly hermesClient: HermesClientService,
    private readonly prisma: PrismaService
  ) {}

  @OnEvent('FOLLOW_UP_PENDING')
  async handleFollowUpPending(payload: any) {
    this.logger.log(`Procesando FOLLOW_UP_PENDING para conversation ${payload.conversationId}`);
    
    try {
      const messages = await this.contextBuilder.buildFollowUpContext(
        payload.tenantId,
        payload.contactId,
        payload.conversationId,
        payload.ruleApplied
      );
      
      const response = await this.hermesClient.generateResponse(messages);
      
      const content = response.content;
      
      if (!content) {
         this.logger.warn(`Hermes no generó contenido para FOLLOW_UP_PENDING ${payload.conversationId}`);
         return;
      }
      
      await this.prisma.pendingOutboundMessage.create({
        data: {
          tenantId: payload.tenantId,
          conversationId: payload.conversationId,
          contactId: payload.contactId,
          message: content,
          followUpId: payload.followUpId,
          status: 'PENDING'
        }
      });
      
      this.logger.log(`Follow-up context generado y guardado en PendingOutboundMessage (id: ${payload.followUpId})`);
    } catch (e: any) {
      this.logger.error(`Error procesando FOLLOW_UP_PENDING: ${e.message}`, e.stack);
    }
  }
}
