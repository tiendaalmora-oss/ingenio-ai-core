import { PrismaService } from '../../shared/database/prisma.service';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { KnowledgeBundleComposer } from './knowledge-bundle.composer';
export declare class BusinessStudioService {
    private prisma;
    private eventEmitter;
    private composer;
    private readonly logger;
    constructor(prisma: PrismaService, eventEmitter: EventEmitter2, composer: KnowledgeBundleComposer);
    getKnowledgeBase(tenantId: string, prefetchedBundle?: any): Promise<{
        identidad: any;
        empresa: any;
        enrutamiento: any;
        reglasBot: any;
        productos: any;
        categorias: any;
        servicios: any;
        faqs: any;
        objeciones: any;
        scriptsComerciales: any;
        promociones: any;
        seguimientos: any;
        soporte: any;
        politicasAtencion: any;
    }>;
    getMenu(): {
        id: string;
        title: string;
        icon: string;
        route: string;
        enabled: boolean;
        order: number;
    }[];
    getStatus(tenantId: string, prefetchedBundle?: any): Promise<{
        tenant: string;
        knowledgeBundle: string;
        knowledgeVersion: any;
        cacheLoaded: boolean;
        hermes: string;
        waha: string;
        followUpEngine: string;
        outboundDispatcher: string;
        database: string;
        eventBus: string;
        lastHealthCheck: Date;
    }>;
    getHealth(tenantId: string, prefetchedStatus?: any): Promise<{
        name: string;
        status: any;
    }[]>;
    getStats(tenantId: string, prefetchedBundle?: any): Promise<{
        totalProducts: any;
        totalServices: any;
        totalFaqs: any;
        totalObjections: any;
        totalFollowUps: any;
        totalPolicies: any;
        totalContacts: number;
        totalConversations: number;
        totalTasks: number;
        totalBusinessMemory: number;
        knowledgeVersion: any;
    }>;
    getSchema(): {
        key: string;
        title: string;
        description: string;
        icon: string;
        editable: boolean;
        collection: boolean;
    }[];
    getDashboard(tenantId: string, prefetchedBundle?: any): Promise<{
        tenant: string;
        knowledgeVersion: any;
        lastUpdate: any;
        productCount: any;
        faqCount: any;
        objectionCount: any;
        followUpCount: any;
        serviceCount: any;
        bundleStatus: string;
        cacheStatus: string;
    }>;
    getSection(tenantId: string, section: string): Promise<any>;
    getItems(tenantId: string, section: string): Promise<any[]>;
    getBundle(tenantId: string): Promise<{
        identidad: any;
        empresa: any;
        enrutamiento: any;
        reglasBot: any;
        productos: any;
        categorias: any;
        servicios: any;
        faqs: any;
        objeciones: any;
        scriptsComerciales: any;
        promociones: any;
        seguimientos: any;
        soporte: any;
        politicasAtencion: any;
    }>;
    updateSection(tenantId: string, section: string, data: any, expectedVersion?: number): Promise<any>;
    addItem(tenantId: string, section: string, item: any, expectedVersion?: number): Promise<any>;
    updateItem(tenantId: string, section: string, itemId: string, item: any, expectedVersion?: number): Promise<any>;
    deleteItem(tenantId: string, section: string, itemId: string, expectedVersion?: number): Promise<{
        success: boolean;
    }>;
    private checkOptimisticLock;
    private getRawBundleTx;
    private saveRawBundleTx;
}
