import { CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../database/prisma.service';
export declare class TenantGuard implements CanActivate {
    private readonly reflector;
    private readonly prisma;
    private readonly logger;
    private readonly cache;
    private readonly cacheTtlMs;
    constructor(reflector: Reflector, prisma: PrismaService);
    canActivate(context: ExecutionContext): Promise<boolean>;
    private pruneExpiredEntries;
    clearCache(): void;
    getCacheSize(): number;
}
