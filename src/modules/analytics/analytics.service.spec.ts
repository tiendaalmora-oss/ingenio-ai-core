import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsService } from './analytics.service';
import { PrismaService } from '../../shared/database/prisma.service';

describe('AnalyticsService', () => {
  let service: AnalyticsService;
  let prismaService: any;

  beforeEach(async () => {
    prismaService = {
      contact: {
        findMany: jest.fn(),
        count: jest.fn(),
      },
      knowledgeBundle: {
        findUnique: jest.fn(),
      },
      pendingOutboundMessage: {
        count: jest.fn(),
        findMany: jest.fn(),
      },
      interaction: {
        findFirst: jest.fn(),
        count: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AnalyticsService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<AnalyticsService>(AnalyticsService);
  });

  describe('getSalesDashboard', () => {
    it('should aggregate sales correctly with receipt parsing and date filtering', async () => {
      const mockBundle = {
        systemPrompt: {
          _raw: {
            productos: [
              { nombre: 'Mega Kit Matemática', precio: '7.250 Bs' },
              { nombre: 'Kit de Química', precio: '7.250 Bs' },
            ],
          },
        },
      };
      prismaService.knowledgeBundle.findUnique.mockResolvedValue(mockBundle);

      const mockContacts = [
        {
          id: 'lead-1',
          name: 'Carlos Perez',
          phone: '584120001122',
          externalId: '584120001122@c.us',
          memory: {
            leadStatus: 'CLOSED',
            interests: ['Mega Kit Matemática'],
            tags: ['PAGO_CONFIRMADO', 'COMPROBANTE_RECIBIDO'],
            auditLogs: [],
            lastInteraction: new Date('2026-10-04T15:30:00Z'),
          },
          conversations: [
            {
              id: 'conv-1',
              interactions: [
                {
                  id: 'int-1',
                  content:
                    '📸 [Comprobante de Pago Detectado]: Banco: PagomóvilBDV Personas | Referencia: #007563425966 | Monto: 7.250,00 Bs | Fecha: 04/10/2026. (Soporte de pago válido)',
                  timestamp: new Date('2026-10-04T15:30:00Z'),
                },
              ],
            },
          ],
        },
        {
          id: 'lead-2',
          name: 'Maria Gómez',
          phone: '584149998877',
          externalId: '584149998877@c.us',
          memory: {
            leadStatus: 'CLOSED',
            interests: ['Kit de Química'],
            tags: ['PAGO_CONFIRMADO'],
            auditLogs: [],
            lastInteraction: new Date('2026-10-04T16:00:00Z'),
          },
          conversations: [
            {
              id: 'conv-2',
              interactions: [],
            },
          ],
        },
      ];
      prismaService.contact.findMany.mockResolvedValue(mockContacts);

      // Query for 2026-10-04
      const result = await service.getSalesDashboard('tenant-1', { date: '2026-10-04' });

      expect(result.summary.totalSales).toBe(2);
      expect(result.summary.totalRevenueBs).toBe(14500); // 7250 + 7250
      expect(result.summary.verifiedReceiptsCount).toBe(1);
      expect(result.byProduct.length).toBe(2);
      expect(result.sales[0].clientName).toBe('Maria Gómez'); // ordered desc by time
      expect(result.sales[1].clientName).toBe('Carlos Perez');
      expect(result.sales[1].reference).toBe('007563425966');
      expect(result.sales[1].hasReceipt).toBe(true);
    });

    it('should filter by product correctly', async () => {
      prismaService.knowledgeBundle.findUnique.mockResolvedValue(null);
      prismaService.contact.findMany.mockResolvedValue([
        {
          id: 'lead-1',
          name: 'Juan Perez',
          phone: '123',
          memory: {
            leadStatus: 'CLOSED',
            interests: ['Mega Kit Matemática'],
            tags: ['PAGO_CONFIRMADO'],
            auditLogs: [],
          },
          conversations: [],
        },
        {
          id: 'lead-2',
          name: 'Pedro Martinez',
          phone: '456',
          memory: {
            leadStatus: 'CLOSED',
            interests: ['Kit de Química'],
            tags: ['PAGO_CONFIRMADO'],
            auditLogs: [],
          },
          conversations: [],
        },
      ]);

      const result = await service.getSalesDashboard('tenant-1', {
        date: 'all',
        product: 'Química',
      });

      expect(result.summary.totalSales).toBe(1);
      expect(result.sales[0].primaryProduct).toBe('Kit de Química');
    });
  });
});
