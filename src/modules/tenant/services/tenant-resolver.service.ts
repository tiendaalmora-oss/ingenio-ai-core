import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';

@Injectable()
export class TenantResolverService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves the real tenant.id from a WAHA session string.
   */
  async resolveFromWahaSession(sessionName: string): Promise<string> {
    if (!sessionName) {
      throw new NotFoundException('WAHA session name is required to resolve tenant');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { wahaSession: sessionName },
    });

    if (!tenant) {
      throw new NotFoundException(`No tenant found for WAHA session: ${sessionName}`);
    }

    return tenant.id;
  }
}
