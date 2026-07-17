import { Controller, Get, Query, Param } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';

@Controller('memory')
export class MemoryController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /memory/timeline
   * Global audit timeline across all contacts.
   * Supports: ?tenantId= &search= &field= &source= &page= &limit=
   */
  @Get('timeline')
  async getTimeline(
    @Query('tenantId') tenantId?: string,
    @Query('search') search?: string,
    @Query('field') field?: string,
    @Query('source') source?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '50',
  ) {
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where: any = {};
    if (tenantId) where.tenantId = tenantId;
    if (field)   where.field = field;
    if (source)  where.source = source;
    if (search) {
      where.OR = [
        { newValue:      { contains: search, mode: 'insensitive' } },
        { previousValue: { contains: search, mode: 'insensitive' } },
        { contactId:     { contains: search, mode: 'insensitive' } },
        { skill:         { contains: search, mode: 'insensitive' } },
      ];
    }

    const [total, logs] = await Promise.all([
      this.prisma.memoryAuditLog.count({ where }),
      this.prisma.memoryAuditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: parseInt(limit),
        include: {
          memory: {
            select: {
              name: true,
              company: true,
              contact: { select: { name: true, phone: true, tenantId: true } },
            },
          },
        },
      }),
    ]);

    return {
      total,
      page: parseInt(page),
      data: logs.map(log => ({
        id:            log.id,
        contactId:     log.contactId,
        contactName:   log.memory?.name ?? log.memory?.contact?.name ?? log.contactId,
        company:       log.memory?.company ?? null,
        tenantId:      log.memory?.contact?.tenantId ?? log.tenantId,
        field:         log.field,
        previousValue: this._parse(log.previousValue),
        newValue:      this._parse(log.newValue),
        source:        log.source,
        skill:         log.skill,
        confidence:    log.confidence,
        conversationId: log.conversationId,
        createdAt:     log.createdAt,
      })),
    };
  }

  /**
   * GET /memory/contact/:contactId
   * Full memory card + audit history for one lead.
   */
  @Get('contact/:contactId')
  async getContactMemory(@Param('contactId') contactId: string) {
    const [memory, logs] = await Promise.all([
      this.prisma.businessMemory.findUnique({
        where: { contactId },
        include: {
          contact: { select: { name: true, phone: true, tenantId: true } },
        },
      }),
      this.prisma.memoryAuditLog.findMany({
        where: { contactId },
        orderBy: { createdAt: 'desc' },
        take: 100,
      }),
    ]);

    if (!memory) return { contactId, memory: null, timeline: [] };

    // Group logs into timeline entries (one entry per write session)
    const timeline = logs.map(l => ({
      id:            l.id,
      field:         l.field,
      previousValue: this._parse(l.previousValue),
      newValue:      this._parse(l.newValue),
      source:        l.source,
      skill:         l.skill,
      confidence:    l.confidence,
      conversationId: l.conversationId,
      createdAt:     l.createdAt,
    }));

    return {
      contactId,
      contactName: memory.name ?? memory.contact.name,
      phone:       memory.contact.phone,
      tenantId:    memory.contact.tenantId,
      memory: {
        id:             memory.id,
        name:           memory.name,
        company:        memory.company,
        interests:      memory.interests,
        objections:     memory.objections,
        leadStatus:     memory.leadStatus,
        tags:           memory.tags,
        lastInteraction: memory.lastInteraction,
        updatedAt:      memory.updatedAt,
      },
      timeline,
    };
  }

  /**
   * GET /memory/company
   * Aggregate memory grouped by company.
   */
  @Get('company')
  async getByCompany(@Query('tenantId') tenantId?: string) {
    const memories = await this.prisma.businessMemory.findMany({
      where: { company: { not: null } },
      include: {
        contact: { select: { tenantId: true } },
        auditLogs: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });

    const filtered = tenantId
      ? memories.filter(m => m.contact.tenantId === tenantId)
      : memories;

    // Group by company
    const grouped: Record<string, any> = {};
    for (const m of filtered) {
      const co = m.company!;
      if (!grouped[co]) {
        grouped[co] = { company: co, leads: [], totalInteractions: 0, lastActivity: null };
      }
      grouped[co].leads.push({
        contactId:  m.contactId,
        name:       m.name,
        interests:  m.interests,
        leadStatus: m.leadStatus,
        updatedAt:  m.updatedAt,
      });
      if (!grouped[co].lastActivity || m.updatedAt > grouped[co].lastActivity) {
        grouped[co].lastActivity = m.updatedAt;
      }
    }

    return { companies: Object.values(grouped) };
  }

  /**
   * GET /memory/stats
   * Dashboard-level metrics for the Memory Center header.
   */
  @Get('stats')
  async getStats(@Query('tenantId') tenantId?: string) {
    const [totalMemories, totalLogs, recentLogs] = await Promise.all([
      this.prisma.businessMemory.count(),
      this.prisma.memoryAuditLog.count(),
      this.prisma.memoryAuditLog.findMany({
        orderBy: { createdAt: 'desc' },
        take: 5,
        include: {
          memory: { select: { name: true, company: true } },
        },
      }),
    ]);

    // Field frequency breakdown
    const fieldCounts = await this.prisma.memoryAuditLog.groupBy({
      by: ['field'],
      _count: { field: true },
    });

    return {
      totalLeadsWithMemory: totalMemories,
      totalLearningEvents: totalLogs,
      fieldBreakdown: fieldCounts.map(f => ({ field: f.field, count: f._count.field })),
      recentActivity: recentLogs.map(l => ({
        id:          l.id,
        contactName: l.memory?.name ?? l.contactId,
        company:     l.memory?.company,
        field:       l.field,
        source:      l.source,
        skill:       l.skill,
        createdAt:   l.createdAt,
      })),
    };
  }

  private _parse(val: string | null): any {
    if (val === null || val === undefined) return null;
    try { return JSON.parse(val); } catch { return val; }
  }
}
