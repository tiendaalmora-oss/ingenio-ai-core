import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { AppModule } from './app.module';
import fastifyCors from '@fastify/cors';

async function bootstrap() {
  const adapter = new FastifyAdapter();

  // Register CORS to allow all origins and custom headers for Fastify
  await adapter.register(fastifyCors as any, {
    origin: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: ['*'],
    credentials: true,
  });

  const app = await NestFactory.create<NestFastifyApplication>(AppModule, adapter);

  const port = Number(process.env.PORT) || 3000;
  await app.listen(port, '0.0.0.0');
}
bootstrap();
