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
var AuthService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuthService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../shared/database/prisma.service");
const crypto = __importStar(require("crypto"));
let AuthService = AuthService_1 = class AuthService {
    prisma;
    logger = new common_1.Logger(AuthService_1.name);
    constructor(prisma) {
        this.prisma = prisma;
    }
    getSecret() {
        return process.env.ADMIN_API_KEY || 'admin-dev-secret';
    }
    generateToken(payload, expiresInDays = 30) {
        const fullPayload = {
            ...payload,
            exp: Date.now() + expiresInDays * 24 * 60 * 60 * 1000,
        };
        const payloadBase64 = Buffer.from(JSON.stringify(fullPayload)).toString('base64url');
        const signature = crypto
            .createHmac('sha256', this.getSecret())
            .update(payloadBase64)
            .digest('base64url');
        return `${payloadBase64}.${signature}`;
    }
    verifyToken(token) {
        if (!token || typeof token !== 'string')
            return null;
        const parts = token.split('.');
        if (parts.length !== 2)
            return null;
        const [payloadBase64, signature] = parts;
        const expectedSig = crypto
            .createHmac('sha256', this.getSecret())
            .update(payloadBase64)
            .digest('base64url');
        if (signature.length !== expectedSig.length)
            return null;
        if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
            return null;
        }
        try {
            const payload = JSON.parse(Buffer.from(payloadBase64, 'base64url').toString('utf8'));
            if (Date.now() > payload.exp) {
                return null;
            }
            return payload;
        }
        catch {
            return null;
        }
    }
    hashPassword(password) {
        const salt = crypto.randomBytes(16).toString('hex');
        const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        return `${salt}:${hash}`;
    }
    verifyPassword(password, storedHash) {
        if (!storedHash || !storedHash.includes(':'))
            return false;
        const [salt, originalHash] = storedHash.split(':');
        const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
        if (hash.length !== originalHash.length)
            return false;
        return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(originalHash));
    }
    async login(data) {
        const password = (data.password || '').trim();
        const adminKey = this.getSecret();
        if (password === adminKey) {
            const token = this.generateToken({
                role: 'agency_admin',
                tenantId: 'dba1c54c-89c6-41e9-ae9d-03613377a5b3',
                email: 'admin@ingeniodigital.shop',
            });
            return {
                token,
                role: 'agency_admin',
                tenantId: 'dba1c54c-89c6-41e9-ae9d-03613377a5b3',
                tenantName: 'Ingenio Digital (Admin)',
                name: 'Administrador de Agencia',
                email: 'admin@ingeniodigital.shop',
            };
        }
        if (!data.email || !data.email.trim()) {
            throw new common_1.UnauthorizedException('Contraseña incorrecta o email requerido.');
        }
        const emailClean = data.email.trim().toLowerCase();
        const user = await this.prisma.tenantUser.findFirst({
            where: { email: { equals: emailClean, mode: 'insensitive' } },
            include: { tenant: true },
        });
        if (!user || !this.verifyPassword(password, user.password)) {
            throw new common_1.UnauthorizedException('Credenciales inválidas.');
        }
        if (user.tenant.status === 'suspended') {
            throw new common_1.ForbiddenException('Esta subcuenta ha sido suspendida.');
        }
        const token = this.generateToken({
            userId: user.id,
            email: user.email,
            tenantId: user.tenantId,
            role: 'client',
        });
        return {
            token,
            role: 'client',
            tenantId: user.tenantId,
            tenantName: user.tenant.name,
            name: user.name || user.tenant.name,
            email: user.email,
        };
    }
    async verifyMagicKey(accessKey) {
        if (!accessKey || !accessKey.trim()) {
            throw new common_1.BadRequestException('Clave de acceso requerida.');
        }
        const tenant = await this.prisma.tenant.findUnique({
            where: { accessKey: accessKey.trim() },
        });
        if (!tenant) {
            throw new common_1.NotFoundException('Enlace de acceso inválido o no encontrado.');
        }
        if (tenant.status === 'suspended') {
            throw new common_1.ForbiddenException('Esta subcuenta se encuentra suspendida.');
        }
        const token = this.generateToken({
            role: 'client',
            tenantId: tenant.id,
            email: `portal@${tenant.id.slice(0, 8)}`,
        });
        return {
            token,
            role: 'client',
            tenantId: tenant.id,
            tenantName: tenant.name,
            name: tenant.name,
        };
    }
};
exports.AuthService = AuthService;
exports.AuthService = AuthService = AuthService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], AuthService);
//# sourceMappingURL=auth.service.js.map