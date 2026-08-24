import { Test, TestingModule } from '@nestjs/testing';
import { KosLoaderService } from './kos-loader.service';
import { PrismaService } from '../../../shared/database/prisma.service';

describe('KosLoaderService', () => {
  let service: KosLoaderService;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    prismaService = {
      knowledgeBundle: {
        findUnique: jest.fn(),
      },
    } as any;

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        KosLoaderService,
        {
          provide: PrismaService,
          useValue: prismaService,
        },
      ],
    }).compile();

    service = module.get<KosLoaderService>(KosLoaderService);
    
    // Default TTL for tests
    process.env.KOS_CACHE_TTL_MS = '300000';
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('should call DB on first load', async () => {
    const mockBundle = { systemPrompt: { role: 'system', content: 'hello' }, version: 1 };
    (prismaService.knowledgeBundle.findUnique as jest.Mock).mockResolvedValue(mockBundle);

    const result = await service.load('tenant-1');

    expect(prismaService.knowledgeBundle.findUnique).toHaveBeenCalledTimes(1);
    expect(result).toEqual(mockBundle.systemPrompt);
  });

  it('should return cached value on second load without DB call', async () => {
    const mockBundle = { systemPrompt: { role: 'system', content: 'hello' }, version: 1 };
    (prismaService.knowledgeBundle.findUnique as jest.Mock).mockResolvedValue(mockBundle);

    await service.load('tenant-1');
    const result2 = await service.load('tenant-1');

    expect(prismaService.knowledgeBundle.findUnique).toHaveBeenCalledTimes(1);
    expect(result2).toEqual(mockBundle.systemPrompt);
  });

  it('should refresh cache after TTL expires', async () => {
    const mockBundle = { systemPrompt: { role: 'system', content: 'hello' }, version: 1 };
    (prismaService.knowledgeBundle.findUnique as jest.Mock).mockResolvedValue(mockBundle);

    await service.load('tenant-1');
    
    // Advance time beyond TTL (5 minutes)
    jest.advanceTimersByTime(5 * 60 * 1000 + 1000);
    
    await service.load('tenant-1');

    expect(prismaService.knowledgeBundle.findUnique).toHaveBeenCalledTimes(2);
  });

  it('should return fallback bundle when no bundle found', async () => {
    (prismaService.knowledgeBundle.findUnique as jest.Mock).mockResolvedValue(null);

    const result = await service.load('tenant-1');

    expect(result).toEqual({ instrucciones: "Tenant sin configuración. No existe un Knowledge Bundle activo para este tenant." });
  });
});
