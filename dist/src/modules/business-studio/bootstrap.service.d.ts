import { PrismaService } from '../../shared/database/prisma.service';
import { BusinessStudioService } from './business-studio.service';
export declare class BootstrapService {
    private readonly prisma;
    private readonly studioService;
    constructor(prisma: PrismaService, studioService: BusinessStudioService);
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
}
