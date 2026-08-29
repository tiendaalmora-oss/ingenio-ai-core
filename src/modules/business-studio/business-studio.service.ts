import { Injectable, NotFoundException, Logger, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { KnowledgeBundleComposer } from './knowledge-bundle.composer';

@Injectable()
export class BusinessStudioService {
  private readonly logger = new Logger(BusinessStudioService.name);

  constructor(
    private prisma: PrismaService,
    private eventEmitter: EventEmitter2,
    private composer: KnowledgeBundleComposer
  ) {}

  async getKnowledgeBase(tenantId: string, prefetchedBundle?: any) {
    const bundle = prefetchedBundle !== undefined ? prefetchedBundle : await this.prisma.knowledgeBundle.findUnique({
      where: { tenantId }
    });
    const prompt: any = bundle?.systemPrompt || {};
    const rawData = prompt['_raw'] || prompt;
    
    return {
      identidad: rawData.identidad ?? prompt.identidad ?? {},
      empresa: rawData.empresa ?? prompt.empresa ?? {},
      enrutamiento: rawData.enrutamiento ?? prompt.enrutamiento ?? {},
      reglasBot: rawData.reglasBot ?? prompt.reglasBot ?? {
        autoPauseOptOut: true,
        optOutMessage: 'Entendido perfectamente. Agradecemos mucho tu tiempo y honestidad. ¡Que tengas un excelente día!',
        autoPauseHandoff: true,
        handoffMessage: 'Con gusto. En breve un asesor humano de nuestro equipo continuará la conversación contigo por acá.',
        enableMessageLimit: true,
        maxBotMessages: 10,
        limitReachedMessage: 'Para brindarte una atención personalizada y revisar los detalles de tu caso, te transferiré con un asesor de nuestro equipo que te atenderá en breve.'
      },
      productos: rawData.productos || [],
      categorias: rawData.categorias || [],
      servicios: rawData.servicios || [],
      faqs: rawData.faqs || [],
      objeciones: rawData.objeciones || [],
      scriptsComerciales: rawData.scriptsComerciales || [],
      promociones: rawData.promociones || [],
      seguimientos: rawData.seguimientos || [],
      soporte: rawData.soporte || [],
      politicasAtencion: rawData.politicasAtencion || [],
    };
  }

  getMenu() {
    return [
      { id: 'dashboard', title: 'Dashboard', icon: 'LayoutDashboard', route: '/dashboard', enabled: true, order: 1 },
      { id: 'business-studio', title: 'Business Studio', icon: 'Briefcase', route: '/business-studio', enabled: true, order: 2 },
      { id: 'crm', title: 'CRM', icon: 'Users', route: '/crm', enabled: true, order: 3 },
      { id: 'conversations', title: 'Conversations', icon: 'MessageSquare', route: '/conversations', enabled: true, order: 4 },
      { id: 'memory', title: 'Memory', icon: 'Brain', route: '/memory', enabled: true, order: 5 },
      { id: 'analytics', title: 'Analytics', icon: 'BarChart', route: '/analytics', enabled: true, order: 6 },
      { id: 'settings', title: 'Settings', icon: 'Settings', route: '/settings', enabled: true, order: 7 }
    ];
  }

  async getStatus(tenantId: string, prefetchedBundle?: any) {
    const bundle = prefetchedBundle !== undefined ? prefetchedBundle : await this.prisma.knowledgeBundle.findUnique({ where: { tenantId } });
    
    let dbStatus = 'UP';
    try { await this.prisma.$queryRaw`SELECT 1`; } catch { dbStatus = 'DOWN'; }

    return {
      tenant: tenantId,
      knowledgeBundle: bundle ? 'ACTIVE' : 'INACTIVE',
      knowledgeVersion: bundle?.version || 0,
      cacheLoaded: bundle ? true : false,
      hermes: 'UP',
      waha: 'UP',
      followUpEngine: 'UP',
      outboundDispatcher: 'UP',
      database: dbStatus,
      eventBus: 'UP',
      lastHealthCheck: new Date()
    };
  }

  async getHealth(tenantId: string, prefetchedStatus?: any) {
    const status = prefetchedStatus || await this.getStatus(tenantId);
    return [
      { name: 'Database', status: status.database },
      { name: 'WAHA', status: status.waha },
      { name: 'Hermes', status: status.hermes },
      { name: 'Knowledge', status: status.knowledgeBundle === 'ACTIVE' ? 'UP' : 'WARNING' },
      { name: 'EventBus', status: status.eventBus },
      { name: 'CRM', status: 'UP' },
      { name: 'Memory', status: 'UP' },
      { name: 'FollowUp', status: status.followUpEngine },
      { name: 'Outbound', status: status.outboundDispatcher }
    ];
  }

  async getStats(tenantId: string, prefetchedBundle?: any) {
    const bundle = prefetchedBundle !== undefined ? prefetchedBundle : await this.prisma.knowledgeBundle.findUnique({ where: { tenantId } });
    const prompt: any = bundle?.systemPrompt || {};
    const rawData = prompt['_raw'] || {};

    const [totalContacts, totalConversations, totalTasks, totalBusinessMemory] = await Promise.all([
      this.prisma.contact.count({ where: { tenantId } }),
      this.prisma.conversation.count({ where: { contact: { tenantId } } }),
      this.prisma.task.count({ where: { contact: { tenantId } } }),
      this.prisma.businessMemory.count({ where: { contact: { tenantId } } })
    ]);

    return {
      totalProducts: Array.isArray(rawData.productos) ? rawData.productos.length : 0,
      totalServices: Array.isArray(rawData.servicios) ? rawData.servicios.length : 0,
      totalFaqs: Array.isArray(rawData.faqs) ? rawData.faqs.length : 0,
      totalObjections: Array.isArray(rawData.objeciones) ? rawData.objeciones.length : 0,
      totalFollowUps: Array.isArray(rawData.seguimientos) ? rawData.seguimientos.length : 0,
      totalPolicies: Array.isArray(rawData.politicasAtencion) ? rawData.politicasAtencion.length : 0,
      totalContacts,
      totalConversations,
      totalTasks,
      totalBusinessMemory,
      knowledgeVersion: bundle?.version || 0
    };
  }

  getSchema() {
    return [
      { key: 'identidad', title: 'Identidad del Bot', description: 'Personalidad y nombre', icon: 'User', editable: true, collection: false },
      { key: 'empresa', title: 'Datos de la Empresa', description: 'Información general', icon: 'Building', editable: true, collection: false },
      { key: 'enrutamiento', title: 'Estrategia y Enrutamiento', description: 'Triaje, venta cruzada y flujo', icon: 'Compass', editable: true, collection: false },
      { key: 'reglasBot', title: 'Control y Pausa del Bot', description: 'Límites de mensajes y auto-pausa', icon: 'ShieldAlert', editable: true, collection: false },
      { key: 'productos', title: 'Productos', description: 'Catálogo y Base de Conocimiento técnica', icon: 'Package', editable: true, collection: true },
      { key: 'categorias', title: 'Categorías', description: 'Categorías de productos', icon: 'Tags', editable: true, collection: true },
      { key: 'servicios', title: 'Servicios', description: 'Servicios ofrecidos', icon: 'Briefcase', editable: true, collection: true },
      { key: 'faqs', title: 'Preguntas Frecuentes', description: 'Respuestas automáticas', icon: 'HelpCircle', editable: true, collection: true },
      { key: 'objeciones', title: 'Objeciones', description: 'Manejo de objeciones', icon: 'Shield', editable: true, collection: true },
      { key: 'scriptsComerciales', title: 'Scripts Comerciales', description: 'Guiones de venta', icon: 'FileText', editable: true, collection: true },
      { key: 'promociones', title: 'Promociones', description: 'Ofertas activas', icon: 'Tag', editable: true, collection: true },
      { key: 'seguimientos', title: 'Seguimientos', description: 'Reglas de follow-up', icon: 'Repeat', editable: true, collection: true },
      { key: 'soporte', title: 'Soporte', description: 'Datos de contacto', icon: 'LifeBuoy', editable: true, collection: true },
      { key: 'politicasAtencion', title: 'Políticas', description: 'Reglas de atención', icon: 'Book', editable: true, collection: true },
    ];
  }

  async getDashboard(tenantId: string, prefetchedBundle?: any) {
    const bundle = prefetchedBundle !== undefined ? prefetchedBundle : await this.prisma.knowledgeBundle.findUnique({
      where: { tenantId }
    });
    
    if (!bundle) {
      return {
        tenant: tenantId,
        knowledgeVersion: 0,
        lastUpdate: null,
        productCount: 0,
        faqCount: 0,
        objectionCount: 0,
        followUpCount: 0,
        serviceCount: 0,
        bundleStatus: 'NO_BUNDLE',
        cacheStatus: 'MISSING'
      };
    }

    const prompt: any = bundle.systemPrompt || {};
    const rawData = prompt['_raw'] || {};

    return {
      tenant: tenantId,
      knowledgeVersion: bundle.version,
      lastUpdate: bundle.updatedAt,
      productCount: Array.isArray(rawData.productos) ? rawData.productos.length : 0,
      faqCount: Array.isArray(rawData.faqs) ? rawData.faqs.length : 0,
      objectionCount: Array.isArray(rawData.objeciones) ? rawData.objeciones.length : 0,
      followUpCount: Array.isArray(rawData.seguimientos) ? rawData.seguimientos.length : 0,
      serviceCount: Array.isArray(rawData.servicios) ? rawData.servicios.length : 0,
      bundleStatus: 'ACTIVE',
      cacheStatus: 'HIT'
    };
  }

  async getSection(tenantId: string, section: string) {
    const base = await this.getKnowledgeBase(tenantId);
    return base[section] ?? (['identidad', 'empresa', 'enrutamiento', 'reglasBot'].includes(section) ? {} : []);
  }

  async getItems(tenantId: string, section: string) {
    const base = await this.getKnowledgeBase(tenantId);
    return Array.isArray(base[section]) ? base[section] : [];
  }

  async getBundle(tenantId: string) {
    return this.getKnowledgeBase(tenantId);
  }

  async updateSection(tenantId: string, section: string, data: any, expectedVersion?: number) {
    return this.prisma.$transaction(async (tx) => {
      const { rawData, currentVersion } = await this.getRawBundleTx(tx, tenantId);
      this.checkOptimisticLock(currentVersion, expectedVersion);
      
      rawData[section] = data;
      await this.saveRawBundleTx(tx, tenantId, rawData, section, currentVersion);
      return rawData[section];
    });
  }

  async addItem(tenantId: string, section: string, item: any, expectedVersion?: number) {
    return this.prisma.$transaction(async (tx) => {
      const { rawData, currentVersion } = await this.getRawBundleTx(tx, tenantId);
      this.checkOptimisticLock(currentVersion, expectedVersion);

      if (!rawData[section]) rawData[section] = [];
      if (!item.id) item.id = Date.now().toString();
      
      rawData[section].push(item);
      await this.saveRawBundleTx(tx, tenantId, rawData, section, currentVersion);
      return item;
    });
  }

  async updateItem(tenantId: string, section: string, itemId: string, item: any, expectedVersion?: number) {
    return this.prisma.$transaction(async (tx) => {
      const { rawData, currentVersion } = await this.getRawBundleTx(tx, tenantId);
      this.checkOptimisticLock(currentVersion, expectedVersion);

      if (!rawData[section]) rawData[section] = [];
      
      const index = rawData[section].findIndex((i: any) => i.id === itemId);
      if (index !== -1) {
        rawData[section][index] = { ...rawData[section][index], ...item, id: itemId };
      } else {
        throw new NotFoundException(`Item with id ${itemId} not found in ${section}`);
      }
      
      await this.saveRawBundleTx(tx, tenantId, rawData, section, currentVersion);
      return rawData[section][index];
    });
  }

  async deleteItem(tenantId: string, section: string, itemId: string, expectedVersion?: number) {
    return this.prisma.$transaction(async (tx) => {
      const { rawData, currentVersion } = await this.getRawBundleTx(tx, tenantId);
      this.checkOptimisticLock(currentVersion, expectedVersion);

      if (!rawData[section]) rawData[section] = [];
      
      const initialLength = rawData[section].length;
      rawData[section] = rawData[section].filter((i: any) => i.id !== itemId);
      
      if (rawData[section].length === initialLength) {
        throw new NotFoundException(`Item with id ${itemId} not found in ${section}`);
      }
      
      await this.saveRawBundleTx(tx, tenantId, rawData, section, currentVersion);
      return { success: true };
    });
  }

  private checkOptimisticLock(currentVersion: number, expectedVersion?: number) {
    if (expectedVersion !== undefined && expectedVersion !== currentVersion) {
      throw new ConflictException(`La versión de la base de conocimiento ha cambiado. Actual: ${currentVersion}, Esperada: ${expectedVersion}`);
    }
  }

  private async getRawBundleTx(tx: any, tenantId: string) {
    const bundle = await tx.knowledgeBundle.findUnique({
      where: { tenantId }
    });
    let currentPrompt: any = bundle?.systemPrompt || {};
    return {
      rawData: currentPrompt['_raw'] || currentPrompt,
      currentVersion: bundle?.version || 0
    };
  }

  private async saveRawBundleTx(tx: any, tenantId: string, rawData: any, section: string, currentVersion: number) {
    await tx.tenant.upsert({
      where: { id: tenantId },
      update: {},
      create: { id: tenantId, name: tenantId }
    });

    const composedArtifact = this.composer.compose(rawData);
    
    const finalSystemPrompt = {
      _raw: rawData,
      ...composedArtifact
    };

    if (currentVersion === 0) {
      await tx.knowledgeBundle.create({
        data: {
          tenantId,
          systemPrompt: finalSystemPrompt,
          version: 1
        }
      });
    } else {
      const updateResult = await tx.knowledgeBundle.updateMany({
        where: { tenantId, version: currentVersion },
        data: {
          systemPrompt: finalSystemPrompt,
          version: { increment: 1 }
        }
      });
      
      if (updateResult.count === 0) {
        throw new ConflictException('Conflict updating Knowledge Bundle. Version mismatch.');
      }
    }

    this.logger.log(`Knowledge Base section '${section}' updated for tenant ${tenantId}. Versión KOS incrementada.`);
    this.eventEmitter.emit('knowledge-base.updated', { tenantId });
  }
}
