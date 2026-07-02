export declare class Conversation {
    readonly id: string;
    readonly contactId: string;
    status: string;
    constructor(id: string, contactId: string, status: string);
    updateStatus(newStatus: string): void;
}
