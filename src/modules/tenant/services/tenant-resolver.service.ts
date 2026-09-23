import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';

const PROD_MAIN_TENANT_ID = 'dba1c54c-89c6-41e9-ae9d-03613377a5b3';

@Injectable()
export class TenantResolverService {
  private readonly logger = new Logger(TenantResolverService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Resolves the real tenant.id from a WAHA session string.
   * Handles multi-tenant subaccounts ('sub_*'), prod session ('ferreos'),
   * and resiliently falls back to the main production tenant if session is undefined or 'default'.
   */
  async resolveFromWahaSession(sessionName: string): Promise<string> {
    const cleanSession = (sessionName || '').trim();

    // 1. Si no hay sesión o es 'ferreos' / 'default', asociar a la cuenta principal de producción
    if (!cleanSession || cleanSession === 'default' || cleanSession === 'ferreos') {
      const prodTenant = await this.prisma.tenant.findFirst({
        where: {
          OR: [
            { id: PROD_MAIN_TENANT_ID },
            { wahaSession: 'ferreos' }
          ]
        },
        select: { id: true }
      });
      if (prodTenant) return prodTenant.id;
      return PROD_MAIN_TENANT_ID;
    }

    // 2. Coincidencia exacta por wahaSession (para subcuentas o sesiones personalizadas)
    const exactTenant = await this.prisma.tenant.findUnique({
      where: { wahaSession: cleanSession },
      select: { id: true }
    });
    if (exactTenant) {
      return exactTenant.id;
    }

    // 3. Si tiene prefijo sub_, intentar buscar por prefijo del id del tenant
    if (cleanSession.startsWith('sub_')) {
      const rawIdPrefix = cleanSession.replace(/^sub_/, '');
      const tenantByPrefix = await this.prisma.tenant.findFirst({
        where: {
          id: { startsWith: rawIdPrefix.slice(0, 8) }
        },
        select: { id: true }
      });
      if (tenantByPrefix) {
        return tenantByPrefix.id;
      }
    }

    // 4. Fallback seguro: jamás arrojar 404 para no perder mensajes de clientes en el webhook
    this.logger.warn(
      `[TenantResolver] No se encontró tenant exacto para wahaSession="${cleanSession}". Usando cuenta principal de producción por contingencia.`
    );
    const fallbackTenant = await this.prisma.tenant.findFirst({
      where: {
        OR: [
          { id: PROD_MAIN_TENANT_ID },
          { wahaSession: 'ferreos' }
        ]
      },
      select: { id: true }
    });

    if (fallbackTenant) return fallbackTenant.id;

    // Si la DB estuviera vacía de la principal, tomar el primer tenant existente
    const anyTenant = await this.prisma.tenant.findFirst({ select: { id: true } });
    if (anyTenant) return anyTenant.id;

    return PROD_MAIN_TENANT_ID;
  }
}
