import { Injectable } from '@nestjs/common';
import { IInteractionRepository } from '../ports/out/interaction-repository.interface';
import { Interaction } from '../entities/interaction.entity';
import { PrismaService } from '../../../shared/database/prisma.service';

@Injectable()
export class PrismaInteractionRepository implements IInteractionRepository {
  constructor(private readonly prisma: PrismaService) {}

  async save(interaction: Interaction): Promise<void> {
    await this.prisma.interaction.create({
      data: {
        id: interaction.id,
        conversationId: interaction.conversationId,
        direction: interaction.direction,
        type: interaction.type,
        content: interaction.content,
        timestamp: interaction.timestamp,
      },
    });
  }
}
