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
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaContactRepository = void 0;
const common_1 = require("@nestjs/common");
const contact_entity_1 = require("../entities/contact.entity");
const prisma_service_1 = require("../../../shared/database/prisma.service");
let PrismaContactRepository = class PrismaContactRepository {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async save(contact) {
        await this.prisma.contact.upsert({
            where: { id: contact.id },
            update: {
                name: contact.name,
                phone: contact.phone,
            },
            create: {
                id: contact.id,
                tenantId: contact.tenantId,
                name: contact.name,
                phone: contact.phone,
            },
        });
    }
    async findById(id) {
        const raw = await this.prisma.contact.findUnique({ where: { id } });
        if (!raw)
            return null;
        return new contact_entity_1.Contact(raw.id, raw.tenantId, raw.name, raw.phone);
    }
    async findByTenant(tenantId) {
        const rawList = await this.prisma.contact.findMany({ where: { tenantId } });
        return rawList.map(raw => new contact_entity_1.Contact(raw.id, raw.tenantId, raw.name, raw.phone));
    }
};
exports.PrismaContactRepository = PrismaContactRepository;
exports.PrismaContactRepository = PrismaContactRepository = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PrismaContactRepository);
//# sourceMappingURL=prisma-contact.repository.js.map