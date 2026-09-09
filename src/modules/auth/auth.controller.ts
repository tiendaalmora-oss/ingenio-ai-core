import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  /**
   * POST /auth/login
   * Login unificado: Master Password (admin) o Email + Password (cliente)
   */
  @Post('login')
  async login(@Body() body: { email?: string; password: string }) {
    return this.authService.login(body);
  }

  /**
   * GET /auth/magic/:key
   * Valida un Magic Link de 1 clic y retorna el token de sesión
   */
  @Get('magic/:key')
  async verifyMagicKey(@Param('key') key: string) {
    return this.authService.verifyMagicKey(key);
  }

  /**
   * GET /auth/me
   * Retorna los datos del usuario a partir del Bearer token
   */
  @Get('me')
  async getMe(@Headers('authorization') authHeader?: string) {
    if (!authHeader) {
      throw new UnauthorizedException('No authorization header provided');
    }

    const token = authHeader.replace(/^Bearer\s+/i, '').trim();
    const payload = this.authService.verifyToken(token);

    if (!payload) {
      // Verificar si es la clave maestra
      const adminKey = process.env.ADMIN_API_KEY || 'admin-dev-secret';
      if (token === adminKey) {
        return {
          role: 'agency_admin',
          tenantId: 'dba1c54c-89c6-41e9-ae9d-03613377a5b3',
          tenantName: 'Ingenio Digital (Admin)',
          name: 'Administrador de Agencia',
        };
      }
      throw new UnauthorizedException('Token inválido o expirado.');
    }

    return payload;
  }
}
