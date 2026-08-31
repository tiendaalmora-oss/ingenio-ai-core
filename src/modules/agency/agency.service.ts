import { Injectable, NotFoundException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';

@Injectable()
export class AgencyService {
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
          select: { id: true, name: true, status: true, plan: true, createdAt: true },
          orderBy: { createdAt: 'desc' },
        },
        users: true,
        _count: { select: { subaccounts: true } },
      },
    });
    if (!agency) throw new NotFoundException('Agencia no encontrada.');
    return agency;
  }

  // ── SUBCUENTAS (TENANTS) ──────────────────────────────────

  async createSubaccount(agencyId: string, data: { name: string; plan?: string }) {
    // Verificar que la agencia existe
    const agency = await this.prisma.agency.findUnique({ where: { id: agencyId } });
    if (!agency) throw new NotFoundException('Agencia no encontrada.');

    return this.prisma.tenant.create({
      data: {
        name: data.name,
        agencyId,
        plan: data.plan ?? 'starter',
        status: 'active',
      },
    });
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
}
