import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AgencyService } from './agency.service';
import { AdminApiKeyGuard } from '../../shared/guards/admin-api-key.guard';

// ── DTOs inline (simples, sin validación extra) ──────────────

class CreateAgencyDto {
  name: string;
  ownerEmail: string;
  plan?: string;
}

class CreateSubaccountDto {
  name: string;
  plan?: string;
}

class UpdateSubaccountStatusDto {
  status: 'active' | 'paused' | 'suspended';
}

// ── Controller ────────────────────────────────────────────────

@Controller('agency')
@UseGuards(AdminApiKeyGuard)
export class AgencyController {
  constructor(private readonly agencyService: AgencyService) {}

  // ── AGENCIAS ──────────────────────────────────────────────

  /**
   * POST /agency
   * Crear una nueva agencia (revendedor)
   */
  @Post()
  createAgency(@Body() body: CreateAgencyDto) {
    return this.agencyService.createAgency(body);
  }

  /**
   * GET /agency
   * Listar todas las agencias
   */
  @Get()
  findAllAgencies() {
    return this.agencyService.findAllAgencies();
  }

  /**
   * GET /agency/:id
   * Ver una agencia con todas sus subcuentas
   */
  @Get(':id')
  findAgency(@Param('id') id: string) {
    return this.agencyService.findAgencyById(id);
  }

  /**
   * GET /agency/:id/stats
   * Stats de la agencia (total subcuentas, contactos, etc.)
   */
  @Get(':id/stats')
  getStats(@Param('id') id: string) {
    return this.agencyService.getAgencyStats(id);
  }

  // ── SUBCUENTAS ────────────────────────────────────────────

  /**
   * POST /agency/:id/subaccounts
   * Crear nueva subcuenta para una agencia
   */
  @Post(':id/subaccounts')
  createSubaccount(
    @Param('id') agencyId: string,
    @Body() body: CreateSubaccountDto,
  ) {
    return this.agencyService.createSubaccount(agencyId, body);
  }

  /**
   * GET /agency/:id/subaccounts
   * Listar todas las subcuentas de una agencia
   */
  @Get(':id/subaccounts')
  findSubaccounts(@Param('id') agencyId: string) {
    return this.agencyService.findSubaccountsByAgency(agencyId);
  }

  /**
   * PATCH /agency/subaccounts/:tenantId/status
   * Activar, pausar o suspender una subcuenta
   */
  @Patch('subaccounts/:tenantId/status')
  updateStatus(
    @Param('tenantId') tenantId: string,
    @Body() body: UpdateSubaccountStatusDto,
  ) {
    return this.agencyService.updateSubaccountStatus(tenantId, body.status);
  }

  /**
   * DELETE /agency/subaccounts/:tenantId
   * Suspender (soft delete) una subcuenta
   */
  @Delete('subaccounts/:tenantId')
  deleteSubaccount(@Param('tenantId') tenantId: string) {
    return this.agencyService.deleteSubaccount(tenantId);
  }
}
