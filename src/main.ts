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
      if (
        origin.includes('localhost') ||
        origin.includes('127.0.0.1') ||
        origin.endsWith('.ingeniodigital.shop') ||
        ALLOWED_ORIGINS.includes(origin)
      ) {
        return cb(null, true);
      }
      cb(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-tenant-id', 'x-api-key', 'x-knowledge-version'],
    credentials: true,
  });

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter);

  await app.listen(process.env.PORT ?? 3000, '0.0.0.0');
}
bootstrap();

