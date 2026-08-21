import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { TenantGuard } from './tenant.guard';
import { PrismaService } from '../database/prisma.service';

/**
 * TenantGuard — Unit Test Suite
 *
 * All tests run without a real database. PrismaService is fully mocked.
 * The guard's internal cache is cleared in beforeEach to guarantee isolation.
 */
describe('TenantGuard', () => {
  let guard: TenantGuard;
  let reflector: jest.Mocked<Reflector>;
  let prismaService: jest.Mocked<PrismaService>;

  // ── Test Fixtures ────────────────────────────────────────────────────────────

  const MOCK_TENANT = { id: 'tenant-abc-123' };

  /** Builds a minimal ExecutionContext mock with configurable headers. */
  const buildContext = (headers: Record<string, string> = {}): ExecutionContext => {
    const request = { headers, tenantId: undefined as string | undefined };
    return {
      getHandler: jest.fn().mockReturnValue({}),
      getClass: jest.fn().mockReturnValue({ name: 'TestController' }),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue(request),
      }),
    } as unknown as ExecutionContext;
  };

  // ── Setup ────────────────────────────────────────────────────────────────────

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn().mockReturnValue(false), // Default: guard is active
    } as unknown as jest.Mocked<Reflector>;

    prismaService = {
      tenant: {
        findUnique: jest.fn(),
      },
    } as unknown as jest.Mocked<PrismaService>;

    guard = new TenantGuard(reflector, prismaService);
    guard.clearCache(); // Ensure a clean cache for every test.
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ── @SkipTenantGuard() ───────────────────────────────────────────────────────

  describe('@SkipTenantGuard() decorator', () => {
    it('should allow request and skip DB lookup when route is decorated with @SkipTenantGuard()', async () => {
      reflector.getAllAndOverride.mockReturnValue(true);
      const ctx = buildContext(); // No x-tenant-id header — would normally fail

      const result = await guard.canActivate(ctx);

      expect(result).toBe(true);
      expect(prismaService.tenant.findUnique).not.toHaveBeenCalled();
    });
  });

  // ── Header Validation ────────────────────────────────────────────────────────

  describe('Header validation', () => {
    it('should throw UnauthorizedException when x-tenant-id header is missing', async () => {
      const ctx = buildContext({}); // No header

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(ctx)).rejects.toThrow('Missing required header: x-tenant-id');
    });

    it('should throw UnauthorizedException when x-tenant-id header is an empty string', async () => {
      const ctx = buildContext({ 'x-tenant-id': '   ' }); // Whitespace only

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
    });
  });

  // ── Database Validation ──────────────────────────────────────────────────────

  describe('Database validation', () => {
    it('should allow request and set request.tenantId when tenant exists in DB', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(MOCK_TENANT);
      const ctx = buildContext({ 'x-tenant-id': MOCK_TENANT.id });

      const result = await guard.canActivate(ctx);
      const request = ctx.switchToHttp().getRequest<{ tenantId?: string }>();

      expect(result).toBe(true);
      expect(request.tenantId).toBe(MOCK_TENANT.id);
    });

    it('should throw UnauthorizedException when tenant is not found in DB', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(null);
      const ctx = buildContext({ 'x-tenant-id': 'nonexistent-tenant' });

      await expect(guard.canActivate(ctx)).rejects.toThrow(UnauthorizedException);
      await expect(guard.canActivate(ctx)).rejects.toThrow('does not exist');
    });

    it('should query DB with only the id field selected (minimal data exposure)', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(MOCK_TENANT);
      const ctx = buildContext({ 'x-tenant-id': MOCK_TENANT.id });

      await guard.canActivate(ctx);

      expect(prismaService.tenant.findUnique).toHaveBeenCalledWith({
        where: { id: MOCK_TENANT.id },
        select: { id: true },
      });
    });
  });

  // ── In-Memory Cache ──────────────────────────────────────────────────────────

  describe('In-memory cache', () => {
    it('should call DB only once for two consecutive requests with the same tenantId', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(MOCK_TENANT);

      const ctx1 = buildContext({ 'x-tenant-id': MOCK_TENANT.id });
      const ctx2 = buildContext({ 'x-tenant-id': MOCK_TENANT.id });

      await guard.canActivate(ctx1);
      const result2 = await guard.canActivate(ctx2);

      expect(result2).toBe(true);
      expect(prismaService.tenant.findUnique).toHaveBeenCalledTimes(1); // Only once!
    });

    it('should have exactly 1 cache entry after validating one tenant', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(MOCK_TENANT);
      const ctx = buildContext({ 'x-tenant-id': MOCK_TENANT.id });

      await guard.canActivate(ctx);

      expect(guard.getCacheSize()).toBe(1);
    });

    it('should evict expired cache entries and re-query DB on next request', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(MOCK_TENANT);

      // Override TTL to 1ms so the entry expires immediately
      (guard as any).cacheTtlMs = 1;

      const ctx1 = buildContext({ 'x-tenant-id': MOCK_TENANT.id });
      await guard.canActivate(ctx1);

      // Wait for cache to expire
      await new Promise((resolve) => setTimeout(resolve, 10));

      const ctx2 = buildContext({ 'x-tenant-id': MOCK_TENANT.id });
      await guard.canActivate(ctx2);

      // DB should have been called twice: once for cache miss, once after expiry
      expect(prismaService.tenant.findUnique).toHaveBeenCalledTimes(2);
    });

    it('should handle multiple different tenants with independent cache entries', async () => {
      const tenant1 = { id: 'tenant-1' };
      const tenant2 = { id: 'tenant-2' };

      (prismaService.tenant.findUnique as jest.Mock)
        .mockResolvedValueOnce(tenant1)
        .mockResolvedValueOnce(tenant2);

      await guard.canActivate(buildContext({ 'x-tenant-id': 'tenant-1' }));
      await guard.canActivate(buildContext({ 'x-tenant-id': 'tenant-2' }));

      expect(guard.getCacheSize()).toBe(2);
      expect(prismaService.tenant.findUnique).toHaveBeenCalledTimes(2);

      // Second round should be cache hits for both
      await guard.canActivate(buildContext({ 'x-tenant-id': 'tenant-1' }));
      await guard.canActivate(buildContext({ 'x-tenant-id': 'tenant-2' }));

      expect(prismaService.tenant.findUnique).toHaveBeenCalledTimes(2); // Still 2 — no new DB calls
    });
  });

  // ── clearCache() helper ──────────────────────────────────────────────────────

  describe('clearCache()', () => {
    it('should empty the cache completely when clearCache() is called', async () => {
      (prismaService.tenant.findUnique as jest.Mock).mockResolvedValue(MOCK_TENANT);
      await guard.canActivate(buildContext({ 'x-tenant-id': MOCK_TENANT.id }));

      expect(guard.getCacheSize()).toBe(1);

      guard.clearCache();

      expect(guard.getCacheSize()).toBe(0);
    });
  });
});
