export declare class Contact {
    readonly id: string;
    readonly tenantId: string;
    readonly name: string;
    readonly phone?: string | null | undefined;
    constructor(id: string, tenantId: string, name: string, phone?: string | null | undefined);
}
