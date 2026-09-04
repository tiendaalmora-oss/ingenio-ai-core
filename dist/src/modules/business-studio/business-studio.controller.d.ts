import { BusinessStudioService } from './business-studio.service';
import { BootstrapService } from './bootstrap.service';
export declare class BusinessStudioController {
    private readonly studioService;
    private readonly bootstrapService;
    constructor(studioService: BusinessStudioService, bootstrapService: BootstrapService);
    getBootstrap(tenantId: string): Promise<{
        menu: {
            id: string;
            title: string;
            icon: string;
            route: string;
            enabled: boolean;
            order: number;
        }[];
        dashboard: {
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
        };
        status: {
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
        };
        health: {
            name: string;
            status: any;
        }[];
        stats: {
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
        };
        knowledgeSchema: {
            key: string;
            title: string;
            description: string;
            icon: string;
            editable: boolean;
            collection: boolean;
        }[];
        knowledgeBundle: {
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
        };
        tenant: string;
        tenantName: string;
        tenantPlan: string;
        version: number;
        cacheStatus: string;
        timestamp: Date;
    }>;
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
    getBundleSection(section: string, tenantId: string): Promise<any>;
    updateSection(section: string, data: any, tenantId: string, expectedVersion?: string): Promise<any>;
    getMenu(): {
        id: string;
        title: string;
        icon: string;
        route: string;
        enabled: boolean;
        order: number;
    }[];
    getStatus(tenantId: string): Promise<{
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
    getHealth(tenantId: string): Promise<{
        name: string;
        status: any;
    }[]>;
    getStats(tenantId: string): Promise<{
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
    getDashboard(tenantId: string): Promise<{
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
    getKnowledgeBase(tenantId: string): Promise<{
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
    updateKnowledgeBaseSection(section: string, data: any, tenantId: string, expectedVersion?: string): Promise<any>;
    getKnowledgeBaseSection(section: string, tenantId: string): Promise<any>;
    getItems(section: string, tenantId: string): Promise<any[]>;
    addItem(section: string, data: any, tenantId: string, expectedVersion?: string): Promise<any>;
    updateItem(section: string, id: string, data: any, tenantId: string, expectedVersion?: string): Promise<any>;
    deleteItem(section: string, id: string, tenantId: string, expectedVersion?: string): Promise<{
        success: boolean;
    }>;
    private validateSection;
}
