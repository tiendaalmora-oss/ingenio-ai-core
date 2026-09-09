import { AgencyService } from './agency.service';
declare class CreateAgencyDto {
    name: string;
    ownerEmail: string;
    plan?: string;
}
declare class CreateSubaccountDto {
    name: string;
    plan?: string;
}
declare class UpdateSubaccountStatusDto {
    status: 'active' | 'paused' | 'suspended';
}
export declare class AgencyController {
    private readonly agencyService;
    constructor(agencyService: AgencyService);
    createAgency(body: CreateAgencyDto): Promise<{
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
    findAgency(id: string): Promise<{
        users: {
            id: string;
            createdAt: Date;
            agencyId: string;
            email: string;
            role: string;
        }[];
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
    }>;
    getStats(id: string): Promise<{
        totalSubaccounts: number;
        activeSubaccounts: number;
        totalContacts: number;
    }>;
    createSubaccount(agencyId: string, body: CreateSubaccountDto): Promise<{
        id: string;
        name: string;
        status: string;
        plan: string;
        wahaSession: string | null;
        accessKey: string | null;
        currentBundleVersion: string | null;
        createdAt: Date;
        updatedAt: Date;
        agencyId: string | null;
    }>;
    findSubaccounts(agencyId: string): Promise<({
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
        accessKey: string | null;
        currentBundleVersion: string | null;
        createdAt: Date;
        updatedAt: Date;
        agencyId: string | null;
    })[]>;
    updateStatus(tenantId: string, body: UpdateSubaccountStatusDto): Promise<{
        id: string;
        name: string;
        status: string;
        plan: string;
        wahaSession: string | null;
        accessKey: string | null;
        currentBundleVersion: string | null;
        createdAt: Date;
        updatedAt: Date;
        agencyId: string | null;
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
    linkSubaccount(agencyId: string, body: {
        tenantId: string;
        name?: string;
    }): Promise<{
        id: string;
        name: string;
        status: string;
        plan: string;
        wahaSession: string | null;
        accessKey: string | null;
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
        accessKey: string | null;
        currentBundleVersion: string | null;
        createdAt: Date;
        updatedAt: Date;
        agencyId: string | null;
    }>;
    getWahaStatus(tenantId: string): Promise<{
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
    startWaha(tenantId: string): Promise<{
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
    getWahaQr(tenantId: string): Promise<{
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
    logoutWaha(tenantId: string): Promise<{
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
    getAccess(tenantId: string): Promise<{
        accessKey: string;
        magicUrl: string;
        tenantId: string;
        tenantName: string;
        users: {
            id: string;
            name: string | null;
            createdAt: Date;
            email: string;
            role: string;
        }[];
    }>;
    createUser(tenantId: string, body: {
        email: string;
        password: string;
        name?: string;
    }): Promise<{
        id: string;
        name: string | null;
        createdAt: Date;
        email: string;
        role: string;
    }>;
    deleteUser(tenantId: string, userId: string): Promise<import("@prisma/client").Prisma.BatchPayload>;
    regenerateAccessKey(tenantId: string): Promise<{
        accessKey: string;
        magicUrl: string;
        tenantId: string;
        tenantName: string;
        users: {
            id: string;
            name: string | null;
            createdAt: Date;
            email: string;
            role: string;
        }[];
    }>;
}
export {};
