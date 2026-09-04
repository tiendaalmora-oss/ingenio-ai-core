import { CanActivate, ExecutionContext } from '@nestjs/common';
export declare class AdminApiKeyGuard implements CanActivate {
    private readonly logger;
    canActivate(context: ExecutionContext): boolean;
}
