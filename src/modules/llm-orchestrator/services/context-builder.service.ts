import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';

@Injectable()
export class ContextBuilderService {
  private readonly logger = new Logger(ContextBuilderService.name);

  constructor(private readonly prisma: PrismaService) {}

  async buildContext(tenantId: string, contactId: string, content: string): Promise<string> {
    // 1. Obtener KOS del tenant (Simulado por ahora)
    const mockKOS = `[SYSTEM KOS]: Sos Hermes. Actuás como el Chief of Staff. Analizas el contexto y respondes ejecutivamente.`;
    
    // 2. Obtener Business Memory del contacto
    const memory = await this.prisma.businessMemory.findUnique({
      where: { contactId },
    });

    let memoryContext = '[BUSINESS MEMORY]: Ninguna memoria previa detectada.';
    if (memory) {
      memoryContext = `[BUSINESS MEMORY]:
- Nombre: ${memory.name || 'Desconocido'}
- Empresa: ${memory.company || 'Desconocida'}
- Intereses: ${memory.interests.join(', ') || 'Ninguno'}
- Última interacción: ${memory.lastInteraction ? memory.lastInteraction.toISOString() : 'Desconocida'}
- Estado del Lead: ${memory.leadStatus || 'Desconocido'}
- Objeciones: ${memory.objections.join(', ') || 'Ninguna'}
- Tags: ${memory.tags.join(', ') || 'Ninguno'}`;
      this.logger.log(`Business Memory recuperada para el contacto ${contactId}.`);
    } else {
      this.logger.log(`No se encontró Business Memory para el contacto ${contactId}. Procediendo en blanco.`);
    }

    // 3. Construir Master Prompt
    const masterPrompt = `${mockKOS}\n\n${memoryContext}\n\n[USER INBOX]: "${content}"\n\nGenera una respuesta ejecutiva alineada a los objetivos.`;
    
    return masterPrompt;
  }
}
