import { PrismaService } from '../../shared/database/prisma.service';
import { FunnelGeneratorService } from './funnel-generator.service';
import { AutomationCompilerService } from './automation-compiler.service';
export declare class FunnelController {
    private readonly prisma;
    private readonly generator;
    private readonly compiler;
    constructor(prisma: PrismaService, generator: FunnelGeneratorService, compiler: AutomationCompilerService);
    generateFunnel(prompt: string): Promise<any>;
    getFunnels(tenantId: string): Promise<{
        id: string;
        name: string;
        updatedAt: Date;
        tenantId: string;
        createdAt: Date;
        trigger: string;
        steps: import("@prisma/client/runtime/client").JsonValue;
        isActive: boolean;
    }[]>;
    createFunnel(tenantId: string, body: any): Promise<{
        id: string;
        name: string;
        updatedAt: Date;
        tenantId: string;
        createdAt: Date;
        trigger: string;
        steps: import("@prisma/client/runtime/client").JsonValue;
        isActive: boolean;
    }>;
    updateFunnel(tenantId: string, id: string, body: any): Promise<{
        id: string;
        name: string;
        updatedAt: Date;
        tenantId: string;
        createdAt: Date;
        trigger: string;
        steps: import("@prisma/client/runtime/client").JsonValue;
        isActive: boolean;
    }>;
}
