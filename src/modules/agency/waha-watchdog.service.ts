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
   * Ejecuta cada 60 segundos la supervisión proactiva de sesiones WAHA:
   * 1. Reconstruye automáticamente la sesión de producción 'ferreos' si el contenedor reinició (404/NOT_CONFIGURED).
   * 2. Limpia procesos Chromium abandonados en Sandbox para proteger la memoria RAM del VPS.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async handleCron() {
    await this.checkAndHealWahaSessions();
  }

  async checkAndHealWahaSessions() {
    if (this.isChecking) return;
    this.isChecking = true;

    try {
      await this.ensureProdSessionAlive();
      await this.pruneIdleSandboxSessions();
    } catch (err: any) {
      this.logger.error(`[Watchdog] Error en ciclo de supervisión: ${err.message}`);
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * 1. Supervisa la sesión de producción principal ('ferreos' / Kits Docentes)
   */
  private async ensureProdSessionAlive() {
    try {
      const prodStatus = await this.agencyService.getSubaccountWahaStatus(PROD_MAIN_TENANT_ID);
      
      // Si la sesión desapareció de WAHA (404 / NOT_CONFIGURED) o quedó en STOPPED/FAILED:
      if (
        prodStatus.status === 'NOT_CONFIGURED' ||
        prodStatus.status === 'FAILED' ||
        prodStatus.status === 'ERROR' ||
        prodStatus.status === 'STOPPED'
      ) {
        this.logger.warn(
          `[Watchdog Alert] Sesión de producción 'ferreos' en estado '${prodStatus.status}'. Auto-reconstruyendo sesión limpia...`
        );
        const started = await this.agencyService.startSubaccountWaha(PROD_MAIN_TENANT_ID);
        this.logger.log(`[Watchdog] Sesión de producción 'ferreos' auto-iniciada con éxito: status=${started.status}`);
      }
    } catch (err: any) {
      this.logger.error(`[Watchdog] Error vigilando sesión de producción: ${err.message}`);
    }
  }

  /**
   * 2. Libera procesos Chromium en Sandbox que lleven más de 45 minutos en SCAN_QR_CODE sin vincularse
   */
  private async pruneIdleSandboxSessions() {
    try {
      const rawUrl = process.env.WAHA_SANDBOX_URL || process.env.WAHA_API_URL || 'https://waha-sandbox.ingeniodigital.shop';
      const apiUrl = rawUrl.replace(/\/+$/, '');
      const apiKey = process.env.WAHA_SANDBOX_API_KEY || process.env.WAHA_API_KEY || 'secreto123';

      const res = await fetch(`${apiUrl}/api/sessions`, {
        headers: { 'X-Api-Key': apiKey, Accept: 'application/json' },
        signal: AbortSignal.timeout(4000),
      }).catch(() => null);

      if (!res || !res.ok) return;

      const sessions: any[] = await res.json().catch(() => []);
      const now = Date.now();
      const MAX_IDLE_MS = 45 * 60 * 1000; // 45 minutos

      for (const s of sessions) {
        // Solo aplica a sesiones de subcuentas en Sandbox que estén esperando QR y no estén conectadas
        if (s.name && s.name.startsWith('sub_') && (s.status === 'SCAN_QR_CODE' || s.status === 'STARTING')) {
          const activityTime = s.timestamps?.activity ? Number(s.timestamps.activity) : 0;
          const idleTime = activityTime > 0 ? (now - activityTime) : Infinity;

          if (idleTime > MAX_IDLE_MS) {
            this.logger.warn(
              `[Watchdog Memory Guard] Subcuenta Sandbox '${s.name}' inactiva esperando QR por más de 45 min (${Math.round(idleTime / 60000)} min). Deteniendo Chromium para liberar RAM del VPS.`
            );
            await fetch(`${apiUrl}/api/sessions/${s.name}/stop`, {
              method: 'POST',
              headers: { 'X-Api-Key': apiKey },
            }).catch(() => null);
          }
        }
      }
    } catch (err: any) {
      this.logger.debug(`[Watchdog Sandbox Prune] ${err.message}`);
    }
  }
}
