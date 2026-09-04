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
var DatabaseInitService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.DatabaseInitService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("./prisma.service");
let DatabaseInitService = DatabaseInitService_1 = class DatabaseInitService {
    prisma;
    logger = new common_1.Logger(DatabaseInitService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    async onApplicationBootstrap() {
        await this.initializeTenant();
    }
    async initializeTenant() {
        try {
            const targetSession = process.env.WAHA_SESSION || 'ferreos';
            const tenants = await this.prisma.tenant.findMany();
            if (tenants.length === 0) {
                this.logger.log('No tenants found. Creating main tenant...');
                const tenant = await this.prisma.tenant.create({
                    data: {
                        name: 'Default Tenant',
                        wahaSession: targetSession,
                        currentBundleVersion: 'v1',
                    },
                });
                this.logger.log(`✅ Main tenant created: ${tenant.name} (wahaSession: ${tenant.wahaSession})`);
                await this.ensureKnowledgeBundle(tenant.id);
            }
            else {
                const main = tenants[0];
                if (main.wahaSession !== targetSession) {
                    await this.prisma.tenant.update({
                        where: { id: main.id },
                        data: { wahaSession: targetSession },
                    });
                    this.logger.log(`✅ Tenant "${main.name}" patched: wahaSession set to ${targetSession}`);
                }
                else {
                    this.logger.log(`✅ Tenant "${main.name}" already has correct wahaSession (${targetSession})`);
                }
                await this.ensureKnowledgeBundle(main.id);
            }
        }
        catch (err) {
            this.logger.error(`❌ Database initialization failed: ${err.message}`);
        }
    }
    async ensureKnowledgeBundle(tenantId) {
        const emptyBundlePrompt = {
            _raw: {
                identidad: { nombre: 'Asistente Virtual', tono: 'Profesional, empático y vendedor' },
                empresa: { nombre: '', descripcion: '', sitioWeb: '' },
                productos: [],
                categorias: [],
                servicios: [],
                faqs: [],
                objeciones: [],
                scriptsComerciales: [],
                promociones: [],
                seguimientos: [],
                soporte: [],
                politicasAtencion: [],
            },
            instrucciones: 'El asistente se encuentra listo para configurar. Carga tus productos y servicios desde el Business Studio.',
        };
        const existing = await this.prisma.knowledgeBundle.findUnique({
            where: { tenantId },
        });
        if (!existing) {
            await this.prisma.knowledgeBundle.create({
                data: {
                    tenantId,
                    systemPrompt: emptyBundlePrompt,
                    version: 1,
                },
            });
            this.logger.log(`✅ KnowledgeBundle created for tenant: ${tenantId}`);
        }
        else {
            const prompt = existing.systemPrompt || {};
            if (prompt.empresa === 'FerreOS' || JSON.stringify(prompt).includes('FerreOS')) {
                await this.prisma.knowledgeBundle.update({
                    where: { tenantId },
                    data: {
                        systemPrompt: emptyBundlePrompt,
                        version: { increment: 1 },
                    },
                });
                this.logger.log(`🧹 Legacy FerreOS KnowledgeBundle reset to clean slate for tenant: ${tenantId}`);
            }
        }
    }
};
exports.DatabaseInitService = DatabaseInitService;
exports.DatabaseInitService = DatabaseInitService = DatabaseInitService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DatabaseInitService);
//# sourceMappingURL=database-init.service.js.map