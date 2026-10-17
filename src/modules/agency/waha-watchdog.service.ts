import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { AgencyService } from './agency.service';
import { PrismaService } from '../../shared/database/prisma.service';

const PROD_MAIN_TENANT_ID = 'dba1c54c-89c6-41e9-ae9d-03613377a5b3';

@Injectable()
export class WahaWatchdogService implements OnApplicationBootstrap {
  private readonly logger = new Logger(WahaWatchdogService.name);
  private isChecking = false;

  constructor(
    private readonly agencyService: AgencyService,
    private readonly prisma: PrismaService,
  ) {}

  async onApplicationBootstrap() {
    this.logger.log('Inicializando WAHA Watchdog...');
    // Ejecutar verificación inicial 5 segundos después de boot para permitir que la red esté lista
    setTimeout(() => {
      this.checkAndHealWahaSessions();
    }, 5000);
  }

  /**
   * Ejecuta cada 2 minutos la supervisión inteligente de sesiones WAHA Multi-Tenant:
   * 1. Auto-recupera sesiones de cualquier subcuenta activa que hayan caído en estado FAILED o ERROR por micro-cortes.
   * 2. Respeta estrictamente el estado STOPPED cuando el operador detuvo una sesión manualmente.
   * 3. Detiene sesiones abandonadas en SCAN_QR_CODE por más de 30 minutos para liberar RAM del VPS.
   */
  @Cron('*/2 * * * *')
  async handleCron() {
    await this.checkAndHealWahaSessions();
  }

  async checkAndHealWahaSessions() {
    if (this.isChecking) return;
    this.isChecking = true;

    try {
      await this.healCrashedTenantSessions();
      await this.pruneIdleQrSessions();
    } catch (err: any) {
      this.logger.error(`[Watchdog] Error en ciclo de supervisión: ${err.message}`);
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * 1. Supervisa todas las subcuentas activas y auto-reinicia únicamente sesiones que sufrieron una caída (FAILED / ERROR).
   * Jamás reinicia sesiones en estado STOPPED (detenidas manualmente por el usuario o por inactividad de QR).
   */
  private async healCrashedTenantSessions() {
    try {
      const activeTenants = await this.prisma.tenant.findMany({
        where: {
          status: 'active',
          wahaSession: { not: null },
        },
        select: { id: true, name: true, wahaSession: true },
      });

      for (const tenant of activeTenants) {
        if (!tenant.wahaSession) continue;
        try {
          const wahaStatus = await this.agencyService.getSubaccountWahaStatus(tenant.id);
          if (wahaStatus.status === 'FAILED' || wahaStatus.status === 'ERROR') {
            this.logger.warn(
              `[Watchdog Auto-Heal] Sesión '${tenant.wahaSession}' (${tenant.name}) detectada en estado '${wahaStatus.status}'. Intentando reconexión automática...`,
            );
            const restarted = await this.agencyService.startSubaccountWaha(tenant.id);
            this.logger.log(
              `[Watchdog Auto-Heal] Sesión '${tenant.wahaSession}' reconectada: nuevo estado=${restarted.status}`,
            );
          }
        } catch (innerErr: any) {
          this.logger.debug(`[Watchdog] No se pudo verificar sesión de ${tenant.name}: ${innerErr.message}`);
        }
      }
    } catch (err: any) {
      this.logger.error(`[Watchdog] Error supervisando sesiones activas: ${err.message}`);
    }
  }

  /**
   * 2. Libera recursos en WAHA deteniendo sesiones que lleven más de 30 minutos esperando lectura de QR (SCAN_QR_CODE)
   */
  private async pruneIdleQrSessions() {
    try {
      const rawUrl = process.env.WAHA_SANDBOX_URL || process.env.WAHA_API_URL || 'https://waha.ingeniodigital.shop';
      const apiUrl = rawUrl.replace(/\/+$/, '');
      const apiKey = process.env.WAHA_SANDBOX_API_KEY || process.env.WAHA_API_KEY || 'secreto123';

      const res = await fetch(`${apiUrl}/api/sessions`, {
        headers: { 'X-Api-Key': apiKey, Accept: 'application/json' },
        signal: AbortSignal.timeout(4000),
      }).catch(() => null);

      if (!res || !res.ok) return;

      const sessions: any[] = await res.json().catch(() => []);
      const now = Date.now();
      const MAX_QR_IDLE_MS = 30 * 60 * 1000; // 30 minutos esperando QR

      for (const s of sessions) {
        if (s.name && s.status === 'SCAN_QR_CODE') {
          const activityTime = s.timestamps?.activity ? Number(s.timestamps.activity) : 0;
          const idleTime = activityTime > 0 ? now - activityTime : MAX_QR_IDLE_MS + 1;

          if (idleTime > MAX_QR_IDLE_MS) {
            this.logger.warn(
              `[Watchdog Memory Guard] Sesión '${s.name}' lleva más de 30 min en SCAN_QR_CODE sin vincularse. Pasando a STOPPED para proteger RAM del VPS.`,
            );
            await fetch(`${apiUrl}/api/sessions/${s.name}/stop`, {
              method: 'POST',
              headers: { 'X-Api-Key': apiKey },
            }).catch(() => null);
          }
        }
      }
    } catch (err: any) {
      this.logger.debug(`[Watchdog QR Prune] ${err.message}`);
    }
  }
}
