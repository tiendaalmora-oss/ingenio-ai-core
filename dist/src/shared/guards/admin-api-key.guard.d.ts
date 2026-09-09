import { CanActivate, ExecutionContext } from '@nestjs/common';
import { AuthService } from '../../modules/auth/auth.service';
export declare class AdminApiKeyGuard implements CanActivate {
    private readonly authService?;
    private readonly logger;
    constructor(authService?: AuthService | undefined);
    canActivate(context: ExecutionContext): boolean;
}
