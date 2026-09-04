export declare class Contact {
    readonly id: string;
    readonly tenantId: string;
    readonly name: string;
    readonly phone?: string | null | undefined;
    readonly phoneNormalized?: string | null | undefined;
    readonly externalId?: string | null | undefined;
    constructor(id: string, tenantId: string, name: string, phone?: string | null | undefined, phoneNormalized?: string | null | undefined, externalId?: string | null | undefined);
}
