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
            await this.ensureProdSessionAlive();
            await this.pruneIdleSandboxSessions();
        }
        catch (err) {
            this.logger.error(`[Watchdog] Error en ciclo de supervisión: ${err.message}`);
        }
        finally {
            this.isChecking = false;
        }
    }
    async ensureProdSessionAlive() {
        try {
            const prodStatus = await this.agencyService.getSubaccountWahaStatus(PROD_MAIN_TENANT_ID);
            if (prodStatus.status === 'NOT_CONFIGURED' ||
                prodStatus.status === 'FAILED' ||
                prodStatus.status === 'ERROR' ||
                prodStatus.status === 'STOPPED') {
                this.logger.warn(`[Watchdog Alert] Sesión de producción 'ferreos' en estado '${prodStatus.status}'. Auto-reconstruyendo sesión limpia...`);
                const started = await this.agencyService.startSubaccountWaha(PROD_MAIN_TENANT_ID);
                this.logger.log(`[Watchdog] Sesión de producción 'ferreos' auto-iniciada con éxito: status=${started.status}`);
            }
        }
        catch (err) {
            this.logger.error(`[Watchdog] Error vigilando sesión de producción: ${err.message}`);
        }
    }
    async pruneIdleSandboxSessions() {
        try {
            const rawUrl = process.env.WAHA_SANDBOX_URL || process.env.WAHA_API_URL || 'https://waha-sandbox.ingeniodigital.shop';
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
            const MAX_IDLE_MS = 45 * 60 * 1000;
            for (const s of sessions) {
                if (s.name && s.name.startsWith('sub_') && (s.status === 'SCAN_QR_CODE' || s.status === 'STARTING')) {
                    const activityTime = s.timestamps?.activity ? Number(s.timestamps.activity) : 0;
                    const idleTime = activityTime > 0 ? (now - activityTime) : Infinity;
                    if (idleTime > MAX_IDLE_MS) {
                        this.logger.warn(`[Watchdog Memory Guard] Subcuenta Sandbox '${s.name}' inactiva esperando QR por más de 45 min (${Math.round(idleTime / 60000)} min). Deteniendo Chromium para liberar RAM del VPS.`);
                        await fetch(`${apiUrl}/api/sessions/${s.name}/stop`, {
                            method: 'POST',
                            headers: { 'X-Api-Key': apiKey },
                        }).catch(() => null);
                    }
                }
            }
        }
        catch (err) {
            this.logger.debug(`[Watchdog Sandbox Prune] ${err.message}`);
        }
    }
};
exports.WahaWatchdogService = WahaWatchdogService;
__decorate([
    (0, schedule_1.Cron)(schedule_1.CronExpression.EVERY_MINUTE),
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