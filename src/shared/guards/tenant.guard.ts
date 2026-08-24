import {
  CanActivate,
  ExecutionContext,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { SKIP_TENANT_GUARD_KEY } from './skip-tenant-guard.decorator';
import { PrismaService } from '../database/prisma.service';

/** Shape of a cached tenant entry stored in the in-memory Map. */
interface TenantCacheEntry {
  tenantId: string;
  expiresAt: number;
}

/**
 * TenantGuard — Validates the `x-tenant-id` header on every incoming HTTP request.
 *
 * ## Responsibilities
 * 1. Reads `x-tenant-id` header from the incoming HTTP request (Express & Fastify compatible).
 * 2. Skips validation for routes decorated with `@SkipTenantGuard()`.
 * 3. Verifies the tenant exists in the database — with a short-lived in-memory cache.
 * 4. Injects `tenantId` into `request.tenantId` for downstream use via `@TenantId()`.
 *
 * ## What this guard does NOT do
 * - Does NOT authenticate a User (no JWT, no session). That is the AuthGuard's job.
 * - Does NOT check RBAC roles or feature flags.
 * - Does NOT validate request signatures (that is the webhook HMAC validator's job).
 *
 * ## Cache strategy
 * Tenant rows are stable and rarely deleted. A 2-minute in-memory cache is sufficient
 * for Phase 1 (single-instance Monolith). In Phase 2, replace with a Redis-backed
 * `TenantCacheService` by changing only the constructor injection.
 *
 * ## Applying the guard globally (recommended)
 * ```typescript
 * // In main.ts, after app creation:
 * const reflector = app.get(Reflector);
 * const prisma = app.get(PrismaService);
 * app.useGlobalGuards(new TenantGuard(reflector, prisma));
 * ```
 *
 * ## Bypassing for public routes
 * ```typescript
 * @Post()
 * @SkipTenantGuard()
 * async receiveWebhook() { ... }
 * ```
 */
@Injectable()
export class TenantGuard implements CanActivate {
  private readonly logger = new Logger(TenantGuard.name);

  /**
   * In-memory tenant cache.
   * Key: tenantId string
   * Value: { tenantId, expiresAt (unix ms) }
   */
  private readonly cache = new Map<string, TenantCacheEntry>();

  /**
   * Cache TTL in milliseconds.
   * Configurable via TENANT_CACHE_TTL_MS env var. Default: 2 minutes.
   */
  private readonly cacheTtlMs: number;

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {
    this.cacheTtlMs = parseInt(
      process.env.TENANT_CACHE_TTL_MS ?? String(2 * 60 * 1000),
      10,
    );
  }

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // 1. Check if the route explicitly opts out of tenant validation.
    const skipGuard = this.reflector.getAllAndOverride<boolean>(SKIP_TENANT_GUARD_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (skipGuard) {
      this.logger.debug(
        `[TenantGuard] Skipping for: ${context.getClass().name}.${context.getHandler().name}`,
      );
      return true;
    }

    // 2. Extract header — compatible with both Fastify and Express request shapes.
    const request = context.switchToHttp().getRequest<Record<string, any>>();
    let tenantId: string | undefined = request.headers?.['x-tenant-id'];

    if (!tenantId || typeof tenantId !== 'string' || tenantId.trim() === '') {
      // In single-tenant mode: Fallback to the single tenant in DB if available
      if (typeof this.prisma?.tenant?.findMany === 'function') {
        const allTenants = await this.prisma.tenant.findMany({ take: 2, select: { id: true } });
        if (allTenants && allTenants.length === 1) {
          tenantId = allTenants[0].id;
          request.tenantId = tenantId;
          return true;
        }
      }
      this.logger.warn('[TenantGuard] Missing or empty x-tenant-id header');
      throw new UnauthorizedException(
        'Missing required header: x-tenant-id',
      );
    }

    // 3. Lazy cleanup of expired cache entries (O(n) worst-case, amortized O(1)).
    this.pruneExpiredEntries();

    // 4. Cache HIT → inject and allow.
    const cached = this.cache.get(tenantId);
    if (cached && cached.expiresAt > Date.now()) {
      this.logger.debug(`[TenantGuard] Cache HIT for tenant ${tenantId}`);
      request.tenantId = tenantId;
      return true;
    }

    // 5. Cache MISS → validate against DB.
    this.logger.debug(`[TenantGuard] Cache MISS — querying DB for tenant ${tenantId}`);

    const tenant = await this.prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { id: true },
    });

    if (!tenant) {
      this.logger.warn(`[TenantGuard] Tenant not found: ${tenantId}`);
      throw new UnauthorizedException(`Tenant "${tenantId}" does not exist.`);
    }

    // 6. Populate cache.
    this.cache.set(tenantId, {
      tenantId,
      expiresAt: Date.now() + this.cacheTtlMs,
    });

    this.logger.debug(`[TenantGuard] Tenant ${tenantId} validated and cached (TTL: ${this.cacheTtlMs}ms).`);

    // 7. Inject tenantId into request for downstream param decorators.
    request.tenantId = tenantId;
    return true;
  }

  // ── Internal Helpers (exposed for testing) ────────────────────────────────────

  /** Removes expired entries from cache. Called lazily on each guard invocation. */
  private pruneExpiredEntries(): void {
    const now = Date.now();
    for (const [key, entry] of this.cache.entries()) {
      if (entry.expiresAt <= now) {
        this.cache.delete(key);
        this.logger.debug(`[TenantGuard] Evicted expired cache entry for tenant ${key}`);
      }
    }
  }

  /** Clears the entire cache. Exposed for testing only. @internal */
  clearCache(): void {
    this.cache.clear();
  }

  /** Returns the current cache size. Exposed for testing only. @internal */
  getCacheSize(): number {
    return this.cache.size;
  }
}
