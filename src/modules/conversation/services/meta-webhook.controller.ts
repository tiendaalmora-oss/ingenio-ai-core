import { Controller, Get, Post, Body, Query, Res, HttpStatus } from '@nestjs/common';
import type { FastifyReply } from 'fastify';
import { ReceiveMessageService } from './receive-message.service';

@Controller('webhooks/meta')
export class MetaWebhookController {
  constructor(private readonly receiveMessageService: ReceiveMessageService) {}

  @Get()
  verifyToken(@Query() query: any, @Res() res: FastifyReply) {
    // TODO: Implementar la verificación criptográfica del webhook en el próximo sprint
    // Por ahora, simplemente devolver el hub.challenge si existe
    if (query['hub.mode'] === 'subscribe' && query['hub.challenge']) {
      return res.status(HttpStatus.OK).send(query['hub.challenge']);
    }
    return res.status(HttpStatus.BAD_REQUEST).send('Bad Request');
  }

  @Post()
  async receiveMessage(@Body() body: any, @Res() res: FastifyReply) {
    // 1. Responder INMEDIATAMENTE a Meta para evitar bloqueos
    res.status(HttpStatus.OK).send('EVENT_RECEIVED');

    // 2. Procesamiento Asíncrono
    try {
      // Parsing real de WAHA
      let tenantId = 'tenant-demo-123'; // Asumimos un tenant por defecto por ahora
      let contactId = '';
      let content = '';

      if (body.event === 'message' || body.event === 'message.any') {
        contactId = body.payload.from;
        content = body.payload.body;
      } else {
        // Fallback por si usamos un payload de prueba directo
        contactId = body.contactId || 'contact-demo-123';
        content = body.content || 'Mensaje de prueba desde webhook';
      }

      if (!contactId || !content) {
        console.warn('Ignorando evento webhook sin contactId o content', body);
        return;
      }

      await this.receiveMessageService.execute(tenantId, contactId, content);
    } catch (error) {
      console.error('Error processing Meta Webhook in background:', error);
    }
  }
}
