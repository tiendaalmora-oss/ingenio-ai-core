import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  Logger,
  Optional,
} from '@nestjs/common';
import { AuthService } from '../../modules/auth/auth.service';

@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(AdminApiKeyGuard.name);

  constructor(@Optional() private readonly authService?: AuthService) {}
  
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers['authorization'] || request.headers['x-api-key'];
    const expectedKey = process.env.ADMIN_API_KEY || 'admin-dev-secret';

    if (!authHeader) {
      this.logger.warn('Missing Authorization header or x-api-key');
      throw new UnauthorizedException('Missing Authorization header');
    }

    let token = authHeader;
    if (authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7).trim();
    }

    // 1. Clave Maestra de Administrador de Agencia
    if (token === expectedKey) {
      request.user = {
        role: 'agency_admin',
        tenantId: 'dba1c54c-89c6-41e9-ae9d-03613377a5b3',
      };
      return true;
    }

    // 2. Token firmado por AuthService
    if (this.authService) {
      const payload = this.authService.verifyToken(token);
      if (payload) {
        request.user = payload;

        // Si la ruta es del panel de agencia (/agency), exigir rol agency_admin
        const url = request.raw?.url || request.url || '';
        if (url.includes('/agency') && payload.role !== 'agency_admin') {
          this.logger.warn(`Intento no autorizado de cliente a ruta de agencia: ${url}`);
          throw new ForbiddenException('Acceso restringido a administradores de agencia');
        }

        return true;
      }
    }

    this.logger.warn(`Invalid API Key attempt: received "${token.substring(0, 4)}..."`);
    throw new UnauthorizedException('Invalid API Key or expired token');
  }
}
