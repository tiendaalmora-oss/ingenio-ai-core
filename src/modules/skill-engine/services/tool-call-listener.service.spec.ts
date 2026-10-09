import { Test, TestingModule } from '@nestjs/testing';
import { ToolCallListenerService } from './tool-call-listener.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../shared/database/prisma.service';

describe('ToolCallListenerService', () => {
  let service: ToolCallListenerService;
  let eventEmitter: EventEmitter2;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ToolCallListenerService,
        {
          provide: EventEmitter2,
          useValue: {
            emit: jest.fn(),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            interaction: {
              create: jest.fn().mockResolvedValue({}),
              findFirst: jest.fn().mockResolvedValue(null),
            },
            conversation: {
              update: jest.fn().mockResolvedValue({}),
            },
            businessMemory: {
              upsert: jest.fn().mockResolvedValue({}),
            },
            pendingOutboundMessage: {
              deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
            },
          },
        },
      ],
    }).compile();

    service = module.get<ToolCallListenerService>(ToolCallListenerService);
    eventEmitter = module.get<EventEmitter2>(EventEmitter2);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should handle update_business_memory and emit memory.updated', async () => {
    const payload = {
      tenantId: 'tenant-1',
      contactId: 'contact-1',
      conversationId: 'conv-1',
      toolName: 'update_business_memory',
      toolArguments: { name: 'John Doe', company: 'Acme Corp' },
      toolCallId: 'call_123'
    };

    await service.handleToolCall(payload as any);

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'memory.updated',
      expect.objectContaining({
        contactId: 'contact-1',
        updates: payload.toolArguments
      })
    );

    expect(prismaService.interaction.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          type: 'TOOL_RESULT',
          content: expect.stringContaining('Business Memory actualizada')
        })
      })
    );
  });

  it('should demote SALE to HOT and strip PAGO_CONFIRMADO if no verified voucher exists', async () => {
    const payload = {
      tenantId: 'tenant-1',
      contactId: 'contact-1',
      conversationId: 'conv-1',
      toolName: 'update_business_memory',
      toolArguments: { 
        leadStatus: 'SALE',
        tags: ['INTERESADO', 'PAGO_CONFIRMADO']
      },
      toolCallId: 'call_124'
    };

    (prismaService.interaction.findFirst as jest.Mock).mockResolvedValue(null);

    await service.handleToolCall(payload as any);

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'memory.updated',
      expect.objectContaining({
        contactId: 'contact-1',
        updates: expect.objectContaining({
          leadStatus: 'HOT',
          tags: expect.arrayContaining(['INTERESADO', 'ESPERA_DE_PAGO'])
        })
      })
    );
  });

  it('should preserve SALE and PAGO_CONFIRMADO if verified voucher exists in conversation', async () => {
    const payload = {
      tenantId: 'tenant-1',
      contactId: 'contact-1',
      conversationId: 'conv-1',
      toolName: 'update_business_memory',
      toolArguments: { 
        leadStatus: 'SALE',
        tags: ['PAGO_CONFIRMADO']
      },
      toolCallId: 'call_125'
    };

    (prismaService.interaction.findFirst as jest.Mock).mockResolvedValue({
      id: 'voucher-1',
      content: '📸 [Comprobante de Pago Detectado]: Banco: BDV | Referencia: #123456 | Monto: 7.250 Bs'
    });

    await service.handleToolCall(payload as any);

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'memory.updated',
      expect.objectContaining({
        contactId: 'contact-1',
        updates: expect.objectContaining({
          leadStatus: 'SALE',
          tags: ['PAGO_CONFIRMADO']
        })
      })
    );
  });

  it('should handle create_task and emit task.created', async () => {
    const payload = {
      tenantId: 'tenant-1',
      contactId: 'contact-1',
      conversationId: 'conv-1',
      toolName: 'create_task',
      toolArguments: { title: 'Llamar al cliente' },
      toolCallId: 'call_123'
    };

    await service.handleToolCall(payload as any);

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'task.created',
      expect.objectContaining({
        contactId: 'contact-1',
        taskDetails: payload.toolArguments
      })
    );
  });

  it('should handle handoff_to_human and emit handoff.requested', async () => {
    const payload = {
      tenantId: 'tenant-1',
      contactId: 'contact-1',
      conversationId: 'conv-1',
      toolName: 'handoff_to_human',
      toolArguments: { reason: 'Cliente enojado' },
      toolCallId: 'call_123'
    };

    await service.handleToolCall(payload as any);

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'handoff.requested',
      expect.objectContaining({
        conversationId: 'conv-1',
        reason: 'Cliente enojado'
      })
    );
  });

  it('should handle schedule_meeting and emit task.created', async () => {
    const payload = {
      tenantId: 'tenant-1',
      contactId: 'contact-1',
      conversationId: 'conv-1',
      toolName: 'schedule_meeting',
      toolArguments: { date: 'Mañana', time: '15:00', notes: 'Demo' },
      toolCallId: 'call_123'
    };

    await service.handleToolCall(payload as any);

    expect(eventEmitter.emit).toHaveBeenCalledWith(
      'task.created',
      expect.objectContaining({
        contactId: 'contact-1',
        taskDetails: expect.objectContaining({
          title: expect.stringContaining('Reunión Comercial: Mañana a las 15:00')
        })
      })
    );
  });
});
