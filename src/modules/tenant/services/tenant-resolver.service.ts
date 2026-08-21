import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';

@Injectable()
export class TenantResolverService {
  private readonly logger = new Logger(TenantResolverService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves the real tenant.id from a WAHA session string.
   * For single-tenant setups, falls back to the first available tenant
   * if the exact wahaSession name is not found (handles dev/prod naming mismatches).
   */
  async resolveFromWahaSession(sessionName: string): Promise<string> {
    if (!sessionName) {
      throw new NotFoundException('WAHA session name is required to resolve tenant');
    }

    // 1. Try exact match first
    const tenant = await this.prisma.tenant.findUnique({
      where: { wahaSession: sessionName },
    });

    if (tenant) {
      return tenant.id;
    }

    // 2. Fallback: in single-tenant deployments the session name in WAHA
    //    may differ from the stored wahaSession value (e.g. 'default' vs 'ferreos').
    //    Use the first and only tenant available.
    const allTenants = await this.prisma.tenant.findMany({ take: 2 });

    if (allTenants.length === 1) {
      this.logger.warn(
        `No tenant found for wahaSession="${sessionName}". ` +
        `Falling back to single tenant "${allTenants[0].id}" (wahaSession="${allTenants[0].wahaSession}").`,
      );
      return allTenants[0].id;
    }

    throw new NotFoundException(`No tenant found for WAHA session: ${sessionName}`);
  }
}
