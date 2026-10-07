import { Test, TestingModule } from '@nestjs/testing';
import { CrmController } from './crm.controller';
import { PrismaService } from '../../shared/database/prisma.service';

describe('CrmController Multi-tenant', () => {
  let controller: CrmController;
  let prismaService: any;

  beforeEach(async () => {
    prismaService = {
      contact: {
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn(),
        delete: jest.fn(),
      },
      businessMemory: {
        upsert: jest.fn(),
        findUnique: jest.fn(),
      },
      memoryAuditLog: {
        create: jest.fn(),
      },
      interaction: {
        create: jest.fn(),
      },
      pendingOutboundMessage: {
        deleteMany: jest.fn(),
      },
      conversation: {
        create: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [CrmController],
      providers: [
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    controller = module.get<CrmController>(CrmController);
  });

  describe('getLead (GET /leads/:id)', () => {
    it('should return contact if it belongs to authenticated tenant', async () => {
      prismaService.contact.findFirst.mockResolvedValue({
        id: 'contact-1',
        name: 'John',
        conversations: [],
        tasks: [],
      });

      const res = await controller.getLead('contact-1', 'tenant-a');

      expect(prismaService.contact.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'contact-1', tenantId: 'tenant-a' },
        }),
      );
      expect(res.id).toBe('contact-1');
    });

    it('should return error if contact does not exist', async () => {
      prismaService.contact.findFirst.mockResolvedValue(null);

      const res = await controller.getLead('fake-contact', 'tenant-a');
      expect(res).toEqual({ error: 'Lead not found' });
    });
  });

  describe('addTag (POST /leads/:id/tags)', () => {
    it('should add tag to lead memory and create audit log', async () => {
      prismaService.contact.findFirst.mockResolvedValue({
        id: 'contact-1',
        name: 'John',
        memory: { tags: ['INTERESADO'] },
      });

      const res = await controller.addTag('contact-1', { tag: 'pago_confirmado' }, 'tenant-a');

      expect(res.success).toBe(true);
      expect(res.tags).toContain('PAGO_CONFIRMADO');
      expect(prismaService.businessMemory.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { contactId: 'contact-1' },
          update: { tags: ['INTERESADO', 'PAGO_CONFIRMADO'] },
        }),
      );
      expect(prismaService.memoryAuditLog.create).toHaveBeenCalled();
    });
  });

  describe('removeTag (DELETE /leads/:id/tags/:tag)', () => {
    it('should remove tag from lead memory', async () => {
      prismaService.contact.findFirst.mockResolvedValue({
        id: 'contact-1',
        name: 'John',
        memory: { tags: ['INTERESADO', 'PAGO_CONFIRMADO'] },
      });

      const res = await controller.removeTag('contact-1', 'PAGO_CONFIRMADO', 'tenant-a');

      expect(res.success).toBe(true);
      expect(res.tags).not.toContain('PAGO_CONFIRMADO');
      expect(prismaService.businessMemory.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { contactId: 'contact-1' },
          update: { tags: ['INTERESADO'] },
        }),
      );
    });
  });

  describe('registerSale (POST /leads/:id/sale)', () => {
    it('should set lead status to CLOSED, add tags and record interaction', async () => {
      prismaService.contact.findFirst.mockResolvedValue({
        id: 'contact-1',
        name: 'John',
        memory: { leadStatus: 'WARM', tags: ['INTERESADO'], interests: [] },
        conversations: [{ id: 'conv-1' }],
      });

      const res = await controller.registerSale(
        'contact-1',
        {
          productName: 'Kit de Química',
          amount: 7250,
          currency: 'BS',
          paymentMethod: 'Pago Móvil BDV',
          reference: '123456',
        },
        'tenant-a',
      );

      expect(res.success).toBe(true);
      expect(res.leadStatus).toBe('CLOSED');
      expect(prismaService.businessMemory.upsert).toHaveBeenCalledWith(
        expect.objectContaining({
          update: expect.objectContaining({
            leadStatus: 'CLOSED',
            tags: expect.arrayContaining(['PAGO_CONFIRMADO', 'COMPROBANTE_RECIBIDO']),
            interests: expect.arrayContaining(['Kit de Química']),
          }),
        }),
      );
      expect(prismaService.interaction.create).toHaveBeenCalled();
      expect(prismaService.pendingOutboundMessage.deleteMany).toHaveBeenCalled();
    });
  });

  describe('cancelSale (POST /leads/:id/cancel-sale)', () => {
    it('should revert lead status to WARM, remove payment tags and add VENTA_ANULADA', async () => {
      prismaService.contact.findFirst.mockResolvedValue({
        id: 'contact-1',
        name: 'John',
        memory: { leadStatus: 'CLOSED', tags: ['INTERESADO', 'PAGO_CONFIRMADO', 'COMPROBANTE_RECIBIDO'] },
        conversations: [{ id: 'conv-1' }],
      });

      const res = await controller.cancelSale('contact-1', 'tenant-a');

      expect(res.success).toBe(true);
      expect(res.leadStatus).toBe('WARM');
      expect(res.kanbanStage).toBe('Interesado');
      expect(res.tags).not.toContain('PAGO_CONFIRMADO');
      expect(res.tags).toContain('VENTA_ANULADA');
    });
  });
});
