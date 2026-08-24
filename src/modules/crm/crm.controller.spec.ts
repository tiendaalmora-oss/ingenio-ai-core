import { Test, TestingModule } from '@nestjs/testing';
import { CrmController } from './crm.controller';
import { PrismaService } from '../../shared/database/prisma.service';

describe('CrmController Multi-tenant', () => {
  let controller: CrmController;
  let prismaService: PrismaService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CrmController],
      providers: [
        {
          provide: PrismaService,
          useValue: {
            contact: {
              findFirst: jest.fn(),
              findMany: jest.fn(),
              count: jest.fn(),
            },
            businessMemory: {
              upsert: jest.fn(),
              findUnique: jest.fn(),
            }
          },
        },
      ],
    }).compile();

    controller = module.get<CrmController>(CrmController);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  describe('getLead (GET /leads/:id)', () => {
    it('should return contact if it belongs to authenticated tenant', async () => {
      (prismaService.contact.findFirst as jest.Mock).mockResolvedValue({
        id: 'contact-1',
        name: 'John',
        conversations: [],
        tasks: []
      });

      const res = await controller.getLead('contact-1', 'tenant-a');
      
      expect(prismaService.contact.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'contact-1', tenantId: 'tenant-a' }
        })
      );
      expect(res.id).toBe('contact-1');
    });

    it('should return error if contact does not exist', async () => {
      (prismaService.contact.findFirst as jest.Mock).mockResolvedValue(null);

      const res = await controller.getLead('fake-contact', 'tenant-a');
      expect(res).toEqual({ error: 'Lead not found' });
    });

    it('should return error if contact belongs to another tenant', async () => {
      (prismaService.contact.findFirst as jest.Mock).mockResolvedValue(null); // prisma filters it out

      const res = await controller.getLead('contact-tenant-b', 'tenant-a');
      
      expect(prismaService.contact.findFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'contact-tenant-b', tenantId: 'tenant-a' }
        })
      );
      expect(res).toEqual({ error: 'Lead not found' });
    });
  });
});
