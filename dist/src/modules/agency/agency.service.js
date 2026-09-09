"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var AgencyService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AgencyService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
const crypto = __importStar(require("crypto"));
let AgencyService = AgencyService_1 = class AgencyService {
    prisma;
    logger = new common_1.Logger(AgencyService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createAgency(data) {
        const existing = await this.prisma.agency.findUnique({
            where: { ownerEmail: data.ownerEmail },
        });
        if (existing)
            throw new common_1.ConflictException('Ya existe una agencia con ese email.');
        return this.prisma.agency.create({
            data: {
                name: data.name,
                ownerEmail: data.ownerEmail,
                plan: data.plan ?? 'free',
            },
        });
    }
    async findAllAgencies() {
        return this.prisma.agency.findMany({
            include: { _count: { select: { subaccounts: true } } },
            orderBy: { createdAt: 'desc' },
        });
    }
    async findAgencyById(id) {
        const agency = await this.prisma.agency.findUnique({
            where: { id },
            include: {
                subaccounts: {
                    select: { id: true, name: true, status: true, plan: true, createdAt: true, wahaSession: true },
                    orderBy: { createdAt: 'desc' },
                },
                users: true,
                _count: { select: { subaccounts: true } },
            },
        });
        if (!agency)
            throw new common_1.NotFoundException('Agencia no encontrada.');
        return agency;
    }
    async deleteAgency(id) {
        const agency = await this.prisma.agency.findUnique({ where: { id } });
        if (!agency)
            throw new common_1.NotFoundException('Agencia no encontrada.');
        await this.prisma.tenant.updateMany({
            where: { agencyId: id },
            data: { agencyId: null },
        });
        await this.prisma.agencyUser.deleteMany({
            where: { agencyId: id },
        });
        return this.prisma.agency.delete({
            where: { id },
        });
    }
    async linkSubaccount(agencyId, tenantId, name) {
        const agency = await this.prisma.agency.findUnique({ where: { id: agencyId } });
        if (!agency)
            throw new common_1.NotFoundException('Agencia no encontrada.');
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant)
            throw new common_1.NotFoundException('Subcuenta/Tenant no encontrado.');
        return this.prisma.tenant.update({
            where: { id: tenantId },
            data: {
                agencyId,
                ...(name ? { name } : {}),
            },
        });
    }
    async purgeSubaccount(tenantId) {
        if (tenantId === 'dba1c54c-89c6-41e9-ae9d-03613377a5b3') {
            throw new common_1.ConflictException('No se puede eliminar la cuenta principal de producción.');
        }
        const contacts = await this.prisma.contact.count({ where: { tenantId } });
        if (contacts > 0) {
            throw new common_1.ConflictException(`No se puede eliminar: tiene ${contacts} contactos registrados.`);
        }
        await this.prisma.knowledgeBundle.deleteMany({ where: { tenantId } });
        return this.prisma.tenant.delete({ where: { id: tenantId } });
    }
    async createSubaccount(agencyId, data) {
        const agency = await this.prisma.agency.findUnique({ where: { id: agencyId } });
        if (!agency)
            throw new common_1.NotFoundException('Agencia no encontrada.');
        const tenantId = crypto.randomUUID();
        const sessionName = `sub_${tenantId.replace(/-/g, '').slice(0, 10)}`;
        const tenant = await this.prisma.tenant.create({
            data: {
                id: tenantId,
                name: data.name,
                agencyId,
                plan: data.plan ?? 'starter',
                status: 'active',
                wahaSession: sessionName,
            },
        });
        await this.prisma.knowledgeBundle.create({
            data: {
                tenantId: tenant.id,
                systemPrompt: {
                    business: { name: data.name, description: '', industry: '' },
                    products: [],
                    services: [],
                    faqs: [],
                    objections: [],
                    followUpSequences: [],
                },
                version: 1,
            },
        });
        return tenant;
    }
    async findSubaccountsByAgency(agencyId) {
        return this.prisma.tenant.findMany({
            where: { agencyId },
            include: {
                _count: { select: { contacts: true } },
                knowledgeBundle: { select: { version: true, updatedAt: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async updateSubaccountStatus(tenantId, status) {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant)
            throw new common_1.NotFoundException('Subcuenta no encontrada.');
        return this.prisma.tenant.update({
            where: { id: tenantId },
            data: { status },
        });
    }
    async deleteSubaccount(tenantId) {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant)
            throw new common_1.NotFoundException('Subcuenta no encontrada.');
        return this.prisma.tenant.update({
            where: { id: tenantId },
            data: { status: 'suspended' },
        });
    }
    async getAgencyStats(agencyId) {
        const [totalSubaccounts, activeSubaccounts, totalContacts] = await Promise.all([
            this.prisma.tenant.count({ where: { agencyId } }),
            this.prisma.tenant.count({ where: { agencyId, status: 'active' } }),
            this.prisma.contact.count({
                where: { tenant: { agencyId } },
            }),
        ]);
        return { totalSubaccounts, activeSubaccounts, totalContacts };
    }
    async getOverview() {
        const [agencies, unassignedTenants] = await Promise.all([
            this.prisma.agency.findMany({
                include: {
                    subaccounts: {
                        select: { id: true, name: true, status: true, plan: true, createdAt: true, wahaSession: true },
                        orderBy: { createdAt: 'desc' },
                    },
                    _count: { select: { subaccounts: true } },
                },
                orderBy: { createdAt: 'desc' },
            }),
            this.prisma.tenant.findMany({
                where: { agencyId: null },
                select: { id: true, name: true, status: true, plan: true, createdAt: true, wahaSession: true },
                orderBy: { createdAt: 'asc' },
            }),
        ]);
        return { agencies, unassignedTenants };
    }
    getWahaConfig() {
        return {
            apiUrl: process.env.WAHA_API_URL || 'https://waha.ingeniodigital.shop',
            apiKey: process.env.WAHA_API_KEY || 'secreto123',
            webhookUrl: `${process.env.CORE_API_URL || 'https://core.ai.ingeniodigital.shop'}/webhooks/meta`,
        };
    }
    isProtectedSession(tenantId, sessionName) {
        return (tenantId === 'dba1c54c-89c6-41e9-ae9d-03613377a5b3' ||
            sessionName === 'ferreos');
    }
    async ensureTenantWahaSession(tenantId) {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant)
            throw new common_1.NotFoundException('Subcuenta no encontrada.');
        if (tenant.wahaSession) {
            return tenant.wahaSession;
        }
        const newSession = `sub_${tenant.id.replace(/-/g, '').slice(0, 10)}`;
        await this.prisma.tenant.update({
            where: { id: tenantId },
            data: { wahaSession: newSession },
        });
        return newSession;
    }
    async getSubaccountWahaStatus(tenantId) {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant)
            throw new common_1.NotFoundException('Subcuenta no encontrada.');
        const sessionName = tenant.wahaSession || (await this.ensureTenantWahaSession(tenantId));
        const isProtected = this.isProtectedSession(tenantId, sessionName);
        const { apiUrl, apiKey } = this.getWahaConfig();
        try {
            const res = await fetch(`${apiUrl}/api/sessions/${sessionName}`, {
                headers: { 'X-Api-Key': apiKey, Accept: 'application/json' },
                signal: AbortSignal.timeout(4000),
            });
            if (!res.ok) {
                if (res.status === 404) {
                    return {
                        session: sessionName,
                        status: 'NOT_CONFIGURED',
                        isProtected,
                        phone: null,
                        pushName: null,
                    };
                }
                return {
                    session: sessionName,
                    status: 'ERROR',
                    isProtected,
                    error: await res.text().catch(() => 'Error consultando WAHA'),
                };
            }
            const sessionData = await res.json();
            return {
                session: sessionName,
                status: sessionData.status || 'UNKNOWN',
                phone: sessionData.me?.id ? sessionData.me.id.replace(/@.*$/, '') : null,
                pushName: sessionData.me?.pushName || null,
                isProtected,
            };
        }
        catch (err) {
            return {
                session: sessionName,
                status: 'OFFLINE',
                isProtected,
                error: err.message,
            };
        }
    }
    async startSubaccountWaha(tenantId) {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant)
            throw new common_1.NotFoundException('Subcuenta no encontrada.');
        const sessionName = tenant.wahaSession || (await this.ensureTenantWahaSession(tenantId));
        const isProtected = this.isProtectedSession(tenantId, sessionName);
        const { apiUrl, apiKey, webhookUrl } = this.getWahaConfig();
        const checkRes = await fetch(`${apiUrl}/api/sessions/${sessionName}`, {
            headers: { 'X-Api-Key': apiKey, Accept: 'application/json' },
            signal: AbortSignal.timeout(4000),
        }).catch(() => null);
        if (checkRes && checkRes.ok) {
            const existing = await checkRes.json();
            if (existing.status === 'WORKING') {
                return {
                    session: sessionName,
                    status: 'WORKING',
                    phone: existing.me?.id ? existing.me.id.replace(/@.*$/, '') : null,
                    pushName: existing.me?.pushName || null,
                    isProtected,
                };
            }
            if (existing.status === 'STOPPED' || existing.status === 'FAILED') {
                await fetch(`${apiUrl}/api/sessions/${sessionName}/start`, {
                    method: 'POST',
                    headers: { 'X-Api-Key': apiKey },
                });
            }
        }
        else {
            const createRes = await fetch(`${apiUrl}/api/sessions`, {
                method: 'POST',
                headers: {
                    'X-Api-Key': apiKey,
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                },
                body: JSON.stringify({
                    name: sessionName,
                    start: true,
                    config: {
                        webhooks: [
                            {
                                url: webhookUrl,
                                events: ['session.status', 'message'],
                            },
                        ],
                    },
                }),
            });
            if (!createRes.ok) {
                const errorText = await createRes.text().catch(() => '');
                throw new common_1.ConflictException(`Error al iniciar sesión en WAHA: ${errorText}`);
            }
        }
        return this.getSubaccountWahaStatus(tenantId);
    }
    async getSubaccountWahaQr(tenantId) {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant)
            throw new common_1.NotFoundException('Subcuenta no encontrada.');
        const sessionName = tenant.wahaSession || (await this.ensureTenantWahaSession(tenantId));
        const isProtected = this.isProtectedSession(tenantId, sessionName);
        const { apiUrl, apiKey } = this.getWahaConfig();
        try {
            const res = await fetch(`${apiUrl}/api/${sessionName}/auth/qr`, {
                headers: { 'X-Api-Key': apiKey },
                signal: AbortSignal.timeout(6000),
            });
            if (res.status === 422) {
                const status = await this.getSubaccountWahaStatus(tenantId);
                return {
                    session: sessionName,
                    status: status.status,
                    qr: null,
                    isProtected,
                    message: 'La sesión no requiere escaneo de QR actualmente.',
                };
            }
            if (!res.ok) {
                return {
                    session: sessionName,
                    status: 'UNAVAILABLE',
                    qr: null,
                    isProtected,
                    error: await res.text().catch(() => 'No disponible'),
                };
            }
            const buffer = await res.arrayBuffer();
            const base64 = Buffer.from(buffer).toString('base64');
            const dataUrl = `data:image/png;base64,${base64}`;
            return {
                session: sessionName,
                status: 'SCAN_QR_CODE',
                qr: dataUrl,
                isProtected,
            };
        }
        catch (err) {
            return {
                session: sessionName,
                status: 'ERROR',
                qr: null,
                isProtected,
                error: err.message,
            };
        }
    }
    async logoutSubaccountWaha(tenantId) {
        const tenant = await this.prisma.tenant.findUnique({ where: { id: tenantId } });
        if (!tenant)
            throw new common_1.NotFoundException('Subcuenta no encontrada.');
        const sessionName = tenant.wahaSession;
        if (this.isProtectedSession(tenantId, sessionName)) {
            throw new common_1.ForbiddenException('Acción denegada: La sesión de producción principal (ferreos) está blindada y no puede ser desconectada.');
        }
        if (!sessionName) {
            return { success: true, message: 'No había sesión configurada.' };
        }
        const { apiUrl, apiKey } = this.getWahaConfig();
        await fetch(`${apiUrl}/api/sessions/${sessionName}/logout`, {
            method: 'POST',
            headers: { 'X-Api-Key': apiKey },
        }).catch(() => null);
        await fetch(`${apiUrl}/api/sessions/${sessionName}/stop`, {
            method: 'POST',
            headers: { 'X-Api-Key': apiKey },
        }).catch(() => null);
        return { success: true, session: sessionName, status: 'STOPPED' };
    }
};
exports.AgencyService = AgencyService;
exports.AgencyService = AgencyService = AgencyService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AgencyService);
//# sourceMappingURL=agency.service.js.map