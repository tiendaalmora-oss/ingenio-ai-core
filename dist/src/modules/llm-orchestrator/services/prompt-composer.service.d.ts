import { BusinessMemory, Interaction } from '@prisma/client';
export declare enum PromptMode {
    NORMAL = "NORMAL",
    FOLLOW_UP = "FOLLOW_UP"
}
export interface PromptComposerInput {
    kosBundle: any;
    memory: BusinessMemory | null;
    history: Interaction[];
    conversationSummary?: string | null;
    activeGoal?: string | null;
    availableSkills?: string[];
    currentMessage?: string | null;
    mode?: PromptMode;
    followUpRule?: any;
}
export declare class PromptComposerService {
    compose(input: PromptComposerInput): any[];
    private buildSystemKOS;
    private buildMemoryContext;
    private buildToolInstructions;
    private buildHistory;
}
