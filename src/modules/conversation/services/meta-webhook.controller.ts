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
    console.log("WEBHOOK RECIBIDO");
    console.log(JSON.stringify(body, null, 2));

    // 1. Responder INMEDIATAMENTE a Meta para evitar bloqueos
    res.status(HttpStatus.OK).send('EVENT_RECEIVED');

    // 2. Procesamiento Asíncrono
    try {
      // Parsing real de WAHA
      let tenantId = body.session || 'default'; // Multi-tenant resuelto por sesión de WAHA
      let contactId = '';
      let content = '';

      if (body.event === 'message' || body.event === 'message.any') {
        // Ignorar mensajes enviados por el propio bot (outbound) para evitar bucles
        if (body.payload.fromMe) {
          console.log('Ignorando mensaje saliente (fromMe: true)');
          return;
        }
        
        // Para evitar procesar el mismo mensaje dos veces si WAHA envía 'message' y 'message.any'
        if (body.event === 'message.any') {
          return; 
        }

        contactId = body.payload.from;
        content = body.payload.body;
      } else {
        // Fallback por si usamos un payload de prueba directo
        contactId = body.contactId || 'contact-demo-123';
        content = body.content || 'Mensaje de prueba desde webhook';
      }

      if (!contactId || !content) {
        console.warn('Ignorando evento webhook sin contactId o content');
        return;
      }

      await this.receiveMessageService.execute(tenantId, contactId, content);
    } catch (error) {
      console.error('Error processing Meta Webhook in background:', error);
    }
  }
}
