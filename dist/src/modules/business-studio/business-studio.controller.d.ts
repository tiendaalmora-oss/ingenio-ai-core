import { BusinessStudioService } from './business-studio.service';
export declare class BusinessStudioController {
    private readonly studioService;
    constructor(studioService: BusinessStudioService);
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
    updateSection(section: string, data: any, tenantId: string): Promise<import("@prisma/client/runtime/client").JsonValue>;
}
