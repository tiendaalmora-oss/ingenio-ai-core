import { Test, TestingModule } from '@nestjs/testing';
import { WahaAdapterService } from './waha-adapter.service';
import { PrismaService } from '../../../shared/database/prisma.service';
import { MetaChannelAdapterService } from './meta-channel-adapter.service';

describe('WahaAdapterService (WhatsApp LID y Presencia "Escribiendo...")', () => {
  let service: WahaAdapterService;
  let prisma: any;
  let metaAdapter: any;

  beforeEach(async () => {
    process.env.WAHA_API_URL = 'https://waha-mock.example.com';
    process.env.WAHA_API_KEY = 'test-key';
    delete process.env.WAHA_SESSION;

    prisma = {
      tenant: {
        findUnique: jest.fn().mockResolvedValue({ id: 'tenant-1', wahaSession: 'ferreos' }),
        findFirst: jest.fn().mockResolvedValue({ wahaSession: 'ferreos' }),
      },
      contact: {
        findFirst: jest.fn(),
        update: jest.fn().mockResolvedValue({}),
      },
    };

    metaAdapter = {
      sendMessage: jest.fn().mockResolvedValue('meta-msg-id'),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        WahaAdapterService,
        { provide: PrismaService, useValue: prisma },
        { provide: MetaChannelAdapterService, useValue: metaAdapter },
      ],
    }).compile();

    service = module.get<WahaAdapterService>(WahaAdapterService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('normalizeJid', () => {
    it('debe preservar JIDs que ya contienen sufijo @lid, @c.us o @g.us', () => {
      expect(service.normalizeJid('163810052673674@lid')).toBe('163810052673674@lid');
      expect(service.normalizeJid('584121234567@c.us')).toBe('584121234567@c.us');
      expect(service.normalizeJid('120363424203726380@g.us')).toBe('120363424203726380@g.us');
    });

    it('debe inferir @lid para identificadores de 14 o 15 dígitos (LIDs de WhatsApp)', () => {
      expect(service.normalizeJid('163810052673674')).toBe('163810052673674@lid');
      expect(service.normalizeJid('250800420995318')).toBe('250800420995318@lid');
      expect(service.normalizeJid('91955887370441')).toBe('91955887370441@lid');
    });

    it('debe asignar @c.us para teléfonos estándar (10 a 13 dígitos)', () => {
      expect(service.normalizeJid('584121234567')).toBe('584121234567@c.us');
      expect(service.normalizeJid('+58 414 123-4567')).toBe('584141234567@c.us');
    });
  });

  describe('startTyping con soporte LID y reintento', () => {
    it('debe enviar startTyping con @lid para un contacto LID y tener éxito', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 201,
        json: async () => ({ result: true }),
      });
      global.fetch = mockFetch as any;

      await service.startTyping('tenant-1', '163810052673674@lid');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://waha-mock.example.com/api/startTyping',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ chatId: '163810052673674@lid', session: 'ferreos' }),
        })
      );
    });

    it('debe reintentar con @lid si WAHA responde 500 "No LID for user" con @c.us y auto-curar en BD', async () => {
      prisma.contact.findFirst.mockResolvedValueOnce({
        id: 'contact-uuid-1',
        externalId: '163810052673674@c.us',
        phone: '163810052673674',
      });

      const mockFetch = jest
        .fn()
        // Primer intento con @c.us falla con 500 "No LID for user"
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => JSON.stringify({ exception: { message: 'No LID for user' } }),
        })
        // Segundo intento con @lid tiene éxito (201 Created)
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({ result: true }),
        });
      global.fetch = mockFetch as any;

      await service.startTyping('tenant-1', 'contact-uuid-1');

      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://waha-mock.example.com/api/startTyping',
        expect.objectContaining({
          body: JSON.stringify({ chatId: '163810052673674@c.us', session: 'ferreos' }),
        })
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://waha-mock.example.com/api/startTyping',
        expect.objectContaining({
          body: JSON.stringify({ chatId: '163810052673674@lid', session: 'ferreos' }),
        })
      );

      // Candado de Auto-Curación: se actualizó externalId en la base de datos
      expect(prisma.contact.update).toHaveBeenCalledWith({
        where: { id: 'contact-uuid-1' },
        data: { externalId: '163810052673674@lid' },
      });
    });
  });

  describe('sendMessage con soporte LID', () => {
    it('debe entregar a @lid exitosamente', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 'waha-msg-999' }),
      });
      global.fetch = mockFetch as any;

      const result = await service.sendMessage('tenant-1', '163810052673674@lid', 'Hola profe');

      expect(result).toBe('waha-msg-999');
      expect(mockFetch).toHaveBeenCalledWith(
        'https://waha-mock.example.com/api/sendText',
        expect.objectContaining({
          body: JSON.stringify({
            chatId: '163810052673674@lid',
            text: 'Hola profe',
            session: 'ferreos',
          }),
        })
      );
    });
  });
});
