import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { FastifyAdapter, NestFastifyApplication } from '@nestjs/platform-fastify';
import { AppModule } from './modules/app.module.js';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as dotenv from 'dotenv';

dotenv.config();

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter({ logger: true }));
  app.enableCors({ origin: [/localhost:\d+$/] });

  // OpenAPI/Swagger
  const swaggerCfg = new DocumentBuilder()
    .setTitle('Solana API')
    .setDescription('Solana Pass backend APIs')
    .setVersion('0.1.0')
    .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' }, 'sas')
    .build();
  const doc = SwaggerModule.createDocument(app, swaggerCfg);
  SwaggerModule.setup('docs', app, doc);
  const port = Number(process.env.PORT || 8788);
  await app.listen({ port, host: '0.0.0.0' });
  console.log(`[solana-api] listening on :${port}`);
}

bootstrap();
