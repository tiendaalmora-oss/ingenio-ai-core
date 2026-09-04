import { OnApplicationBootstrap } from '@nestjs/common';
import { PrismaService } from './prisma.service';
export declare class DatabaseInitService implements OnApplicationBootstrap {
    private readonly prisma;
    private readonly logger;
    constructor(prisma: PrismaService);
    onApplicationBootstrap(): Promise<void>;
    private initializeTenant;
    private ensureKnowledgeBundle;
}
