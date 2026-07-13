import { PrismaService } from '../../shared/database/prisma.service';
export declare class BusinessStudioService {
    private prisma;
    constructor(prisma: PrismaService);
    getBundle(tenantId: string): Promise<string | number | true | import("@prisma/client/runtime/client").JsonObject | import("@prisma/client/runtime/client").JsonArray | {
        empresa: {};
        productos: never[];
        servicios: never[];
        faqs: never[];
        objeciones: never[];
        promociones: never[];
        personalidad: {};
        documentos: never[];
        canales: never[];
        skills: never[];
    }>;
    updateSection(tenantId: string, section: string, data: any): Promise<import("@prisma/client/runtime/client").JsonValue>;
}
