export declare class Interaction {
    readonly id: string;
    readonly conversationId: string;
    readonly direction: string;
    readonly type: string;
    readonly content: string;
    readonly timestamp: Date;
    constructor(id: string, conversationId: string, direction: string, type: string, content: string, timestamp: Date);
}
