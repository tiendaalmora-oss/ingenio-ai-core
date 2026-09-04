"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SkipTenantGuard = exports.SKIP_TENANT_GUARD_KEY = void 0;
const common_1 = require("@nestjs/common");
exports.SKIP_TENANT_GUARD_KEY = 'skipTenantGuard';
const SkipTenantGuard = () => (0, common_1.SetMetadata)(exports.SKIP_TENANT_GUARD_KEY, true);
exports.SkipTenantGuard = SkipTenantGuard;
//# sourceMappingURL=skip-tenant-guard.decorator.js.map