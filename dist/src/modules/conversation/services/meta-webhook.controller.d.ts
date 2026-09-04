import type { FastifyReply } from 'fastify';
import { ReceiveMessageService } from './receive-message.service';
import { TenantResolverService } from '../../tenant/services/tenant-resolver.service';
import { PrismaService } from '../../../shared/database/prisma.service';
import { AudioTranscriptionService } from '../../media-processing/services/audio-transcription.service';
import { MediaVisionService } from '../../media-processing/services/media-vision.service';
export declare class MetaWebhookController {
    private readonly receiveMessageService;
    private readonly tenantResolver;
    private readonly prisma;
    private readonly audioTranscriptionService;
    private readonly mediaVisionService;
    private readonly logger;
    constructor(receiveMessageService: ReceiveMessageService, tenantResolver: TenantResolverService, prisma: PrismaService, audioTranscriptionService: AudioTranscriptionService, mediaVisionService: MediaVisionService);
    verifyToken(query: any, res: FastifyReply): FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
    receiveMessage(body: any, res: FastifyReply): Promise<void>;
}
