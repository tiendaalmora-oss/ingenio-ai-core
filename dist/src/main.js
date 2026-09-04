"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const platform_fastify_1 = require("@nestjs/platform-fastify");
const app_module_1 = require("./app.module");
const cors_1 = __importDefault(require("@fastify/cors"));
async function bootstrap() {
    const adapter = new platform_fastify_1.FastifyAdapter();
    await adapter.register(cors_1.default, {
        origin: true,
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
        allowedHeaders: ['*'],
        credentials: true,
    });
    const app = await core_1.NestFactory.create(app_module_1.AppModule, adapter);
    const port = Number(process.env.PORT) || 3000;
    await app.listen(port, '0.0.0.0');
}
bootstrap();
//# sourceMappingURL=main.js.map