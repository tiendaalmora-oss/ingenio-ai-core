"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var AdminApiKeyGuard_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.AdminApiKeyGuard = void 0;
const common_1 = require("@nestjs/common");
let AdminApiKeyGuard = AdminApiKeyGuard_1 = class AdminApiKeyGuard {
    logger = new common_1.Logger(AdminApiKeyGuard_1.name);
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
            token = authHeader.substring(7);
        }
        if (token !== expectedKey) {
            this.logger.warn(`Invalid API Key attempt: received "${token.substring(0, 4)}..."`);
            throw new common_1.UnauthorizedException('Invalid API Key');
        }
        return true;
    }
};
exports.AdminApiKeyGuard = AdminApiKeyGuard;
exports.AdminApiKeyGuard = AdminApiKeyGuard = AdminApiKeyGuard_1 = __decorate([
    (0, common_1.Injectable)()
], AdminApiKeyGuard);
//# sourceMappingURL=admin-api-key.guard.js.map