import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { KosLoaderService } from './kos-loader.service';
import { PromptComposerService, PromptMode } from './prompt-composer.service';

@Injectable()
export class ContextBuilderService {
  private readonly logger = new Logger(ContextBuilderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kosLoader: KosLoaderService,
    private readonly promptComposer: PromptComposerService
  ) {}

  async buildContext(
    tenantId: string, 
    contactId: string, 
    conversationId: string, 
    content: string | null = null,
    funnelInstruction: string | null = null
  ): Promise<any[]> {
    // 1. Obtener KOS Bundle del tenant dinámicamente
    const kosBundle = await this.kosLoader.load(tenantId);
    
    // 2. Obtener Business Memory del contacto
    const memory = await this.prisma.businessMemory.findUnique({
      where: { contactId },
    });

    if (memory) {
      this.logger.log(`Business Memory recuperada para el contacto ${contactId}.`);
    } else {
      this.logger.log(`No se encontró Business Memory para el contacto ${contactId}. Procediendo en blanco.`);
    }

    // 3. Obtener Historial de Conversación (últimos 10 mensajes)
    const rawHistory = await this.prisma.interaction.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });
    
    // Invertir para mantener orden cronológico
    const history = rawHistory.reverse();

    // 4. Delegar la construcción del prompt al PromptComposer
    return this.promptComposer.compose({
      kosBundle,
      memory,
      history,
      currentMessage: content,
      activeGoal: funnelInstruction, // we map funnelInstruction to activeGoal for now
      conversationSummary: null, // to be implemented
      availableSkills: [], // to be implemented
    });
  }

  async buildFollowUpContext(
    tenantId: string, 
    contactId: string, 
    conversationId: string, 
    ruleApplied: any
  ): Promise<any[]> {
    const kosBundle = await this.kosLoader.load(tenantId);
    
    const memory = await this.prisma.businessMemory.findUnique({
      where: { contactId },
    });

    const rawHistory = await this.prisma.interaction.findMany({
      where: { conversationId },
      orderBy: { timestamp: 'desc' },
      take: 10,
    });
    
    const history = rawHistory.reverse();

    return this.promptComposer.compose({
      kosBundle,
      memory,
      history,
      mode: PromptMode.FOLLOW_UP,
      followUpRule: ruleApplied
    });
  }
}
