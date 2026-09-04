import { Controller, Get, Post, Body, Query, Res, HttpStatus, Logger } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ReceiveMessageService } from './receive-message.service';
import { TenantResolverService } from '../../tenant/services/tenant-resolver.service';
import { PrismaService } from '../../../shared/database/prisma.service';
import { AudioTranscriptionService } from '../../media-processing/services/audio-transcription.service';
import { MediaVisionService } from '../../media-processing/services/media-vision.service';

@Controller('webhooks/meta')
export class MetaWebhookController {
  private readonly logger = new Logger(MetaWebhookController.name);

  constructor(
    private readonly receiveMessageService: ReceiveMessageService,
    private readonly tenantResolver: TenantResolverService,
    private readonly prisma: PrismaService,
    private readonly audioTranscriptionService: AudioTranscriptionService,
    private readonly mediaVisionService: MediaVisionService
  ) {}

  /**
   * GET /webhooks/meta
   * Endpoint de verificación estándar de Meta (Facebook Messenger & Instagram Direct)
   */
  @Get()
  verifyToken(@Query() query: any, @Res() res: FastifyReply) {
    const mode = query['hub.mode'];
    const token = query['hub.verify_token'];
    const challenge = query['hub.challenge'];
    const expectedToken = process.env.META_VERIFY_TOKEN || 'ingenio_meta_secret';

    if (mode === 'subscribe' && (token === expectedToken || !token)) {
      this.logger.log('Meta Webhook verified successfully!');
      return res.status(HttpStatus.OK).send(challenge);
    }
    return res.status(HttpStatus.FORBIDDEN).send('Forbidden');
  }

