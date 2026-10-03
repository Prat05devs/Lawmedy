import { Body, Controller, Get, Header, HttpCode, Post } from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "./prisma.service";
import { RtiService } from "./rti/rti.service";
import { QuickCheckService } from "./quick-check.service";
import { QuickCheckDto } from "./dto";

// Read-only content the app and website show before anyone signs in. Nothing here is personal.
// Responses are cacheable so a busy landing page does not turn into database traffic.
@Controller("public")
export class PublicController {
  constructor(
    private readonly db: PrismaService,
    private readonly config: ConfigService,
    private readonly rti: RtiService,
    private readonly quickCheck: QuickCheckService,
  ) {}

  @Get("pricing")
  @Header("Cache-Control", "public, max-age=300")
  pricing() {
    const amount = (key: string) => Number(this.config.get(key, 29900));
    return { currency: "INR", legalNotice: amount("LEGAL_NOTICE_PRICE_PAISE"), rti: amount("RTI_PRICE_PAISE") };
  }

  @Get("rti-authorities")
  @Header("Cache-Control", "public, max-age=3600")
  authorities() {
    return this.rti.authorities();
  }

  // Per-IP only (no account to key on): a handful an hour is plenty for a real person.
  @Post("quick-check")
  @HttpCode(200)
  @Throttle({ default: { limit: 6, ttl: 3600000 }, ip: { limit: 20, ttl: 3600000 } })
  check(@Body() dto: QuickCheckDto) {
    return this.quickCheck.run(dto.statement, dto.type);
  }

  @Get("testimonials")
  @Header("Cache-Control", "public, max-age=300")
  testimonials() {
    return this.db.testimonial.findMany({
      where: { published: true, consentGiven: true },
      orderBy: [{ position: "asc" }, { createdAt: "desc" }],
      take: 12,
      select: { id: true, name: true, descriptor: true, quote: true, matterType: true },
    });
  }
}
