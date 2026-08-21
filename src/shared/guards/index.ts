/**
 * Guards Barrel Export
 *
 * Re-exports all NestJS guards from this shared directory.
 * Import from here instead of from individual files:
 *
 * @example
 * ```typescript
 * import { TenantGuard, SkipTenantGuard } from '../../shared/guards';
 * ```
 */
export { TenantGuard } from './tenant.guard';
export { SkipTenantGuard, SKIP_TENANT_GUARD_KEY } from './skip-tenant-guard.decorator';
