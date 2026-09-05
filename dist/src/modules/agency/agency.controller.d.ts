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
        _count: {
            subaccounts: number;
        };
        subaccounts: {
            id: string;
            name: string;
            status: string;
            plan: string;
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
}
export {};
