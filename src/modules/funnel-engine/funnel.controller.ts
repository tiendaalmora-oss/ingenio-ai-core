import { Controller, Get, Post, Put, Body, Headers, Param, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import { FunnelGeneratorService } from './funnel-generator.service';
import { AutomationCompilerService } from './automation-compiler.service';

@Controller('funnels')
export class FunnelController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly generator: FunnelGeneratorService,
    private readonly compiler: AutomationCompilerService
  ) {}

  @Post('generate')
  async generateFunnel(@Body('prompt') prompt: string) {
    // 1. IA genera el Automation DSL
    const dsl = await this.generator.generateFunnel(prompt);
    
    // 2. El Compiler lo traduce a React Flow JSON con posiciones
    const reactFlowGraph = this.compiler.compileToReactFlow(dsl);
    
    return reactFlowGraph;
  }

  @Get()
  async getFunnels(@Headers('x-tenant-id') tenantId: string) {
    if (!tenantId) throw new BadRequestException('x-tenant-id header is required');
    return this.prisma.funnel.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' }
    });
  }

  @Post()
  async createFunnel(@Headers('x-tenant-id') tenantId: string, @Body() body: any) {
    if (!tenantId) throw new BadRequestException('x-tenant-id header is required');
    return this.prisma.funnel.create({
      data: {
        tenantId,
        name: body.name || 'Nuevo Embudo',
        trigger: body.trigger || 'ANY',
        steps: body.steps || { nodes: [], edges: [] },
        isActive: true,
      }
    });
  }

  @Put(':id')
  async updateFunnel(
    @Headers('x-tenant-id') tenantId: string, 
    @Param('id') id: string,
    @Body() body: any
  ) {
    if (!tenantId) throw new BadRequestException('x-tenant-id header is required');
    return this.prisma.funnel.update({
      where: { id, tenantId },
      data: {
        name: body.name,
        trigger: body.trigger,
        steps: body.steps,
        isActive: body.isActive
      }
    });
  }
}
