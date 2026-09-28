import { OnApplicationBootstrap } from '@nestjs/common';
import { AgencyService } from './agency.service';
import { PrismaService } from '../../shared/database/prisma.service';
export declare class WahaWatchdogService implements OnApplicationBootstrap {
    private readonly agencyService;
    private readonly prisma;
    private readonly logger;
    private isChecking;
    constructor(agencyService: AgencyService, prisma: PrismaService);
    onApplicationBootstrap(): Promise<void>;
    handleCron(): Promise<void>;
    checkAndHealWahaSessions(): Promise<void>;
    private ensureProdSessionAlive;
    private pruneIdleSandboxSessions;
}
