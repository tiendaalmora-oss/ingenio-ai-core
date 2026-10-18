"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var WahaWatchdogService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.WahaWatchdogService = void 0;
const common_1 = require("@nestjs/common");
const schedule_1 = require("@nestjs/schedule");
const agency_service_1 = require("./agency.service");
const prisma_service_1 = require("../../shared/database/prisma.service");
const PROD_MAIN_TENANT_ID = 'dba1c54c-89c6-41e9-ae9d-03613377a5b3';
let WahaWatchdogService = WahaWatchdogService_1 = class WahaWatchdogService {
    agencyService;
    prisma;
    logger = new common_1.Logger(WahaWatchdogService_1.name);
    isChecking = false;
    constructor(agencyService, prisma) {
        this.agencyService = agencyService;
        this.prisma = prisma;
    }
    async onApplicationBootstrap() {
        this.logger.log('Inicializando WAHA Watchdog...');
        setTimeout(() => {
            this.checkAndHealWahaSessions();
        }, 5000);
    }
    async handleCron() {
        await this.checkAndHealWahaSessions();
    }
    async checkAndHealWahaSessions() {
        if (this.isChecking)
            return;
        this.isChecking = true;
        try {
            await this.healCrashedTenantSessions();
            await this.pruneIdleQrSessions();
        }
        catch (err) {
            this.logger.error(`[Watchdog] Error en ciclo de supervisión: ${err.message}`);
        }
        finally {
            this.isChecking = false;
        }
    }
    async healCrashedTenantSessions() {
        try {
            const activeTenants = await this.prisma.tenant.findMany({
                where: {
                    status: 'active',
                    wahaSession: { not: null },
                },
                select: { id: true, name: true, wahaSession: true },
            });
            for (const tenant of activeTenants) {
                if (!tenant.wahaSession)
                    continue;
                try {
                    const wahaStatus = await this.agencyService.getSubaccountWahaStatus(tenant.id);
                    if (wahaStatus.status === 'FAILED' || wahaStatus.status === 'ERROR') {
                        this.logger.warn(`[Watchdog Auto-Heal] Sesión '${tenant.wahaSession}' (${tenant.name}) detectada en estado '${wahaStatus.status}'. Intentando reconexión automática...`);
                        const restarted = await this.agencyService.startSubaccountWaha(tenant.id);
                        this.logger.log(`[Watchdog Auto-Heal] Sesión '${tenant.wahaSession}' reconectada: nuevo estado=${restarted.status}`);
                    }
                }
                catch (innerErr) {
                    this.logger.debug(`[Watchdog] No se pudo verificar sesión de ${tenant.name}: ${innerErr.message}`);
                }
            }
        }
        catch (err) {
            this.logger.error(`[Watchdog] Error supervisando sesiones activas: ${err.message}`);
        }
    }
    async pruneIdleQrSessions() {
        try {
            const rawUrl = process.env.WAHA_SANDBOX_URL || process.env.WAHA_API_URL || 'https://waha.ingeniodigital.shop';
            const apiUrl = rawUrl.replace(/\/+$/, '');
            const apiKey = process.env.WAHA_SANDBOX_API_KEY || process.env.WAHA_API_KEY || 'secreto123';
            const res = await fetch(`${apiUrl}/api/sessions`, {
                headers: { 'X-Api-Key': apiKey, Accept: 'application/json' },
                signal: AbortSignal.timeout(4000),
            }).catch(() => null);
            if (!res || !res.ok)
                return;
            const sessions = await res.json().catch(() => []);
            const now = Date.now();
            const MAX_QR_IDLE_MS = 30 * 60 * 1000;
            for (const s of sessions) {
                if (s.name && s.status === 'SCAN_QR_CODE') {
                    const activityTime = s.timestamps?.activity ? Number(s.timestamps.activity) : 0;
                    const idleTime = activityTime > 0 ? now - activityTime : MAX_QR_IDLE_MS + 1;
                    if (idleTime > MAX_QR_IDLE_MS) {
                        this.logger.warn(`[Watchdog Memory Guard] Sesión '${s.name}' lleva más de 30 min en SCAN_QR_CODE sin vincularse. Pasando a STOPPED para proteger RAM del VPS.`);
                        await fetch(`${apiUrl}/api/sessions/${s.name}/stop`, {
                            method: 'POST',
                            headers: { 'X-Api-Key': apiKey },
                        }).catch(() => null);
                    }
                }
            }
        }
        catch (err) {
            this.logger.debug(`[Watchdog QR Prune] ${err.message}`);
        }
    }
};
exports.WahaWatchdogService = WahaWatchdogService;
__decorate([
    (0, schedule_1.Cron)('*/2 * * * *'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], WahaWatchdogService.prototype, "handleCron", null);
exports.WahaWatchdogService = WahaWatchdogService = WahaWatchdogService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [agency_service_1.AgencyService,
        prisma_service_1.PrismaService])
], WahaWatchdogService);
//# sourceMappingURL=waha-watchdog.service.js.map