import { Interaction } from '../../entities/interaction.entity';

export const INTERACTION_REPOSITORY = Symbol('INTERACTION_REPOSITORY');

export interface IInteractionRepository {
  save(interaction: Interaction): Promise<void>;
}
