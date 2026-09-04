import { BaseEvent } from '../../base-event';
import { EventMetadata } from '../../interfaces/event.interface';
export type GoalType = 'QUALIFY_LEAD' | 'CLOSE_SALE' | 'SCHEDULE_CALL' | 'COLLECT_PAYMENT' | 'PROVIDE_SUPPORT' | 'REACTIVATE_CONTACT' | 'COMPLETE_FUNNEL_STEP';
export interface GoalAchievedPayload {
    readonly goalId: string;
    readonly conversationId: string;
    readonly contactId: string;
    readonly goalType: GoalType;
    readonly durationSeconds: number;
    readonly achievedAt: string;
}
export declare class GoalAchievedEvent extends BaseEvent<GoalAchievedPayload> {
    constructor(correlationId: string, tenantId: string, payload: GoalAchievedPayload, metadataOverrides?: Partial<EventMetadata>);
}
