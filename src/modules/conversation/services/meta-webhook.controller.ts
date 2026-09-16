import { Controller, Get, Post, Body, Query, Res, HttpStatus, Logger } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ReceiveMessageService } from './receive-message.service';
import { TenantResolverService } from '../../tenant/services/tenant-resolver.service';
import { PrismaService } from '../../../shared/database/prisma.service';
import { AudioTranscriptionService } from '../../media-processing/services/audio-transcription.service';
import { MediaVisionService } from '../../media-processing/services/media-vision.service';
import { WahaAdapterService } from '../../outbound-engine/services/waha-adapter.service';

@Controller('webhooks/meta')
export class MetaWebhookController {
  private readonly logger = new Logger(MetaWebhookController.name);

  constructor(
    private readonly receiveMessageService: ReceiveMessageService,
    private readonly tenantResolver: TenantResolverService,
    private readonly prisma: PrismaService,
    private readonly audioTranscriptionService: AudioTranscriptionService,
    private readonly mediaVisionService: MediaVisionService,
    private readonly wahaAdapter: WahaAdapterService,
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

        // ── CASO A1: Mensaje SALIENTE desde el teléfono físico (fromMe = true) ──
        // Sincronizar al CRM sin procesarlo con la IA, y pausar el bot de inmediato
        if (isFromMe) {
          // Extraer identificador de mensaje de WAHA
          const wahaMsgId = payload.id?._serialized || payload.id || payload._data?.id?._serialized || payload.key?.id || '';

          // 1. Si el mensaje fue enviado por nuestro propio sistema (bot o CRM dashboard), ignorar echo
          if (wahaMsgId && this.wahaAdapter.isSentBySystem(wahaMsgId)) {
            this.logger.debug(`[WAHA Echo] Mensaje saliente ${wahaMsgId} confirmado como enviado por el sistema. Ignorando.`);
            return;
          }

          tenantId = await this.tenantResolver.resolveFromWahaSession(body.session || 'default');
          if (!tenantId) return;

          // El destinatario real es payload.to (a quien le escribió el operador desde el teléfono)
          const toRaw = (payload.to || '').replace(/:\d+@/, '@');
          if (!toRaw || toRaw.endsWith('@g.us')) return; // ignorar grupos

          const toDigits = toRaw.replace(/@(c\.us|lid|s\.whatsapp\.net)$/, '').replace(/\D/g, '');
          let manualText = (payload.body || payload.caption || '').trim();

          // Detección multimedia para notas de voz o imágenes enviadas desde el teléfono
          const hasMedia = payload.hasMedia || Boolean(payload.media);
          const media = payload.media || {};
          const mimetype = (media.mimetype || payload._data?.mimetype || '').toLowerCase();
          const messageType = (payload.type || '').toLowerCase();

          if (!manualText && hasMedia) {
            if (mimetype.startsWith('audio/') || messageType === 'ptt' || messageType === 'audio') {
              manualText = '🎤 [Nota de voz enviada por el asesor]';
            } else if (mimetype.startsWith('image/') || messageType === 'image') {
              manualText = '📷 [Imagen enviada por el asesor]';
            } else {
              manualText = '📎 [Archivo enviado por el asesor]';
            }
          }

          if (!manualText) return;

          // 2. Doble chequeo anti-falso-positivo: ¿Existe una interacción saliente idéntica reciente (< 15s) en DB?
          // (Si el bot acababa de registrar este mismo texto, es un echo del bot)
          const toWithoutZero = toDigits.startsWith('0') ? toDigits.replace(/^0+/, '') : toDigits;
          const toWith58 = toDigits.startsWith('58') ? toDigits : (toWithoutZero ? `58${toWithoutZero}` : '');

          const existingContact = await this.prisma.contact.findFirst({
            where: {
              tenantId,
              OR: [
                { externalId: toRaw },
                { externalId: toDigits },
                { phone: toDigits },
                { phoneNormalized: toDigits },
                { phone: toWithoutZero },
                { phoneNormalized: toWithoutZero },
                { phone: toWith58 },
                { phoneNormalized: toWith58 },
              ]
            }
          });

          if (existingContact) {
            const conv = await this.prisma.conversation.findFirst({
              where: { contactId: existingContact.id },
              orderBy: { id: 'desc' }
            });

            if (conv) {
              const recentBotEcho = this.prisma.interaction?.findFirst
                ? await this.prisma.interaction.findFirst({
                    where: {
                      conversationId: conv.id,
                      direction: 'OUTBOUND',
                      role: 'assistant',
                      content: manualText,
                      timestamp: { gte: new Date(Date.now() - 15_000) }
                    }
                  })
                : null;
              if (recentBotEcho) {
                this.logger.debug(`[WAHA Echo] Mensaje saliente coincide con interacción reciente en DB (${conv.id}). Ignorando.`);
                return;
              }

              // Soporte para comandos de reactivación desde WhatsApp (#bot, #activar, #reactivar)
              const textNorm = manualText.trim().toLowerCase();
              if (textNorm === '#bot' || textNorm === '#activar' || textNorm === '#reactivar' || textNorm === '#play') {
                this.logger.log(`[Mobile Operator] Comando de reactivación recibido desde WhatsApp ("${textNorm}") para ${toRaw}. Reactivando bot en ACTIVE.`);
                await this.prisma.conversation.update({
                  where: { id: conv.id },
                  data: { status: 'ACTIVE' }
                });
                return;
              }

              this.logger.log(`[Mobile Operator Intercept] Operador intervino desde el teléfono para ${toRaw}: "${manualText.substring(0, 45)}...". Pausando bot en HANDOFF.`);

              // 1. Guardar la interacción del operador en la conversación
              await this.prisma.interaction.create({
                data: {
                  conversationId: conv.id,
                  direction: 'OUTBOUND',
                  type: 'TEXT',
                  content: manualText,
                  role: 'assistant',
                }
              });

              // 2. Pausar la conversación inmediatamente en HANDOFF
              await this.prisma.conversation.update({
                where: { id: conv.id },
                data: { status: 'HANDOFF' }
              });

              // 3. Cancelar de inmediato cualquier seguimiento pendiente para este contacto
              const deletedFollowUps = await this.prisma.pendingOutboundMessage.deleteMany({
                where: { conversationId: conv.id }
              });
              if (deletedFollowUps.count > 0) {
                this.logger.log(`[Mobile Sync] Cancelados ${deletedFollowUps.count} seguimientos pendientes para conversación ${conv.id}`);
              }

              // 4. Actualizar Business Memory del lead con tag de intervención manual
              try {
                const memory = await this.prisma.businessMemory.findUnique({ where: { contactId: existingContact.id } });
                const currentTags = (memory?.tags as string[]) || [];
                const updatedTags = Array.from(new Set([...currentTags, 'INTERVENCION_HUMANA', 'ATENCION_MANUAL']));
                await this.prisma.businessMemory.upsert({
                  where: { contactId: existingContact.id },
                  create: {
                    contactId: existingContact.id,
                    leadStatus: 'HANDOFF',
                    tags: updatedTags,
                  },
                  update: {
                    leadStatus: 'HANDOFF',
                    tags: updatedTags,
                  }
                });
              } catch (_) {}
            }
          }
          return; // No procesar con la IA
        }

        // ── CASO A2: Mensaje ENTRANTE del cliente (fromMe = false) ──
        if (body.event === 'message.any') return; // ignorar duplicados

        // El remitente real es payload.from
        contactId = (payload.from || '').replace(/:\d+@/, '@');

        if (!contactId || contactId.endsWith('@g.us')) {
          this.logger.debug(`Ignoring group or empty contactId: ${contactId}`);
          return;
        }

        tenantId = await this.tenantResolver.resolveFromWahaSession(body.session || 'default');

        // Sincronizar wahaSession en el tenant
        if (body.session && tenantId) {
          try {
            await this.prisma.tenant.update({
              where: { id: tenantId },
              data: { wahaSession: body.session }
            });
          } catch { /* ignorar */ }
        }

        // Nombre del perfil de WhatsApp
        pushName = payload.notifyName || payload._data?.notifyName || payload.pushName || payload._data?.pushName;

        // Procesamiento Multimedia vs Texto
        const hasMedia = payload.hasMedia || Boolean(payload.media);
        const media = payload.media || {};
        const mimetype = (media.mimetype || payload._data?.mimetype || '').toLowerCase();
        const messageType = (payload.type || '').toLowerCase();

        if (hasMedia && (mimetype.startsWith('audio/') || messageType === 'ptt' || messageType === 'audio')) {
          this.logger.log(`Procesando nota de voz entrante de ${contactId}...`);
          content = await this.audioTranscriptionService.transcribe(media);
        } else if (hasMedia && (mimetype.startsWith('image/') || messageType === 'image')) {
          this.logger.log(`Procesando imagen entrante de ${contactId}...`);
          const caption = payload.body || payload.caption || '';
          content = await this.mediaVisionService.analyzeImage(media, caption);
        } else {
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
