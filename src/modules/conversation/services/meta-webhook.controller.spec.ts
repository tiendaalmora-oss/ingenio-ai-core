import { Test, TestingModule } from '@nestjs/testing';
import { HttpStatus } from '@nestjs/common';
import { MetaWebhookController } from './meta-webhook.controller';
import { ReceiveMessageService } from './receive-message.service';
import { TenantResolverService } from '../../tenant/services/tenant-resolver.service';
import { PrismaService } from '../../../shared/database/prisma.service';
import { AudioTranscriptionService } from '../../media-processing/services/audio-transcription.service';
import { MediaVisionService } from '../../media-processing/services/media-vision.service';
import { WahaAdapterService } from '../../outbound-engine/services/waha-adapter.service';

describe('MetaWebhookController (Candado de Enrutamiento WAHA / Meta)', () => {
  let controller: MetaWebhookController;
  let receiveMessageService: any;
  let tenantResolver: any;
  let prisma: any;
  let audioTranscriptionService: any;
  let mediaVisionService: any;
  let wahaAdapter: any;

  const createMockRes = () => {
    const res: any = {};
    res.status = jest.fn().mockReturnValue(res);
    res.send = jest.fn().mockReturnValue(res);
    return res;
  };

  beforeEach(async () => {
    receiveMessageService = {
      execute: jest.fn().mockResolvedValue(undefined),
    };

    tenantResolver = {
      resolveFromWahaSession: jest.fn().mockResolvedValue('tenant-123'),
    };

    prisma = {
      tenant: {
        update: jest.fn().mockResolvedValue({}),
        findFirst: jest.fn().mockResolvedValue({ id: 'tenant-123' }),
      },
      contact: {
        findFirst: jest.fn(),
      },
      conversation: {
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
      interaction: {
        create: jest.fn().mockResolvedValue({}),
      },
      pendingOutboundMessage: {
        deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
      incomingMessageFailure: {
        create: jest.fn().mockResolvedValue({}),
      },
    };

    audioTranscriptionService = {
      transcribe: jest.fn(),
    };

    mediaVisionService = {
      analyzeImage: jest.fn(),
    };

    wahaAdapter = {
      isSentBySystem: jest.fn().mockReturnValue(false),
      markMessageAsSentBySystem: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [MetaWebhookController],
      providers: [
        { provide: ReceiveMessageService, useValue: receiveMessageService },
        { provide: TenantResolverService, useValue: tenantResolver },
        { provide: PrismaService, useValue: prisma },
        { provide: AudioTranscriptionService, useValue: audioTranscriptionService },
        { provide: MediaVisionService, useValue: mediaVisionService },
        { provide: WahaAdapterService, useValue: wahaAdapter },
      ],
    }).compile();

    controller = module.get<MetaWebhookController>(MetaWebhookController);
  });

  describe('Enrutamiento WAHA (WhatsApp)', () => {
    it('Candado 4.1: Mensaje entrante (fromMe: false) debe enviar al cliente (payload.from) y NUNCA responder al número propio (payload.to)', async () => {
      const res = createMockRes();
      const body = {
        event: 'message',
        session: 'sesion-tienda',
        payload: {
          fromMe: false,
          from: '584121234567:14@c.us',
          to: '584249876543@c.us', // número del bot/empresa
          body: 'Hola! Quiero información del producto',
          notifyName: 'Juan Pérez',
        },
      };

      await controller.receiveMessage(body, res);

      // 1. Debe responder de inmediato HTTP 200 a WAHA
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(res.send).toHaveBeenCalledWith('EVENT_RECEIVED');

      // 2. Debe extraer el remitente del cliente sin sufijo de dispositivo (:14)
      expect(receiveMessageService.execute).toHaveBeenCalledWith(
        'tenant-123',
        '584121234567@c.us',
        'Hola! Quiero información del producto',
        'Juan Pérez'
      );

      // 3. CANDADO CRÍTICO: Jamás responder a sí mismo (payload.to)
      expect(receiveMessageService.execute).not.toHaveBeenCalledWith(
        expect.anything(),
        '584249876543@c.us',
        expect.anything(),
        expect.anything()
      );
    });

    it('Candado 4.2: Mensaje saliente desde el teléfono físico (fromMe: true) NUNCA debe activar el bot y debe pausar en HANDOFF', async () => {
      const res = createMockRes();
      const contactMock = { id: 'contact-abc', phone: '584121234567' };
      const convMock = { id: 'conv-xyz', contactId: 'contact-abc', status: 'ACTIVE' };

      prisma.contact.findFirst.mockResolvedValue(contactMock);
      prisma.conversation.findFirst.mockResolvedValue(convMock);

      const body = {
        event: 'message',
        session: 'sesion-tienda',
        payload: {
          fromMe: true,
          from: '584249876543:0@c.us', // número propio
          to: '584121234567@c.us',     // cliente receptor
          body: 'Hola Juan, ya estoy revisando tu pedido personalmente.',
        },
      };

      await controller.receiveMessage(body, res);

      // 1. HTTP 200
      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);

      // 2. CANDADO CRÍTICO: NO llamar a la IA (receiveMessageService.execute)
      expect(receiveMessageService.execute).not.toHaveBeenCalled();

      // 3. Debe registrar la interacción saliente manual en el CRM
      expect(prisma.interaction.create).toHaveBeenCalledWith({
        data: {
          conversationId: 'conv-xyz',
          direction: 'OUTBOUND',
          type: 'TEXT',
          content: 'Hola Juan, ya estoy revisando tu pedido personalmente.',
          role: 'assistant',
        },
      });

      // 4. Debe pausar la conversación en HANDOFF
      expect(prisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conv-xyz' },
        data: { status: 'HANDOFF' },
      });

      // 5. Debe cancelar cualquier mensaje pendiente en cola para esa conversación
      expect(prisma.pendingOutboundMessage.deleteMany).toHaveBeenCalledWith({
        where: { conversationId: 'conv-xyz' },
      });
    });

    it('Candado 4.3: Mensajes de grupos (@g.us) deben descartarse sin procesar', async () => {
      const res = createMockRes();
      const groupIncoming = {
        event: 'message',
        session: 'sesion-tienda',
        payload: {
          fromMe: false,
          from: '123456789-987654@g.us',
          body: 'Mensaje de grupo',
        },
      };

      await controller.receiveMessage(groupIncoming, res);
      expect(receiveMessageService.execute).not.toHaveBeenCalled();

      const groupOutgoing = {
        event: 'message',
        session: 'sesion-tienda',
        payload: {
          fromMe: true,
          to: '123456789-987654@g.us',
          body: 'Mensaje enviado a un grupo',
        },
      };

      await controller.receiveMessage(groupOutgoing, res);
      expect(prisma.interaction.create).not.toHaveBeenCalled();
      expect(receiveMessageService.execute).not.toHaveBeenCalled();
    });

    it('Candado 4.4: Eventos redundantes (message.any) deben ser ignorados', async () => {
      const res = createMockRes();
      const body = {
        event: 'message.any',
        session: 'sesion-tienda',
        payload: {
          fromMe: false,
          from: '584121234567@c.us',
          body: 'Mensaje duplicado de message.any',
        },
      };

      await controller.receiveMessage(body, res);
      expect(receiveMessageService.execute).not.toHaveBeenCalled();
    });

    it('Candado 4.5: Limpieza de sufijos de canal alternativo (@s.whatsapp.net)', async () => {
      const res = createMockRes();
      const body = {
        event: 'message',
        session: 'sesion-tienda',
        payload: {
          fromMe: false,
          from: '584129998877:99@s.whatsapp.net',
          to: '584249876543@c.us',
          body: 'Hola desde WhatsApp MultiDevice',
        },
      };

      await controller.receiveMessage(body, res);

      expect(receiveMessageService.execute).toHaveBeenCalledWith(
        'tenant-123',
        '584129998877@s.whatsapp.net',
        'Hola desde WhatsApp MultiDevice',
        undefined
      );
    });

    it('Candado 4.6: Mensaje saliente desde el teléfono físico (fromMe: true) en Argentina (+54 9 11 ...) debe pausar en HANDOFF', async () => {
      const res = createMockRes();
      const contactMock = { id: 'contact-arg', phone: '541125938527', phoneNormalized: '541125938527' };
      const convMock = { id: 'conv-arg', contactId: 'contact-arg', status: 'ACTIVE' };

      prisma.contact.findFirst.mockImplementation(async ({ where }: any) => {
        const matched = where.OR.some((cond: any) =>
          cond.phone === '541125938527' ||
          cond.phoneNormalized === '541125938527' ||
          cond.phoneNormalized?.endsWith === '1125938527'
        );
        return matched ? contactMock : null;
      });
      prisma.conversation.findFirst.mockResolvedValue(convMock);

      const body = {
        event: 'message.any',
        session: 'sub_cc08101c1f',
        payload: {
          fromMe: true,
          from: '5491100000000:0@c.us',
          to: '5491125938527@c.us',
          body: 'Hola! Te atiendo directamente desde el móvil.',
        },
      };

      await controller.receiveMessage(body, res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(receiveMessageService.execute).not.toHaveBeenCalled();
      expect(prisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conv-arg' },
        data: { status: 'HANDOFF' },
      });
      expect(prisma.interaction.create).toHaveBeenCalledWith({
        data: {
          conversationId: 'conv-arg',
          direction: 'OUTBOUND',
          type: 'TEXT',
          content: 'Hola! Te atiendo directamente desde el móvil.',
          role: 'assistant',
        },
      });
    });

    it('Candado 4.7: Mensaje saliente desde el teléfono físico (fromMe: true) con Privacy LID (@lid) debe pausar en HANDOFF', async () => {
      const res = createMockRes();
      const contactMock = { id: 'contact-lid', externalId: '201674652135471@lid', phone: '201674652135471' };
      const convMock = { id: 'conv-lid', contactId: 'contact-lid', status: 'ACTIVE' };

      prisma.contact.findFirst.mockResolvedValue(contactMock);
      prisma.conversation.findFirst.mockResolvedValue(convMock);

      const body = {
        event: 'message.any',
        session: 'sub_cc08101c1f',
        payload: {
          fromMe: true,
          to: '201674652135471@lid',
          body: 'Hola, te respondo al LID',
        },
      };

      await controller.receiveMessage(body, res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(receiveMessageService.execute).not.toHaveBeenCalled();
      expect(prisma.conversation.update).toHaveBeenCalledWith({
        where: { id: 'conv-lid' },
        data: { status: 'HANDOFF' },
      });
    });

    it('Candado 4.8: Mensaje saliente enviado por el sistema (bot/CRM) detectado por wahaAdapter.isSentBySystem debe ignorarse sin alterar estado', async () => {
      const res = createMockRes();
      wahaAdapter.isSentBySystem.mockReturnValueOnce(true);

      const body = {
        event: 'message.any',
        session: 'sesion-tienda',
        payload: {
          id: { _serialized: 'true_584249876543@c.us_BOTMSG123' },
          fromMe: true,
          to: '584121234567@c.us',
          body: 'Mensaje automático del bot',
        },
      };

      await controller.receiveMessage(body, res);

      expect(res.status).toHaveBeenCalledWith(HttpStatus.OK);
      expect(prisma.conversation.update).not.toHaveBeenCalled();
      expect(prisma.interaction.create).not.toHaveBeenCalled();
      expect(receiveMessageService.execute).not.toHaveBeenCalled();
    });
  });
});
