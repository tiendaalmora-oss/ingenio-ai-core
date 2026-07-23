import type { FastifyReply } from 'fastify';
import { ReceiveMessageService } from './receive-message.service';
import { TenantResolverService } from '../../tenant/services/tenant-resolver.service';
export declare class MetaWebhookController {
    private readonly receiveMessageService;
    private readonly tenantResolver;
    constructor(receiveMessageService: ReceiveMessageService, tenantResolver: TenantResolverService);
    verifyToken(query: any, res: FastifyReply): FastifyReply<import("fastify").RouteGenericInterface, import("fastify").RawServerDefault, import("http").IncomingMessage, import("http").ServerResponse<import("http").IncomingMessage>, unknown, import("fastify").FastifySchema, import("fastify").FastifyTypeProviderDefault, unknown>;
    receiveMessage(body: any, res: FastifyReply): Promise<void>;
}
