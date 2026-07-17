import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import fastifyCors from '@fastify/cors';

const ALLOWED_ORIGINS = [
  'http://localhost:3001',
  'https://os.ingeniodigital.shop',
];

async function bootstrap() {
  const adapter = new FastifyAdapter();

  // Register @fastify/cors directly on the Fastify instance BEFORE NestJS boots
  await adapter.register(fastifyCors as any, {
    origin: (origin: string | undefined, cb: (err: Error | null, allow: boolean) => void) => {
      // Allow requests with no origin (e.g. curl, Postman, server-to-server)
      if (!origin) return cb(null, true);
      if (ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
      cb(new Error(`Origin ${origin} not allowed by CORS`), false);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id'],
    credentials: true,
  });

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter);

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();

