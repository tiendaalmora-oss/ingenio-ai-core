import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../shared/database/prisma.service';
import { ContextBuilderService } from '../../llm-orchestrator/services/context-builder.service';
import { HermesClientService } from '../../llm-orchestrator/services/hermes-client.service';
import { sanitizeUserFacingResponse } from '../../llm-orchestrator/utils/response-sanitizer';

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
    this.logger.log(`Procesando FOLLOW_UP_PENDING para conversación ${payload.conversationId}`);
    
    try {
      let finalMessage = '';
      const rule = payload.ruleApplied || {};

      // Si la regla indica explícitamente usar un mensaje estático sin IA
      if (rule.mensaje && rule.usarIA === false) {
        const contact = await this.prisma.contact.findUnique({
          where: { id: payload.contactId }
        });
        finalMessage = rule.mensaje.replace(/\{nombre\}/gi, contact?.name || 'hola');
      } else {
        // Por defecto, Hermes genera un mensaje de seguimiento hiper-personalizado contextual
        const messages = await this.contextBuilder.buildFollowUpContext(
          payload.tenantId,
          payload.contactId,
          payload.conversationId,
          payload.ruleApplied
        );
        
        const response = await this.hermesClient.generateResponse(messages);
        if (response.content) {
          finalMessage = sanitizeUserFacingResponse(response.content);
        }
      }
      
      if (!finalMessage || finalMessage.trim() === '') {
        this.logger.warn(`Hermes no generó contenido para FOLLOW_UP_PENDING ${payload.conversationId}`);
        return;
      }
      
      await this.prisma.pendingOutboundMessage.create({
        data: {
          tenantId: payload.tenantId,
          conversationId: payload.conversationId,
          contactId: payload.contactId,
          message: finalMessage,
          followUpId: payload.followUpId,
          status: 'PENDING'
        }
      });
      
      this.logger.log(`✅ Mensaje de seguimiento generado y encolado (Regla: ${payload.followUpId})`);
    } catch (e: any) {
      this.logger.error(`Error procesando FOLLOW_UP_PENDING: ${e.message}`, e.stack);
    }
  }
}
