import "reflect-metadata";
import { NestFactory } from "@nestjs/core";
import { ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import helmet from "helmet";
import compression from "compression";
import type { Server } from "node:http";
import { AppModule } from "./app.module";
import { checkProductionSecurity } from "./security-config";
async function bootstrap() {
  const app = await NestFactory.create(AppModule, { rawBody: true });
  const config = app.get(ConfigService);
  checkProductionSecurity(config);
  // Private responses must not be retained by shared HTTP/CDN caches. Public
  // read-only controllers explicitly override this with their bounded TTLs.
  app.use((_request: unknown, response: { setHeader(name: string, value: string): void }, next: () => void) => {
    response.setHeader("Cache-Control", "private, no-store");
    next();
  });
  // The host terminates TLS in front of us: trust its proxy hops so req.ip is the real client.
  app.getHttpAdapter().getInstance().set("trust proxy", Number(config.get("TRUST_PROXY_HOPS", 1)));
  app.use(helmet());
  app.use(compression());
  // WEB_ORIGIN may list several origins, comma-separated (for example the site plus a local preview).
  const origins = config.get<string>("WEB_ORIGIN", "http://localhost:3000").split(",").map((o) => o.trim()).filter(Boolean);
  app.enableCors({ origin: origins.length === 1 ? origins[0] : origins });
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
// Background work (sweeps, post-response jobs) runs outside any request. Log its failures
// instead of letting one stray rejection exit the process.
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason instanceof Error ? reason.message : reason);
});
void bootstrap();
