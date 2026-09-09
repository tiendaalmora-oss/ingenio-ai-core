import { PrismaService } from '../../shared/database/prisma.service';
export declare class AgencyService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    createAgency(data: {
        name: string;
        ownerEmail: string;
        plan?: string;
    }): Promise<{
        id: string;
        name: string;
        plan: string;
        createdAt: Date;
        updatedAt: Date;
        ownerEmail: string;
        customDomain: string | null;
        logoUrl: string | null;
        primaryColor: string | null;
    }>;
    findAllAgencies(): Promise<({
        _count: {
            subaccounts: number;
        };
    } & {
        id: string;
        name: string;
        plan: string;
        createdAt: Date;
        updatedAt: Date;
        ownerEmail: string;
        customDomain: string | null;
        logoUrl: string | null;
        primaryColor: string | null;
    })[]>;
    findAgencyById(id: string): Promise<{
        _count: {
            subaccounts: number;
        };
        subaccounts: {
            id: string;
            name: string;
            status: string;
            plan: string;
            wahaSession: string | null;
            createdAt: Date;
        }[];
        users: {
            id: string;
            createdAt: Date;
            agencyId: string;
            role: string;
            email: string;
        }[];
    } & {
        id: string;
        name: string;
        plan: string;
        createdAt: Date;
        updatedAt: Date;
        ownerEmail: string;
        customDomain: string | null;
        logoUrl: string | null;
        primaryColor: string | null;
    }>;
    deleteAgency(id: string): Promise<{
        id: string;
        name: string;
        plan: string;
        createdAt: Date;
        updatedAt: Date;
        ownerEmail: string;
        customDomain: string | null;
        logoUrl: string | null;
        primaryColor: string | null;
    }>;
    linkSubaccount(agencyId: string, tenantId: string, name?: string): Promise<{
        id: string;
        name: string;
        status: string;
        plan: string;
        wahaSession: string | null;
        currentBundleVersion: string | null;
        createdAt: Date;
        updatedAt: Date;
        agencyId: string | null;
    }>;
    purgeSubaccount(tenantId: string): Promise<{
        id: string;
        name: string;
        status: string;
        plan: string;
        wahaSession: string | null;
        currentBundleVersion: string | null;
        createdAt: Date;
        updatedAt: Date;
        agencyId: string | null;
    }>;
    createSubaccount(agencyId: string, data: {
        name: string;
        plan?: string;
    }): Promise<{
        id: string;
        name: string;
        status: string;
        plan: string;
        wahaSession: string | null;
        currentBundleVersion: string | null;
        createdAt: Date;
        updatedAt: Date;
        agencyId: string | null;
    }>;
    findSubaccountsByAgency(agencyId: string): Promise<({
        knowledgeBundle: {
            updatedAt: Date;
            version: number;
        } | null;
        _count: {
            contacts: number;
        };
    } & {
        id: string;
        name: string;
        status: string;
        plan: string;
        wahaSession: string | null;
        currentBundleVersion: string | null;
        createdAt: Date;
        updatedAt: Date;
        agencyId: string | null;
    })[]>;
    updateSubaccountStatus(tenantId: string, status: 'active' | 'paused' | 'suspended'): Promise<{
        id: string;
        name: string;
        status: string;
        plan: string;
        wahaSession: string | null;
        currentBundleVersion: string | null;
        createdAt: Date;
        updatedAt: Date;
        agencyId: string | null;
    }>;
    deleteSubaccount(tenantId: string): Promise<{
        id: string;
        name: string;
        status: string;
        plan: string;
        wahaSession: string | null;
        currentBundleVersion: string | null;
        createdAt: Date;
        updatedAt: Date;
        agencyId: string | null;
    }>;
    getAgencyStats(agencyId: string): Promise<{
        totalSubaccounts: number;
        activeSubaccounts: number;
        totalContacts: number;
    }>;
    getOverview(): Promise<{
        agencies: ({
            _count: {
                subaccounts: number;
            };
            subaccounts: {
                id: string;
                name: string;
                status: string;
                plan: string;
                wahaSession: string | null;
                createdAt: Date;
            }[];
        } & {
            id: string;
            name: string;
            plan: string;
            createdAt: Date;
            updatedAt: Date;
            ownerEmail: string;
            customDomain: string | null;
            logoUrl: string | null;
            primaryColor: string | null;
        })[];
        unassignedTenants: {
            id: string;
            name: string;
            status: string;
            plan: string;
            wahaSession: string | null;
            createdAt: Date;
        }[];
    }>;
    private getWahaConfig;
    private isProtectedSession;
    ensureTenantWahaSession(tenantId: string): Promise<string>;
    getSubaccountWahaStatus(tenantId: string): Promise<{
        session: string;
        status: any;
        phone: any;
        pushName: any;
        isProtected: boolean;
        error?: undefined;
    } | {
        session: string;
        status: string;
        isProtected: boolean;
        error: any;
        phone?: undefined;
        pushName?: undefined;
    }>;
    startSubaccountWaha(tenantId: string): Promise<{
        session: string;
        status: any;
        phone: any;
        pushName: any;
        isProtected: boolean;
        error?: undefined;
    } | {
        session: string;
        status: string;
        isProtected: boolean;
        error: any;
        phone?: undefined;
        pushName?: undefined;
    }>;
    getSubaccountWahaQr(tenantId: string): Promise<{
        session: string;
        status: any;
        qr: null;
        isProtected: boolean;
        message: string;
        error?: undefined;
    } | {
        session: string;
        status: string;
        qr: string;
        isProtected: boolean;
        message?: undefined;
        error?: undefined;
    } | {
        session: string;
        status: string;
        qr: null;
        isProtected: boolean;
        error: any;
        message?: undefined;
    }>;
    logoutSubaccountWaha(tenantId: string): Promise<{
        success: boolean;
        message: string;
        session?: undefined;
        status?: undefined;
    } | {
        success: boolean;
        session: string;
        status: string;
        message?: undefined;
    }>;
}
