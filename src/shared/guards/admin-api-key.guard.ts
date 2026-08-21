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
    const authHeader = request.headers['authorization'];
    const expectedKey = process.env.ADMIN_API_KEY;

    if (!expectedKey) {
      this.logger.error('ADMIN_API_KEY is not configured in environment variables');
      throw new UnauthorizedException('Server configuration error');
    }

    if (!authHeader) {
      throw new UnauthorizedException('Missing Authorization header');
    }

    const [type, token] = authHeader.split(' ');

    if (type !== 'Bearer' || token !== expectedKey) {
      this.logger.warn('Invalid API Key attempt');
      throw new UnauthorizedException('Invalid API Key');
    }

    return true;
  }
}
