import { PrismaService } from '../../shared/database/prisma.service';
export interface AuthTokenPayload {
    userId?: string;
    email?: string;
    tenantId: string;
    role: 'agency_admin' | 'client';
    exp: number;
}
export declare class AuthService {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    private getSecret;
    generateToken(payload: Omit<AuthTokenPayload, 'exp'>, expiresInDays?: number): string;
    verifyToken(token: string): AuthTokenPayload | null;
    hashPassword(password: string): string;
    verifyPassword(password: string, storedHash: string): boolean;
    login(data: {
        email?: string;
        password: string;
    }): Promise<{
        token: string;
        role: "agency_admin";
        tenantId: string;
        tenantName: string;
        name: string;
        email: string;
    } | {
        token: string;
        role: "client";
        tenantId: string;
        tenantName: string;
        name: string;
        email: string;
    }>;
    verifyMagicKey(accessKey: string): Promise<{
        token: string;
        role: "client";
        tenantId: string;
        tenantName: string;
        name: string;
    }>;
}
