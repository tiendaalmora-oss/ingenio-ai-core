import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';

@Injectable()
export class AdminApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(AdminApiKeyGuard.name);
  
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
      token = authHeader.substring(7);
    }

    if (token !== expectedKey) {
      this.logger.warn(`Invalid API Key attempt: received "${token.substring(0, 4)}..."`);
      throw new UnauthorizedException('Invalid API Key');
    }

    return true;
  }
}
