import { Test, TestingModule } from '@nestjs/testing';
import { FollowUpListenerService } from './follow-up.listener';
import { ContextBuilderService } from '../../llm-orchestrator/services/context-builder.service';
import { HermesClientService } from '../../llm-orchestrator/services/hermes-client.service';
import { PrismaService } from '../../../shared/database/prisma.service';

describe('FollowUpListenerService (Candado Anti-Fuga y Fallbacks Seguros)', () => {
  let service: FollowUpListenerService;
  let contextBuilder: any;
  let hermesClient: any;
  let prisma: any;

  beforeEach(async () => {
    contextBuilder = {
      buildFollowUpContext: jest.fn().mockResolvedValue([
        { role: 'system', content: 'Eres un asesor docente.' },
        { role: 'user', content: 'Seguimiento' },
      ]),
    };

    hermesClient = {
      generateResponse: jest.fn(),
    };

    prisma = {
      contact: {
        findUnique: jest.fn().mockResolvedValue({ id: 'contact-123', name: 'María', phone: '584141234567' }),
      },
      pendingOutboundMessage: {
        create: jest.fn().mockResolvedValue({ id: 'pending-1' }),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        FollowUpListenerService,
        { provide: ContextBuilderService, useValue: contextBuilder },
        { provide: HermesClientService, useValue: hermesClient },
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<FollowUpListenerService>(FollowUpListenerService);
  });

  it('Candado 1: Si el proveedor de IA falla, NUNCA debe filtrar errores tecnicos ni la palabra "Hermes"', async () => {
    // Simular que Hermes falla y devuelve content = undefined (o lanza error)
    hermesClient.generateResponse.mockRejectedValue(new Error('OpenRouter 503 Service Unavailable'));

    const payload = {
      tenantId: 'tenant-123',
      conversationId: 'conv-xyz',
      contactId: 'contact-123',
      followUpId: 'rule-1h',
      ruleApplied: { tiempo: '1 hora' },
    };

    await service.handleFollowUpPending(payload);

    expect(prisma.pendingOutboundMessage.create).toHaveBeenCalled();
    const createdCall = prisma.pendingOutboundMessage.create.mock.calls[0][0];
    const messageEnqueued = createdCall.data.message;

    // CANDADOS CRÍTICOS:
    expect(messageEnqueued.toLowerCase()).not.toContain('hermes');
    expect(messageEnqueued.toLowerCase()).not.toContain('error');
    expect(messageEnqueued.toLowerCase()).not.toContain('unavailable');
    expect(messageEnqueued).toContain('¡Hola, profe!');
  });

  it('Candado 2: Si el LLM alucina texto con "Hermes no pudo...", el escudo debe bloquearlo y activar fallback', async () => {
    // Simular que por alguna razon el modelo devolvio el texto de error de Hermes
    hermesClient.generateResponse.mockResolvedValue({
      content: 'Hermes no pudo procesar tu consulta en este momento. Por favor intenta de nuevo.',
    });

    const payload = {
      tenantId: 'tenant-123',
      conversationId: 'conv-xyz',
      contactId: 'contact-123',
      followUpId: 'rule-1h',
      ruleApplied: { tiempo: '1 hora' },
    };

    await service.handleFollowUpPending(payload);

    expect(prisma.pendingOutboundMessage.create).toHaveBeenCalled();
    const createdCall = prisma.pendingOutboundMessage.create.mock.calls[0][0];
    const messageEnqueued = createdCall.data.message;

    // No debe contener "Hermes" ni texto técnico
    expect(messageEnqueued.toLowerCase()).not.toContain('hermes');
    expect(messageEnqueued).toContain('¡Hola, profe!');
  });

  it('Candado 3: Si la regla indica usar mensaje estatico (usarIA: false), no debe invocar al LLM', async () => {
    const payload = {
      tenantId: 'tenant-123',
      conversationId: 'conv-xyz',
      contactId: 'contact-123',
      followUpId: 'rule-static-1',
      ruleApplied: {
        tiempo: '2 horas',
        mensaje: 'Hola {nombre}, ¿pudiste ver la información del kit de Química?',
        usarIA: false,
      },
    };

    await service.handleFollowUpPending(payload);

    expect(hermesClient.generateResponse).not.toHaveBeenCalled();
    expect(prisma.pendingOutboundMessage.create).toHaveBeenCalledWith({
      data: {
        tenantId: 'tenant-123',
        conversationId: 'conv-xyz',
        contactId: 'contact-123',
        message: 'Hola María, ¿pudiste ver la información del kit de Química?',
        followUpId: 'rule-static-1',
        status: 'PENDING',
      },
    });
  });

  it('Candado 4: Si el LLM genera mensaje con enlaces de Google Drive en seguimiento, deben ser purgados', async () => {
    hermesClient.generateResponse.mockResolvedValue({
      content: 'Hola profe! Recuerda que puedes revisar los contenidos aquí: https://docs.google.com/document/d/12345/edit ¿Tienes alguna duda?',
    });

    const payload = {
      tenantId: 'tenant-123',
      conversationId: 'conv-xyz',
      contactId: 'contact-123',
      followUpId: 'rule-1h',
      ruleApplied: { tiempo: '1 hora' },
    };

    await service.handleFollowUpPending(payload);

    expect(prisma.pendingOutboundMessage.create).toHaveBeenCalled();
    const createdCall = prisma.pendingOutboundMessage.create.mock.calls[0][0];
    const messageEnqueued = createdCall.data.message;

    expect(messageEnqueued).not.toContain('docs.google.com');
    expect(messageEnqueued).toContain('Hola profe!');
  });
});
