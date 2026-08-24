import { Test, TestingModule } from '@nestjs/testing';
import { MemoryController } from './memory.controller';
import { PrismaService } from '../../shared/database/prisma.service';
import { NotFoundException } from '@nestjs/common';

describe('MemoryController Multi-tenant', () => {
  let controller: MemoryController;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [MemoryController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            contact: {
              findFirst: jest.fn(),
            },
            businessMemory: {
              findUnique: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
            memoryAuditLog: {
              findMany: jest.fn(),
              count: jest.fn(),
              groupBy: jest.fn(),
            }
          },
        },
      ],
    }).compile();

    controller = module.get<MemoryController>(MemoryController);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('getContactMemory (GET /contact/:contactId)', () => {
    it('should return memory if contact belongs to authenticated tenant', async () => {
      (prismaService.contact.findFirst as jest.Mock).mockResolvedValue({ id: 'contact-1' });
      (prismaService.businessMemory.findUnique as jest.Mock).mockResolvedValue({
        id: 'mem-1',
        contact: { phone: '123', tenantId: 'tenant-a' }
      });
      (prismaService.memoryAuditLog.findMany as jest.Mock).mockResolvedValue([]);

      const res = await controller.getContactMemory('contact-1', 'tenant-a');
      
      expect(prismaService.contact.findFirst).toHaveBeenCalledWith({
        where: { id: 'contact-1', tenantId: 'tenant-a' }
      });
      expect(res.contactId).toBe('contact-1');
    });

    it('should throw NotFoundException if contact does not exist', async () => {
      (prismaService.contact.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(controller.getContactMemory('fake-contact', 'tenant-a')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if contact belongs to another tenant', async () => {
      (prismaService.contact.findFirst as jest.Mock).mockResolvedValue(null);

      await expect(controller.getContactMemory('contact-tenant-b', 'tenant-a')).rejects.toThrow(NotFoundException);
    });
  });

  describe('getTimeline (GET /timeline)', () => {
    it('should only query audit logs for authenticated tenant', async () => {
      (prismaService.memoryAuditLog.count as jest.Mock).mockResolvedValue(0);
      (prismaService.memoryAuditLog.findMany as jest.Mock).mockResolvedValue([]);

      await controller.getTimeline('tenant-a');

      expect(prismaService.memoryAuditLog.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ tenantId: 'tenant-a' })
        })
      );
    });
  });
});
