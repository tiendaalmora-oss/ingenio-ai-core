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

      // CASO A: WAHA (WhatsApp Gateway)
      if (body.event === 'message' || body.event === 'message.any') {
        if (body.payload?.fromMe) {
          this.logger.debug('Ignoring outbound message (fromMe: true)');
          return;
        }
        if (body.event === 'message.any') return;

        contactId = body.payload?.from;
        
        if (contactId && contactId.endsWith('@g.us')) {
          this.logger.debug(`Ignoring group message: ${contactId}`);
          return;
        }

        tenantId = await this.tenantResolver.resolveFromWahaSession(body.session || 'default');

        // Sincronizar la sesión activa de WAHA en el tenant para garantizar que los envíos salientes usen la sesión correcta
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

        // Procesamiento Multimedia vs Texto
        const hasMedia = body.payload?.hasMedia || Boolean(body.payload?.media);
        const media = body.payload?.media || {};
        const mimetype = (media.mimetype || body.payload?._data?.mimetype || '').toLowerCase();
        const messageType = (body.payload?.type || '').toLowerCase();

        // 1. Audio o Nota de Voz
        if (hasMedia && (mimetype.startsWith('audio/') || messageType === 'ptt' || messageType === 'audio')) {
          this.logger.log(`Procesando nota de voz entrante de ${contactId}...`);
          content = await this.audioTranscriptionService.transcribe(media);
        }
        // 2. Imagen o Captura de Comprobante
        else if (hasMedia && (mimetype.startsWith('image/') || messageType === 'image')) {
          this.logger.log(`Procesando imagen entrante de ${contactId}...`);
          const caption = body.payload?.body || body.payload?.caption || '';
          content = await this.mediaVisionService.analyzeImage(media, caption);
        }
        // 3. Mensaje de Texto Normal
        else {
          content = body.payload?.body || '';
        }
      }
      // CASO B: Meta Cloud API Oficial (Instagram Direct / Facebook Messenger)
      else if (body.object === 'page' || body.object === 'instagram') {
        const messaging = body.entry?.[0]?.messaging?.[0];
        if (!messaging || !messaging.message || messaging.message.is_echo) {
          this.logger.debug('Ignoring non-message or echo event from Meta');
          return;
        }

        contactId = messaging.sender?.id;
        tenantId = await this.tenantResolver.resolveFromWahaSession('ferreos');

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
        tenantId = await this.tenantResolver.resolveFromWahaSession(body.session || 'ferreos');
      }

      if (!contactId || !content) {
        this.logger.warn('Ignoring webhook event: missing contactId or content');
        return;
      }

      await this.receiveMessageService.execute(tenantId, contactId, content);
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
