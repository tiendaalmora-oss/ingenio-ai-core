import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';

@Injectable()
export class BusinessStudioService {
  constructor(private prisma: PrismaService) {}

  async getBundle(tenantId: string) {
    const bundle = await this.prisma.knowledgeBundle.findUnique({
      where: { tenantId }
    });
    if (!bundle) {
      // Return empty structure
      return {
        empresa: {}, productos: [], servicios: [], faqs: [],
        objeciones: [], promociones: [], personalidad: {}, documentos: [],
        canales: [], skills: []
      };
    }
    return bundle.systemPrompt || {};
  }

  async updateSection(tenantId: string, section: string, data: any) {
    const bundle = await this.prisma.knowledgeBundle.findUnique({
      where: { tenantId }
    });

    let currentPrompt: any = bundle?.systemPrompt || {};
    
    // Update the specific section
    currentPrompt[section] = data;

    const updated = await this.prisma.knowledgeBundle.upsert({
      where: { tenantId },
      update: {
        systemPrompt: currentPrompt,
        version: { increment: 1 }
      },
      create: {
        tenantId,
        systemPrompt: currentPrompt,
        version: 1
      }
    });

    return updated.systemPrompt;
  }
}
