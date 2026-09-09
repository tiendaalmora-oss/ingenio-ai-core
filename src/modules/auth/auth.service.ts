import {
  Injectable,
  UnauthorizedException,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../shared/database/prisma.service';
import * as crypto from 'crypto';

export interface AuthTokenPayload {
  userId?: string;
  email?: string;
  tenantId: string;
  role: 'agency_admin' | 'client';
  exp: number;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(private readonly prisma: PrismaService) {}

  private getSecret(): string {
    return process.env.ADMIN_API_KEY || 'admin-dev-secret';
  }

  // ── GENERACIÓN Y VERIFICACIÓN DE TOKENS ───────────────────────

  generateToken(payload: Omit<AuthTokenPayload, 'exp'>, expiresInDays = 30): string {
    const fullPayload: AuthTokenPayload = {
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

  verifyToken(token: string): AuthTokenPayload | null {
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length !== 2) return null;

    const [payloadBase64, signature] = parts;
    const expectedSig = crypto
      .createHmac('sha256', this.getSecret())
      .update(payloadBase64)
      .digest('base64url');

    if (signature.length !== expectedSig.length) return null;
    if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
      return null;
    }

    try {
      const payload: AuthTokenPayload = JSON.parse(
        Buffer.from(payloadBase64, 'base64url').toString('utf8'),
      );

      if (Date.now() > payload.exp) {
        return null;
      }

      return payload;
    } catch {
      return null;
    }
  }

  // ── HASH Y VERIFICACIÓN DE CONTRASEÑAS ────────────────────────

  hashPassword(password: string): string {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return `${salt}:${hash}`;
  }

  verifyPassword(password: string, storedHash: string): boolean {
    if (!storedHash || !storedHash.includes(':')) return false;
    const [salt, originalHash] = storedHash.split(':');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    if (hash.length !== originalHash.length) return false;
    return crypto.timingSafeEqual(Buffer.from(hash), Buffer.from(originalHash));
  }

  // ── AUTENTICACIÓN ─────────────────────────────────────────────

  async login(data: { email?: string; password: string }) {
    const password = (data.password || '').trim();
    const adminKey = this.getSecret();

    // 1. CASO A: Contraseña Maestra de Agencia (Superadmin)
    if (password === adminKey) {
      const token = this.generateToken({
        role: 'agency_admin',
        tenantId: 'dba1c54c-89c6-41e9-ae9d-03613377a5b3',
        email: 'admin@ingeniodigital.shop',
      });

      return {
        token,
        role: 'agency_admin' as const,
        tenantId: 'dba1c54c-89c6-41e9-ae9d-03613377a5b3',
        tenantName: 'Ingenio Digital (Admin)',
        name: 'Administrador de Agencia',
        email: 'admin@ingeniodigital.shop',
      };
    }

    // 2. CASO B: Acceso de Cliente de Subcuenta (Email + Contraseña)
    if (!data.email || !data.email.trim()) {
      throw new UnauthorizedException('Contraseña incorrecta o email requerido.');
    }

    const emailClean = data.email.trim().toLowerCase();
    const user = await this.prisma.tenantUser.findFirst({
      where: { email: { equals: emailClean, mode: 'insensitive' } },
      include: { tenant: true },
    });

    if (!user || !this.verifyPassword(password, user.password)) {
      throw new UnauthorizedException('Credenciales inválidas.');
    }

    if (user.tenant.status === 'suspended') {
      throw new ForbiddenException('Esta subcuenta ha sido suspendida.');
    }

    const token = this.generateToken({
      userId: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: 'client',
    });

    return {
      token,
      role: 'client' as const,
      tenantId: user.tenantId,
      tenantName: user.tenant.name,
      name: user.name || user.tenant.name,
      email: user.email,
    };
  }

  async verifyMagicKey(accessKey: string) {
    if (!accessKey || !accessKey.trim()) {
      throw new BadRequestException('Clave de acceso requerida.');
    }

    const tenant = await this.prisma.tenant.findUnique({
      where: { accessKey: accessKey.trim() },
    });

    if (!tenant) {
      throw new NotFoundException('Enlace de acceso inválido o no encontrado.');
    }

    if (tenant.status === 'suspended') {
      throw new ForbiddenException('Esta subcuenta se encuentra suspendida.');
    }

    const token = this.generateToken({
      role: 'client',
      tenantId: tenant.id,
      email: `portal@${tenant.id.slice(0, 8)}`,
    });

    return {
      token,
      role: 'client' as const,
      tenantId: tenant.id,
      tenantName: tenant.name,
      name: tenant.name,
    };
  }
}
