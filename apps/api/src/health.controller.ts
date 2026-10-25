import { Controller, Get, ServiceUnavailableException } from "@nestjs/common";
import { PrismaService } from "./prisma.service";

@Controller("health")
export class HealthController {
  constructor(private readonly db: PrismaService) {}

  @Get()
  check() {
    return { status: "ok" };
  }

  @Get("ready")
  async ready() {
    try {
      await this.db.$queryRaw`SELECT 1`;
      return { status: "ok" };
    } catch {
      throw new ServiceUnavailableException("Database is unavailable.");
    }
  }
}
