"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const platform_fastify_1 = require("@nestjs/platform-fastify");
const app_module_1 = require("./app.module");
const cors_1 = __importDefault(require("@fastify/cors"));
const ALLOWED_ORIGINS = [
    'http://localhost:3001',
    'https://os.ingeniodigital.shop',
];
async function bootstrap() {
    const adapter = new platform_fastify_1.FastifyAdapter();
    await adapter.register(cors_1.default, {
        origin: (origin, cb) => {
            if (!origin)
                return cb(null, true);
            if (ALLOWED_ORIGINS.includes(origin))
                return cb(null, true);
            cb(new Error(`Origin ${origin} not allowed by CORS`), false);
        },
        methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
        credentials: true,
    });
    const app = await core_1.NestFactory.create(app_module_1.AppModule, adapter);
    await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();
//# sourceMappingURL=main.js.map