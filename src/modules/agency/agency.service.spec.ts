import { Test, TestingModule } from '@nestjs/testing';
import { AgencyService } from './agency.service';
import { PrismaService } from '../../shared/database/prisma.service';
import { ForbiddenException, NotFoundException } from '@nestjs/common';

describe('AgencyService — Dual-Gateway WAHA & Proxy Isolation', () => {
  let service: AgencyService;
  let prisma: any;

  beforeEach(async () => {
    delete process.env.WAHA_PROD_URL;
    delete process.env.WAHA_SANDBOX_URL;
    delete process.env.WAHA_PROD_API_KEY;
    delete process.env.WAHA_SANDBOX_API_KEY;

    process.env.WAHA_PROD_URL = 'https://waha-prod.ingeniodigital.shop';
    process.env.WAHA_PROD_API_KEY = 'prod-secret';
    process.env.WAHA_SANDBOX_URL = 'https://waha-sandbox.ingeniodigital.shop';
    process.env.WAHA_SANDBOX_API_KEY = 'sandbox-secret';
    process.env.WAHA_API_URL = 'https://waha-fallback.ingeniodigital.shop';
    process.env.WAHA_API_KEY = 'fallback-secret';

    prisma = {
      agency: {
        findUnique: jest.fn(),
        create: jest.fn(),
        findMany: jest.fn(),
        delete: jest.fn(),
      },
      tenant: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
      },
      knowledgeBundle: {
        create: jest.fn(),
        deleteMany: jest.fn(),
      },
      contact: {
        count: jest.fn(),
      },
      agencyUser: {
        deleteMany: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AgencyService,
        { provide: PrismaService, useValue: prisma },
      ],
    }).compile();

    service = module.get<AgencyService>(AgencyService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('startSubaccountWaha con aislamiento Dual-Gateway', () => {
    it('debe enrutar subcuentas al contenedor WAHA_SANDBOX_URL', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: 'sub-tenant-123',
        name: 'Cliente Prueba',
        wahaSession: 'sub_testline',
      });

      const mockFetch = jest
        // 1. check existing session -> 404 not found
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 404 })
        // 2. create session in WAHA -> 201
        .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({}) })
        // 3. getSubaccountWahaStatus -> 200 WORKING
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ status: 'STARTING', me: null }),
        });
      global.fetch = mockFetch as any;

      const result = await service.startSubaccountWaha('sub-tenant-123');

      expect(result.status).toBe('STARTING');
      // Primer check y creación deben ir a WAHA_SANDBOX_URL
      expect(mockFetch).toHaveBeenNthCalledWith(
        1,
        'https://waha-sandbox.ingeniodigital.shop/api/sessions/sub_testline',
        expect.objectContaining({
          headers: expect.objectContaining({ 'X-Api-Key': 'sandbox-secret' }),
        })
      );
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://waha-sandbox.ingeniodigital.shop/api/sessions',
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({ 'X-Api-Key': 'sandbox-secret' }),
        })
      );
    });

    it('debe inyectar la configuración de proxy cuando es suministrada', async () => {
      prisma.tenant.findUnique.mockResolvedValue({
        id: 'sub-tenant-venezuela',
        name: 'Línea Venezuela',
        wahaSession: 'sub_venezuela',
      });

      const mockFetch = jest
        .fn()
        .mockResolvedValueOnce({ ok: false, status: 404 })
        .mockResolvedValueOnce({ ok: true, status: 201, json: async () => ({}) })
        .mockResolvedValueOnce({
          ok: true,
          status: 200,
          json: async () => ({ status: 'SCAN_QR_CODE' }),
        });
      global.fetch = mockFetch as any;

      const proxyPayload = {
        server: 'http://proxy.ve.smartproxy.com:10001',
        username: 'user_ve',
        password: 'pass_ve',
      };

      await service.startSubaccountWaha('sub-tenant-venezuela', proxyPayload);

      // Verificamos que el payload enviado a WAHA contiene config.proxy
      expect(mockFetch).toHaveBeenNthCalledWith(
        2,
        'https://waha-sandbox.ingeniodigital.shop/api/sessions',
        expect.objectContaining({
          body: JSON.stringify({
            name: 'sub_venezuela',
            start: true,
            config: {
              webhooks: [
                {
                  url: 'https://core.ai.ingeniodigital.shop/webhooks/meta',
                  events: ['session.status', 'message'],
                },
              ],
              proxy: proxyPayload,
            },
          }),
        })
      );
    });
  });

  describe('Blindaje de Producción (ferreos)', () => {
    it('debe arrojar ForbiddenException si se intenta cerrar sesión de ferreos o la cuenta principal', async () => {
      prisma.tenant.findUnique.mockResolvedValueOnce({
        id: 'dba1c54c-89c6-41e9-ae9d-03613377a5b3',
        name: 'Kits Docentes Producción',
        wahaSession: 'ferreos',
      });

      await expect(service.logoutSubaccountWaha('dba1c54c-89c6-41e9-ae9d-03613377a5b3')).rejects.toThrow(
        ForbiddenException
      );
    });
  });
});
