import { IInteractionRepository } from '../ports/out/interaction-repository.interface';
import { Interaction } from '../entities/interaction.entity';
import { PrismaService } from '../../../shared/database/prisma.service';
export declare class PrismaInteractionRepository implements IInteractionRepository {
    private readonly prisma;
    constructor(prisma: PrismaService);
    save(interaction: Interaction): Promise<void>;
}
