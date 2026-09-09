import { Injectable, NotFoundException, ConflictException, ForbiddenException, Logger } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class AgencyService {
  private readonly logger = new Logger(AgencyService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ── AGENCIAS ──────────────────────────────────────────────

  async createAgency(data: { name: string; ownerEmail: string; plan?: string }) {
    const existing = await this.prisma.agency.findUnique({
      where: { ownerEmail: data.ownerEmail },
    });
    if (existing) throw new ConflictException('Ya existe una agencia con ese email.');

    return this.prisma.agency.create({
      data: {
        name: data.name,
        ownerEmail: data.ownerEmail,
        plan: data.plan ?? 'free',
      },
    });
  }

  async findAllAgencies() {
    return this.prisma.agency.findMany({
      include: { _count: { select: { subaccounts: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findAgencyById(id: string) {
    const agency = await this.prisma.agency.findUnique({
      where: { id },
      include: {
        subaccounts: {
          select: { id: true, name: true, status: true, plan: true, createdAt: true, wahaSession: true },
          orderBy: { createdAt: 'desc' },
        },
        users: true,
        _count: { select: { subaccounts: true } },
      },
    });
    if (!agency) throw new NotFoundException('Agencia no encontrada.');
    return agency;
  }

  async deleteAgency(id: string) {
    const agency = await this.prisma.agency.findUnique({ where: { id } });
    if (!agency) throw new NotFoundException('Agencia no encontrada.');

    // Unlink any subaccounts so data is preserved
    await this.prisma.tenant.updateMany({
      where: { agencyId: id },
      data: { agencyId: null },
    });

    await this.prisma.agencyUser.deleteMany({
      where: { agencyId: id },
    });

    return this.prisma.agency.delete({
      where: { id },
    });
  }

  async linkSubaccount(agencyId: string, tenantId: string, name?: string) {
    const agency = await this.prisma.agency.findUnique({ where: { id: agencyId } });
    if (!agency) throw new NotFoundException('Agencia no encontrada.');

    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Subcuenta/Tenant no encontrado.');

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: {
        agencyId,
        ...(name ? { name } : {}),
      },
    });
  }

  async purgeSubaccount(tenantId: string) {
    if (tenantId === 'dba1c54c-89c6-41e9-ae9d-03613377a5b3') {
      throw new ConflictException('No se puede eliminar la cuenta principal de producción.');
    }

    const contacts = await this.prisma.contact.count({ where: { tenantId } });
    if (contacts > 0) {
      throw new ConflictException(`No se puede eliminar: tiene ${contacts} contactos registrados.`);
    }

    // Delete associated empty knowledgeBundle if exists
    await this.prisma.knowledgeBundle.deleteMany({ where: { tenantId } });
    return this.prisma.tenant.delete({ where: { id: tenantId } });
  }

  // ── SUBCUENTAS (TENANTS) ──────────────────────────────────

  async createSubaccount(agencyId: string, data: { name: string; plan?: string }) {
    // Verificar que la agencia existe
    const agency = await this.prisma.agency.findUnique({ where: { id: agencyId } });
    if (!agency) throw new NotFoundException('Agencia no encontrada.');

    const tenantId = crypto.randomUUID();
    const sessionName = `sub_${tenantId.replace(/-/g, '').slice(0, 10)}`;

    // Crear el tenant (subcuenta) con sesión WAHA preasignada
    const tenant = await this.prisma.tenant.create({
      data: {
        id: tenantId,
        name: data.name,
        agencyId,
        plan: data.plan ?? 'starter',
        status: 'active',
        wahaSession: sessionName,
      },
    });

    // Inicializar KnowledgeBundle vacío para que el bootstrap funcione de inmediato
    await this.prisma.knowledgeBundle.create({
      data: {
        tenantId: tenant.id,
        systemPrompt: {
          business: { name: data.name, description: '', industry: '' },
          products: [],
          services: [],
          faqs: [],
          objections: [],
          followUpSequences: [],
        },
        version: 1,
      },
    });

    return tenant;
  }

  async findSubaccountsByAgency(agencyId: string) {
    return this.prisma.tenant.findMany({
      where: { agencyId },
      include: {
        _count: { select: { contacts: true } },
        knowledgeBundle: { select: { version: true, updatedAt: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateSubaccountStatus(tenantId: string, status: 'active' | 'paused' | 'suspended') {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Subcuenta no encontrada.');

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status },
    });
  }

  async deleteSubaccount(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Subcuenta no encontrada.');

    return this.prisma.tenant.update({
      where: { id: tenantId },
      data: { status: 'suspended' },
    });
  }

  // ── STATS GENERALES ──────────────────────────────────────

  async getAgencyStats(agencyId: string) {
    const [totalSubaccounts, activeSubaccounts, totalContacts] = await Promise.all([
      this.prisma.tenant.count({ where: { agencyId } }),
      this.prisma.tenant.count({ where: { agencyId, status: 'active' } }),
      this.prisma.contact.count({
        where: { tenant: { agencyId } },
      }),
    ]);

    return { totalSubaccounts, activeSubaccounts, totalContacts };
  }

  // ── OVERVIEW / TODAS LAS CUENTAS (INCLUIDA LA PRINCIPAL) ──

  async getOverview() {
    const [agencies, unassignedTenants] = await Promise.all([
      this.prisma.agency.findMany({
        include: {
          subaccounts: {
            select: { id: true, name: true, status: true, plan: true, createdAt: true, wahaSession: true },
            orderBy: { createdAt: 'desc' },
          },
          _count: { select: { subaccounts: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.tenant.findMany({
        where: { agencyId: null },
        select: { id: true, name: true, status: true, plan: true, createdAt: true, wahaSession: true },
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    return { agencies, unassignedTenants };
  }

  // ── GESTIÓN WAHA MULTI-TENANT ───────────────────────────────

  private getWahaConfig() {
    return {
      apiUrl: process.env.WAHA_API_URL || 'https://waha.ingeniodigital.shop',
      apiKey: process.env.WAHA_API_KEY || 'secreto123',
      webhookUrl: `${process.env.CORE_API_URL || 'https://core.ai.ingeniodigital.shop'}/webhooks/meta`,
    };
  }

  private isProtectedSession(tenantId: string, sessionName?: string | null): boolean {
    return (
      tenantId === 'dba1c54c-89c6-41e9-ae9d-03613377a5b3' ||
      sessionName === 'ferreos'
    );
  }

  /**
   * Asegura que el tenant tenga un nombre de sesión WAHA asignado
   */
  async ensureTenantWahaSession(tenantId: string): Promise<string> {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Subcuenta no encontrada.');

    if (tenant.wahaSession) {
      return tenant.wahaSession;
    }

    const newSession = `sub_${tenant.id.replace(/-/g, '').slice(0, 10)}`;
    await this.prisma.tenant.update({
      where: { id: tenantId },
      data: { wahaSession: newSession },
    });
    return newSession;
  }

  /**
   * Consulta el estado de la sesión WAHA para una subcuenta
   */
  async getSubaccountWahaStatus(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Subcuenta no encontrada.');

    const sessionName = tenant.wahaSession || (await this.ensureTenantWahaSession(tenantId));
    const isProtected = this.isProtectedSession(tenantId, sessionName);
    const { apiUrl, apiKey } = this.getWahaConfig();

    try {
      const res = await fetch(`${apiUrl}/api/sessions/${sessionName}`, {
        headers: { 'X-Api-Key': apiKey, Accept: 'application/json' },
        signal: AbortSignal.timeout(4000),
      });

      if (!res.ok) {
        if (res.status === 404) {
          return {
            session: sessionName,
            status: 'NOT_CONFIGURED',
            isProtected,
            phone: null,
            pushName: null,
          };
        }
        return {
          session: sessionName,
          status: 'ERROR',
          isProtected,
          error: await res.text().catch(() => 'Error consultando WAHA'),
        };
      }

      const sessionData = await res.json();
      return {
        session: sessionName,
        status: sessionData.status || 'UNKNOWN',
        phone: sessionData.me?.id ? sessionData.me.id.replace(/@.*$/, '') : null,
        pushName: sessionData.me?.pushName || null,
        isProtected,
      };
    } catch (err: any) {
      return {
        session: sessionName,
        status: 'OFFLINE',
        isProtected,
        error: err.message,
      };
    }
  }

  /**
   * Inicia o crea la sesión en WAHA con los webhooks enrutados a Core
   */
  async startSubaccountWaha(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Subcuenta no encontrada.');

    const sessionName = tenant.wahaSession || (await this.ensureTenantWahaSession(tenantId));
    const isProtected = this.isProtectedSession(tenantId, sessionName);
    const { apiUrl, apiKey, webhookUrl } = this.getWahaConfig();

    // 1. Verificar si ya existe en WAHA
    const checkRes = await fetch(`${apiUrl}/api/sessions/${sessionName}`, {
      headers: { 'X-Api-Key': apiKey, Accept: 'application/json' },
      signal: AbortSignal.timeout(4000),
    }).catch(() => null);

    if (checkRes && checkRes.ok) {
      const existing = await checkRes.json();
      if (existing.status === 'WORKING') {
        return {
          session: sessionName,
          status: 'WORKING',
          phone: existing.me?.id ? existing.me.id.replace(/@.*$/, '') : null,
          pushName: existing.me?.pushName || null,
          isProtected,
        };
      }

      // Si está en STOPPED o FAILED, iniciarlo
      if (existing.status === 'STOPPED' || existing.status === 'FAILED') {
        await fetch(`${apiUrl}/api/sessions/${sessionName}/start`, {
          method: 'POST',
          headers: { 'X-Api-Key': apiKey },
        });
      }
    } else {
      // 2. Crear y arrancar nueva sesión en WAHA
      const createRes = await fetch(`${apiUrl}/api/sessions`, {
        method: 'POST',
        headers: {
          'X-Api-Key': apiKey,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          name: sessionName,
          start: true,
          config: {
            webhooks: [
              {
                url: webhookUrl,
                events: ['session.status', 'message'],
              },
            ],
          },
        }),
      });

      if (!createRes.ok) {
        const errorText = await createRes.text().catch(() => '');
        throw new ConflictException(`Error al iniciar sesión en WAHA: ${errorText}`);
      }
    }

    return this.getSubaccountWahaStatus(tenantId);
  }

  /**
   * Obtiene el código QR en formato Base64 para escaneo directo
   */
  async getSubaccountWahaQr(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Subcuenta no encontrada.');

    const sessionName = tenant.wahaSession || (await this.ensureTenantWahaSession(tenantId));
    const isProtected = this.isProtectedSession(tenantId, sessionName);
    const { apiUrl, apiKey } = this.getWahaConfig();

    try {
      const res = await fetch(`${apiUrl}/api/${sessionName}/auth/qr`, {
        headers: { 'X-Api-Key': apiKey },
        signal: AbortSignal.timeout(6000),
      });

      if (res.status === 422) {
        const status = await this.getSubaccountWahaStatus(tenantId);
        return {
          session: sessionName,
          status: status.status,
          qr: null,
          isProtected,
          message: 'La sesión no requiere escaneo de QR actualmente.',
        };
      }

      if (!res.ok) {
        return {
          session: sessionName,
          status: 'UNAVAILABLE',
          qr: null,
          isProtected,
          error: await res.text().catch(() => 'No disponible'),
        };
      }

      const buffer = await res.arrayBuffer();
      const base64 = Buffer.from(buffer).toString('base64');
      const dataUrl = `data:image/png;base64,${base64}`;

      return {
        session: sessionName,
        status: 'SCAN_QR_CODE',
        qr: dataUrl,
        isProtected,
      };
    } catch (err: any) {
      return {
        session: sessionName,
        status: 'ERROR',
        qr: null,
        isProtected,
        error: err.message,
      };
    }
  }

  /**
   * Cierra la sesión en WAHA de una subcuenta (con candado en ferreos/prod)
   */
  async logoutSubaccountWaha(tenantId: string) {
    const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
    if (!tenant) throw new NotFoundException('Subcuenta no encontrada.');

    const sessionName = tenant.wahaSession;
    if (this.isProtectedSession(tenantId, sessionName)) {
      throw new ForbiddenException(
        'Acción denegada: La sesión de producción principal (ferreos) está blindada y no puede ser desconectada.'
      );
    }

    if (!sessionName) {
      return { success: true, message: 'No había sesión configurada.' };
    }

    const { apiUrl, apiKey } = this.getWahaConfig();

    await fetch(`${apiUrl}/api/sessions/${sessionName}/logout`, {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
    }).catch(() => null);

    await fetch(`${apiUrl}/api/sessions/${sessionName}/stop`, {
      method: 'POST',
      headers: { 'X-Api-Key': apiKey },
    }).catch(() => null);

    return { success: true, session: sessionName, status: 'STOPPED' };
  }
}
