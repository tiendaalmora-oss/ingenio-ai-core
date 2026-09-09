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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var AdminApiKeyGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminApiKeyGuard = void 0;
const common_1 = require("@nestjs/common");
const auth_service_1 = require("../../modules/auth/auth.service");
let AdminApiKeyGuard = AdminApiKeyGuard_1 = class AdminApiKeyGuard {
    authService;
    logger = new common_1.Logger(AdminApiKeyGuard_1.name);
    constructor(authService) {
        this.authService = authService;
    }
    canActivate(context) {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers['authorization'] || request.headers['x-api-key'];
        const expectedKey = process.env.ADMIN_API_KEY || 'admin-dev-secret';
        if (!authHeader) {
            this.logger.warn('Missing Authorization header or x-api-key');
            throw new common_1.UnauthorizedException('Missing Authorization header');
        }
        let token = authHeader;
        if (authHeader.startsWith('Bearer ')) {
            token = authHeader.substring(7).trim();
        }
        if (token === expectedKey) {
            request.user = {
                role: 'agency_admin',
                tenantId: 'dba1c54c-89c6-41e9-ae9d-03613377a5b3',
            };
            return true;
        }
        if (this.authService) {
            const payload = this.authService.verifyToken(token);
            if (payload) {
                request.user = payload;
                const url = request.raw?.url || request.url || '';
                if (url.includes('/agency') && payload.role !== 'agency_admin') {
                    this.logger.warn(`Intento no autorizado de cliente a ruta de agencia: ${url}`);
                    throw new common_1.ForbiddenException('Acceso restringido a administradores de agencia');
                }
                return true;
            }
        }
        this.logger.warn(`Invalid API Key attempt: received "${token.substring(0, 4)}..."`);
        throw new common_1.UnauthorizedException('Invalid API Key or expired token');
    }
};
exports.AdminApiKeyGuard = AdminApiKeyGuard;
exports.AdminApiKeyGuard = AdminApiKeyGuard = AdminApiKeyGuard_1 = __decorate([
    (0, common_1.Injectable)(),
    __param(0, (0, common_1.Optional)()),
    __metadata("design:paramtypes", [auth_service_1.AuthService])
], AdminApiKeyGuard);
//# sourceMappingURL=admin-api-key.guard.js.map