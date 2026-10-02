import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import helmet from "helmet";
import compression from "compression";
import type { Server } from "node:http";
import { AppModule } from "./app.module";
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);
  // Render terminates TLS in front of us: trust one proxy hop so req.ip is the real client.
  app.getHttpAdapter().getInstance().set("trust proxy", 1);
  app.use(helmet());
  app.use(compression());
  app.enableCors({ origin: config.get("WEB_ORIGIN", "http://localhost:3000") });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableShutdownHooks();
  const server = (await app.listen(config.get("PORT", 4000), process.env.HOST || "127.0.0.1")) as Server;
  // Render's load balancer keeps connections open longer than Node's 5s default, which
  // causes sporadic 502s. Keep ours open longer than the balancer's.
  server.keepAliveTimeout = 65_000;
  server.headersTimeout = 66_000;
}
void bootstrap();
