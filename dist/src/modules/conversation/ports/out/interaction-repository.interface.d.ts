import { Interaction } from '../../entities/interaction.entity';
export declare const INTERACTION_REPOSITORY: unique symbol;
export interface IInteractionRepository {
    save(interaction: Interaction): Promise<void>;
}
