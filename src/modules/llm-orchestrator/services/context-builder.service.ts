import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../shared/database/prisma.service';
import { KosLoaderService } from './kos-loader.service';

@Injectable()
export class ContextBuilderService {
  private readonly logger = new Logger(ContextBuilderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly kosLoader: KosLoaderService
  ) {}

  async buildContext(tenantId: string, contactId: string, content: string): Promise<any[]> {
    // 1. Obtener KOS Bundle del tenant dinámicamente
    const kosBundle = await this.kosLoader.load(tenantId);
    
    // Convertir el JSON bundle en un system prompt estructurado
    let systemInstructions = `[SYSTEM KOS]\n`;
    for (const [key, value] of Object.entries(kosBundle)) {
      if (typeof value === 'object') {
        systemInstructions += `- ${key.toUpperCase()}: ${JSON.stringify(value)}\n`;
      } else {
        systemInstructions += `- ${key.toUpperCase()}: ${value}\n`;
      }
    }
    
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

    // 3. Construir Arreglo de Mensajes (OpenAI Compatible)
    const messages = [
      {
        role: "system",
        content: `${systemInstructions}\n\n${memoryContext}\n\nActúa de acuerdo a las instrucciones del KOS. No inventes información que no esté en tu configuración.`
      },
      {
        role: "user",
        content: content
      }
    ];
    
    return messages;
  }
}
