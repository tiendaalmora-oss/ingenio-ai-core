import { Test, TestingModule } from '@nestjs/testing';
import { WahaAdapterService } from './waha-adapter.service';
import { PrismaService } from '../../../shared/database/prisma.service';
import { MetaChannelAdapterService } from './meta-channel-adapter.service';

describe('WahaAdapterService (WhatsApp LID y Presencia "Escribiendo...")', () => {
  let service: WahaAdapterService;
  let prisma: any;
  let metaAdapter: any;

  beforeEach(async () => {
    delete process.env.WAHA_PROD_URL;
    delete process.env.WAHA_SANDBOX_URL;
    delete process.env.WAHA_PROD_API_KEY;
    delete process.env.WAHA_SANDBOX_API_KEY;
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

    it('debe reintentar con @lid si WAHA responde 500 con @c.us y auto-curar en BD', async () => {
      prisma.contact.findFirst.mockResolvedValueOnce({
        id: 'contact-uuid-1',
        externalId: '584121234567@c.us',
        phone: '584121234567',
      });

      const mockFetch = jest
        .fn()
        // Primer intento con @c.us falla con 500
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => JSON.stringify({ exception: { message: 't' } }),
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
          body: JSON.stringify({ chatId: '584121234567@c.us', session: 'ferreos' }),
        })
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://waha-mock.example.com/api/startTyping',
        expect.objectContaining({
          body: JSON.stringify({ chatId: '584121234567@lid', session: 'ferreos' }),
        })
      );

      // Candado de Auto-Curación: se actualizó externalId en la base de datos
      expect(prisma.contact.update).toHaveBeenCalledWith({
        where: { id: 'contact-uuid-1' },
        data: { externalId: '584121234567@lid' },
      });
    });
  });

  describe('sendMessage con soporte LID y reintento bidireccional', () => {
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

    it('debe reintentar con @lid y auto-curar si falla con @c.us', async () => {
      prisma.contact.findFirst.mockResolvedValueOnce({
        id: 'contact-uuid-2',
        externalId: '584121234567@c.us',
        phone: '584121234567',
      });

      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 500,
          text: async () => JSON.stringify({ exception: { message: 't' } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({ id: 'msg-lid-ok' }),
        });
      global.fetch = mockFetch as any;

      const result = await service.sendMessage('tenant-1', 'contact-uuid-2', 'Mensaje reintento');

      expect(result).toBe('msg-lid-ok');
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://waha-mock.example.com/api/sendText',
        expect.objectContaining({
          body: JSON.stringify({ chatId: '584121234567@c.us', text: 'Mensaje reintento', session: 'ferreos' }),
        })
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://waha-mock.example.com/api/sendText',
        expect.objectContaining({
          body: JSON.stringify({ chatId: '584121234567@lid', text: 'Mensaje reintento', session: 'ferreos' }),
        })
      );
      expect(prisma.contact.update).toHaveBeenCalledWith({
        where: { id: 'contact-uuid-2' },
        data: { externalId: '584121234567@lid' },
      });
    });

    it('debe reintentar con @c.us y auto-curar si falla con @lid', async () => {
      prisma.contact.findFirst.mockResolvedValueOnce({
        id: 'contact-uuid-3',
        externalId: '163810052673674@lid',
        phone: '163810052673674',
      });

      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce({
          ok: false,
          status: 400,
          text: async () => 'Invalid LID recipient',
        })
        .mockResolvedValueOnce({
          ok: true,
          status: 201,
          json: async () => ({ id: 'msg-cus-ok' }),
        });
      global.fetch = mockFetch as any;

      const result = await service.sendMessage('tenant-1', 'contact-uuid-3', 'Mensaje fallback');

      expect(result).toBe('msg-cus-ok');
      expect(mockFetch).toHaveBeenCalledTimes(2);
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://waha-mock.example.com/api/sendText',
        expect.objectContaining({
          body: JSON.stringify({ chatId: '163810052673674@lid', text: 'Mensaje fallback', session: 'ferreos' }),
        })
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://waha-mock.example.com/api/sendText',
        expect.objectContaining({
          body: JSON.stringify({ chatId: '163810052673674@c.us', text: 'Mensaje fallback', session: 'ferreos' }),
        })
      );
      expect(prisma.contact.update).toHaveBeenCalledWith({
        where: { id: 'contact-uuid-3' },
        data: { externalId: '163810052673674@c.us' },
      });
    });
  });

  describe('Dual-Gateway Routing (Prod vs Sandbox)', () => {
    beforeEach(() => {
      process.env.WAHA_PROD_URL = 'https://waha-prod.ingeniodigital.shop';
      process.env.WAHA_PROD_API_KEY = 'key-prod-123';
      process.env.WAHA_SANDBOX_URL = 'https://waha-sandbox.ingeniodigital.shop';
      process.env.WAHA_SANDBOX_API_KEY = 'key-sandbox-456';
    });

    it('debe enrutar el tenant de producción principal a WAHA_PROD_URL', () => {
      const config = service.resolveWahaConfig('dba1c54c-89c6-41e9-ae9d-03613377a5b3');
      expect(config.apiUrl).toBe('https://waha-prod.ingeniodigital.shop');
      expect(config.apiKey).toBe('key-prod-123');
      expect(config.isProd).toBe(true);
    });

    it('debe enrutar la sesión "ferreos" a WAHA_PROD_URL independientemente del tenantId', () => {
      const config = service.resolveWahaConfig(undefined, 'ferreos');
      expect(config.apiUrl).toBe('https://waha-prod.ingeniodigital.shop');
      expect(config.apiKey).toBe('key-prod-123');
      expect(config.isProd).toBe(true);
    });

    it('debe enrutar subcuentas o tenants secundarios a WAHA_SANDBOX_URL', () => {
      const config = service.resolveWahaConfig('tenant-subcuenta-xyz', 'sub_abc123');
      expect(config.apiUrl).toBe('https://waha-sandbox.ingeniodigital.shop');
      expect(config.apiKey).toBe('key-sandbox-456');
      expect(config.isProd).toBe(false);
    });

    it('debe hacer fallback seguro a WAHA_API_URL si WAHA_SANDBOX_URL no está definido', () => {
      delete process.env.WAHA_SANDBOX_URL;
      delete process.env.WAHA_SANDBOX_API_KEY;
      process.env.WAHA_API_URL = 'https://waha-default.example.com';
      process.env.WAHA_API_KEY = 'default-key';

      const config = service.resolveWahaConfig('tenant-subcuenta-xyz');
      expect(config.apiUrl).toBe('https://waha-default.example.com');
      expect(config.apiKey).toBe('default-key');
      expect(config.isProd).toBe(false);
    });

    it('debe despachar sendMessage al host de producción si el tenant es ferreos/prod', async () => {
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 'prod-msg-001' }),
      });
      global.fetch = mockFetch as any;

      await service.sendMessage('dba1c54c-89c6-41e9-ae9d-03613377a5b3', '584121234567@c.us', 'Mensaje Prod');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://waha-prod.ingeniodigital.shop/api/sendText',
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Api-Key': 'key-prod-123' }),
        })
      );
    });

    it('debe despachar sendMessage al host de sandbox si el tenant es una subcuenta', async () => {
      prisma.tenant.findUnique.mockResolvedValueOnce({ id: 'sub-tenant-99', wahaSession: 'sub_testline' });
      const mockFetch = jest.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ id: 'sandbox-msg-002' }),
      });
      global.fetch = mockFetch as any;

      await service.sendMessage('sub-tenant-99', '584149876543@c.us', 'Mensaje Sandbox');

      expect(mockFetch).toHaveBeenCalledWith(
        'https://waha-sandbox.ingeniodigital.shop/api/sendText',
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Api-Key': 'key-sandbox-456' }),
        })
      );
    });
  });
});
