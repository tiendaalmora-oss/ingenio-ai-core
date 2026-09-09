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
   * GET /agency/overview
   * Retorna agencias y todas las subcuentas principales/no asignadas
   */
  @Get('overview')
  getOverview() {
    return this.agencyService.getOverview();
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
   * DELETE /agency/:id
   * Eliminar una agencia
   */
  @Delete(':id')
  deleteAgency(@Param('id') id: string) {
    return this.agencyService.deleteAgency(id);
  }

  /**
   * POST /agency/:id/link-subaccount
   * Vincular un tenant existente a una agencia
   */
  @Post(':id/link-subaccount')
  linkSubaccount(
    @Param('id') agencyId: string,
    @Body() body: { tenantId: string; name?: string },
  ) {
    return this.agencyService.linkSubaccount(agencyId, body.tenantId, body.name);
  }

  /**
   * DELETE /agency/subaccounts/:tenantId/purge
   * Eliminar definitivamente una subcuenta vacía de prueba
   */
  @Delete('subaccounts/:tenantId/purge')
  purgeSubaccount(@Param('tenantId') tenantId: string) {
    return this.agencyService.purgeSubaccount(tenantId);
  }

  // ── GESTIÓN WAHA POR SUBCUENTA ────────────────────────────

  /**
   * GET /agency/subaccounts/:id/waha/status
   * Obtener estado de la sesión de WhatsApp de una subcuenta
   */
  @Get('subaccounts/:id/waha/status')
  getWahaStatus(@Param('id') tenantId: string) {
    return this.agencyService.getSubaccountWahaStatus(tenantId);
  }

  /**
   * POST /agency/subaccounts/:id/waha/start
   * Iniciar sesión en WAHA y configurar webhooks
   */
  @Post('subaccounts/:id/waha/start')
  startWaha(@Param('id') tenantId: string) {
    return this.agencyService.startSubaccountWaha(tenantId);
  }

  /**
   * GET /agency/subaccounts/:id/waha/qr
   * Obtener el código QR en base64 para escanear
   */
  @Get('subaccounts/:id/waha/qr')
  getWahaQr(@Param('id') tenantId: string) {
    return this.agencyService.getSubaccountWahaQr(tenantId);
  }

  /**
   * POST /agency/subaccounts/:id/waha/logout
   * Cerrar sesión de WhatsApp (bloqueado para producción)
   */
  @Post('subaccounts/:id/waha/logout')
  logoutWaha(@Param('id') tenantId: string) {
    return this.agencyService.logoutSubaccountWaha(tenantId);
  }

  // ── GESTIÓN DE ACCESOS Y USUARIOS DE CLIENTE ───────────────

  /**
   * GET /agency/subaccounts/:id/access
   * Obtener enlace mágico y lista de usuarios de una subcuenta
   */
  @Get('subaccounts/:id/access')
  getAccess(@Param('id') tenantId: string) {
    return this.agencyService.getSubaccountAccess(tenantId);
  }

  /**
   * POST /agency/subaccounts/:id/users
   * Crear un nuevo usuario (email y contraseña) para una subcuenta
   */
  @Post('subaccounts/:id/users')
  createUser(
    @Param('id') tenantId: string,
    @Body() body: { email: string; password: string; name?: string },
  ) {
    return this.agencyService.createSubaccountUser(tenantId, body);
  }

  /**
   * DELETE /agency/subaccounts/:id/users/:userId
   * Eliminar un usuario de una subcuenta
   */
  @Delete('subaccounts/:id/users/:userId')
  deleteUser(
    @Param('id') tenantId: string,
    @Param('userId') userId: string,
  ) {
    return this.agencyService.deleteSubaccountUser(tenantId, userId);
  }

  /**
   * POST /agency/subaccounts/:id/regenerate-key
   * Regenerar la clave de enlace mágico de una subcuenta
   */
  @Post('subaccounts/:id/regenerate-key')
  regenerateAccessKey(@Param('id') tenantId: string) {
    return this.agencyService.regenerateSubaccountAccessKey(tenantId);
  }
}