  /**
   * POST /webhooks/meta
   * Recepción unificada de eventos de WhatsApp (WAHA) y Meta (Instagram/Messenger) con soporte multimedia
   */
  @Post()
  async receiveMessage(@Body() body: any, @Res() res: FastifyReply) {
    this.logger.debug(`Webhook received: event=${body?.event || body?.object} session=${body?.session}`);

    // 1. Responder INMEDIATAMENTE a Meta / WAHA con 200 OK para evitar retries
    res.status(HttpStatus.OK).send('EVENT_RECEIVED');

    // 2. Procesamiento Asíncrono
    try {
      let tenantId = '';
      let contactId = '';
      let content = '';

      let pushName: string | undefined = undefined;

      // CASO A: WAHA (WhatsApp Gateway)
      if (body.event === 'message' || body.event === 'message.any') {
        const payload = body.payload || {};
        const isFromMe = Boolean(payload.fromMe);

        // 1. Extraer identificador real de WhatsApp (resolviendo @lid y sufijos de dispositivo :12)
        let rawTarget = isFromMe ? (payload.to || payload.from) : (payload.from || payload.to);
        if (rawTarget && rawTarget.includes('@lid')) {
          const candidate = payload._data?.key?.remoteJid || 
                            payload._data?.remoteJid || 
                            payload._data?.author || 
                            payload.author || 
                            payload.to;
          if (candidate && !candidate.includes('@lid') && (candidate.includes('@c.us') || candidate.includes('@s.whatsapp.net'))) {
            rawTarget = candidate;
          }
        }
        contactId = (rawTarget || '').replace(/:\d+@/, '@');

        if (contactId && contactId.endsWith('@g.us')) {
          this.logger.debug(`Ignoring group message: ${contactId}`);
          return;
        }

        tenantId = await this.tenantResolver.resolveFromWahaSession(body.session || 'default');

        // Sincronizar la sesión activa de WAHA en el tenant
        if (body.session && tenantId) {
          try {
            await this.prisma.tenant.update({
              where: { id: tenantId },
              data: { wahaSession: body.session }
            });
          } catch {
            // Ignorar si el tenant no existe aún
          }
        }

        // Extraer nombre del perfil de WhatsApp del usuario
        pushName = payload.notifyName || payload._data?.notifyName || payload.pushName || payload._data?.pushName;

        // 2. Si el mensaje fue enviado manualmente desde el teléfono físico (fromMe: true)
        if (isFromMe) {
          const manualText = payload.body || payload.caption || '';
          if (manualText && contactId && tenantId) {
            this.logger.log(`[WhatsApp Mobile Sync] Mensaje saliente manual detectado desde el teléfono físico para ${contactId}: "${manualText.substring(0, 40)}..."`);
            
            const cleanDigits = contactId.replace(/@(c\.us|lid|s\.whatsapp\.net)$/, '').replace(/\D/g, '');
            const existingContact = await this.prisma.contact.findFirst({
              where: {
                tenantId,
                OR: [
                  { externalId: contactId },
                  { phone: cleanDigits },
                  { phoneNormalized: cleanDigits }
                ]
              }
            });

            if (existingContact) {
              const conv = await this.prisma.conversation.findFirst({
                where: { contactId: existingContact.id }
              });

              if (conv) {
                // Registrar la respuesta en el historial del CRM
                await this.prisma.interaction.create({
                  data: {
                    conversationId: conv.id,
                    direction: 'OUTBOUND',
                    type: 'TEXT',
                    content: manualText,
                    role: 'assistant',
                  }
                });

                // Pausar el bot para permitir que el operador continúe la conversación
                await this.prisma.conversation.update({
                  where: { id: conv.id },
                  data: { status: 'HANDOFF' }
                });

                // Cancelar seguimientos automáticos pendientes
                await this.prisma.pendingOutboundMessage.deleteMany({
                  where: { conversationId: conv.id }
                });

                this.logger.log(`[WhatsApp Mobile Sync] Conversación ${conv.id} sincronizada y pausada en HANDOFF.`);
              }
            }
          }
          return;
        }

        if (body.event === 'message.any') return;

        // Procesamiento Multimedia vs Texto
        const hasMedia = payload.hasMedia || Boolean(payload.media);
        const media = payload.media || {};
        const mimetype = (media.mimetype || payload._data?.mimetype || '').toLowerCase();
        const messageType = (payload.type || '').toLowerCase();

        // 1. Audio o Nota de Voz
        if (hasMedia && (mimetype.startsWith('audio/') || messageType === 'ptt' || messageType === 'audio')) {
          this.logger.log(`Procesando nota de voz entrante de ${contactId}...`);
          content = await this.audioTranscriptionService.transcribe(media);
        }
        // 2. Imagen o Captura de Comprobante
        else if (hasMedia && (mimetype.startsWith('image/') || messageType === 'image')) {
          this.logger.log(`Procesando imagen entrante de ${contactId}...`);
          const caption = payload.body || payload.caption || '';
          content = await this.mediaVisionService.analyzeImage(media, caption);
        }
        // 3. Mensaje de Texto Normal
        else {
          content = payload.body || '';
        }
      }
      // CASO B: Meta Cloud API Oficial (Instagram Direct / Facebook Messenger)
      else if (body.object === 'page' || body.object === 'instagram') {
        const entry = body.entry?.[0];
        const messaging = entry?.messaging?.[0];
        if (!messaging || !messaging.message || messaging.message.is_echo) {
          this.logger.debug('Ignoring non-message or echo event from Meta');
          return;
        }

        const isInstagram = body.object === 'instagram' || String(entry?.id || '').startsWith('ig_');
        const prefix = isInstagram ? 'ig_' : 'fb_';
        contactId = `${prefix}${messaging.sender?.id}`;

        // Resolver tenant dinámicamente
        const defaultTenant = await this.prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
        tenantId = defaultTenant?.id || 'dba1c54c-89c6-41e9-ae9d-03613377a5b3';

        const attachment = messaging.message?.attachments?.[0];
        if (attachment?.type === 'audio') {
          content = await this.audioTranscriptionService.transcribe({ url: attachment.payload?.url });
        } else if (attachment?.type === 'image') {
          content = await this.mediaVisionService.analyzeImage({ url: attachment.payload?.url }, messaging.message?.text);
        } else {
          content = messaging.message?.text;
        }
      }
      // CASO C: Fallback para testing manual
      else {
        contactId = body.contactId || 'contact-demo-123';
        content = body.content || 'Mensaje de prueba';
        const defaultTenant = await this.prisma.tenant.findFirst({ orderBy: { createdAt: 'asc' } });
        tenantId = defaultTenant?.id || 'dba1c54c-89c6-41e9-ae9d-03613377a5b3';
      }

      if (!contactId || !content) {
        this.logger.warn('Ignoring webhook event: missing contactId or content');
        return;
      }

      await this.receiveMessageService.execute(tenantId, contactId, content, pushName);
    } catch (error: any) {
      this.logger.error('Error processing Meta Webhook in background:', error.message);
      
      try {
        await this.prisma.incomingMessageFailure.create({
          data: {
            payload: body,
            error: error.message || 'Unknown error'
          }
        });
      } catch (dbError: any) {
        this.logger.error('Failed to persist IncomingMessageFailure:', dbError.message);
      }
    }
  }
}
