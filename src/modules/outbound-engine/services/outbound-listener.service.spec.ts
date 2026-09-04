import { Test, TestingModule } from '@nestjs/testing';
import { OutboundListenerService } from './outbound-listener.service';
import { WahaAdapterService } from './waha-adapter.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../shared/database/prisma.service';
import { ResponseGeneratedEvent } from '../../llm-orchestrator';

describe('OutboundListenerService (Regresiones y Candados de Envío)', () => {
  let service: OutboundListenerService;
  let wahaAdapter: jest.Mocked<WahaAdapterService>;
  let eventEmitter: jest.Mocked<EventEmitter2>;
  let prisma: any;

  beforeEach(async () => {
    wahaAdapter = {
      startTyping: jest.fn().mockResolvedValue(undefined),
      stopTyping: jest.fn().mockResolvedValue(undefined),
      sendMessage: jest.fn().mockResolvedValue('msg-test-123'),
    } as any;

    eventEmitter = {
      emit: jest.fn(),
    } as any;

    prisma = {
      conversation: {
        findUnique: jest.fn().mockResolvedValue({
          contactId: 'contact-uuid-1',
          contact: {
            tenantId: 'tenant-test',
            phone: '584121234567',
            externalId: '584121234567@c.us',
          },
        }),
      },
      knowledgeBundle: {
        findUnique: jest.fn().mockResolvedValue({
          systemPrompt: {
            _raw: {
              reglasBot: {
                enableResponseDelay: true,
                minDelaySeconds: 1,
                maxDelaySeconds: 1,
                simulateTyping: true,
              },
            },
          },
        }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OutboundListenerService,
        { provide: WahaAdapterService, useValue: wahaAdapter },
        { provide: EventEmitter2, useValue: eventEmitter },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<OutboundListenerService>(OutboundListenerService);
  });

  it('Candado 1: Debe activar startTyping y stopTyping cuando simulateTyping es true', async () => {
    const payload = new ResponseGeneratedEvent(
      'tenant-test',
      'conv-uuid-1',
      'Hola profe, ¿cómo estás?'
    );

    await service.handleResponseGenerated(payload);

    expect(wahaAdapter.startTyping).toHaveBeenCalledTimes(1);
    expect(wahaAdapter.startTyping).toHaveBeenCalledWith('tenant-test', '584121234567@c.us');
    expect(wahaAdapter.stopTyping).toHaveBeenCalledTimes(1);
    expect(wahaAdapter.stopTyping).toHaveBeenCalledWith('tenant-test', '584121234567@c.us');
    expect(wahaAdapter.sendMessage).toHaveBeenCalledWith(
      'tenant-test',
      '584121234567@c.us',
      'Hola profe, ¿cómo estás?'
    );
    expect(eventEmitter.emit).toHaveBeenCalledWith('message.sent', expect.anything());
  }, 10000);

  it('Candado 2: NO debe llamar a startTyping ni stopTyping cuando simulateTyping es false', async () => {
    prisma.knowledgeBundle.findUnique.mockResolvedValueOnce({
      systemPrompt: {
        _raw: {
          reglasBot: {
            enableResponseDelay: false,
            simulateTyping: false,
          },
        },
      },
    });

    const payload = new ResponseGeneratedEvent(
      'tenant-test',
      'conv-uuid-1',
      'Respuesta directa sin tipeo'
    );

    await service.handleResponseGenerated(payload);

    expect(wahaAdapter.startTyping).not.toHaveBeenCalled();
    expect(wahaAdapter.stopTyping).not.toHaveBeenCalled();
    expect(wahaAdapter.sendMessage).toHaveBeenCalledWith(
      'tenant-test',
      '584121234567@c.us',
      'Respuesta directa sin tipeo'
    );
  });

  it('Candado 3: Si externalId está ausente, debe usar contact.phone como targetChatId', async () => {
    prisma.conversation.findUnique.mockResolvedValueOnce({
      contactId: 'contact-uuid-2',
      contact: {
        tenantId: 'tenant-test',
        phone: '584149876543',
        externalId: null,
      },
    });
    prisma.knowledgeBundle.findUnique.mockResolvedValueOnce({
      systemPrompt: {
        _raw: {
          reglasBot: {
            enableResponseDelay: false,
            simulateTyping: false,
          },
        },
      },
    });

    const payload = new ResponseGeneratedEvent('tenant-test', 'conv-uuid-2', 'Mensaje fallback');

    await service.handleResponseGenerated(payload);

    expect(wahaAdapter.sendMessage).toHaveBeenCalledWith(
      'tenant-test',
      '584149876543',
      'Mensaje fallback'
    );
  });
});
