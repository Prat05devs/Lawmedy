import { HealthController } from "./health.controller";
import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerModule } from "@nestjs/throttler";
import { AppThrottlerGuard } from "./throttler.guard";
import { PrismaService } from "./prisma.service";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import { MattersService } from "./matters.service";
import { GeminiService } from "./intake/gemini.service";
import { IntakeService } from "./intake/intake.service";
import { EvidenceController } from "./evidence/evidence.controller";
import { EvidenceService } from "./evidence/evidence.service";
import {
  LocalPrivateStorage, SupabasePrivateStorage,
  PrivateStorage,
} from "./evidence/storage.service";
import { ReviewService } from "./review/review.service";
import { RazorpayService } from "./payment/razorpay.service";
import { PaymentService } from "./payment/payment.service";
import { AdminService } from "./admin/admin.service";
import { RecoveryService } from "./recovery.service";
import { PublicController } from "./public.controller";
import { QuickCheckService } from "./quick-check.service";
import { AdvocateInterestService } from "./advocate-interest.service";
import { AccountService } from "./account.service";
import { AdminController } from "./admin/admin.controller";
import { PaymentWebhookController } from "./payment/payment.controller";
import { DocumentsService } from "./documents/documents.service";
import { AdvocateService } from "./advocate/advocate.service";
import { AdvocateController } from "./advocate/advocate.controller";
import { RolesGuard } from "./roles.guard";
import { FinalDocumentController } from "./final-document/final-document.controller";
import { FinalDocumentService } from "./final-document/final-document.service";
import { PdfRendererService } from "./final-document/pdf-renderer.service";
import { TransactionalEmailService } from "./final-document/email.service";
import { RtiService } from "./rti/rti.service";
import {
  AuthController,
  UsersController,
  MattersController,
} from "./controllers";
@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    ThrottlerModule.forRoot([
      // Per user (or per email on login/signup).
      { name: "default", ttl: 60000, limit: 240 },
      // Per client IP. Generous everywhere because the website's server shares a few IPs;
      // the auth endpoints tighten it to slow down one machine trying many accounts.
      { name: "ip", ttl: 60000, limit: 6000, getTracker: (req) => `ip:${req.ip}` },
    ]),
    JwtModule.registerAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const secret = config.get<string>("JWT_SECRET");
        if (!secret || secret.length < 32 || secret.startsWith("replace-"))
          throw new Error(
            "Set JWT_SECRET to a random value of at least 32 characters.",
          );
        return {
          secret,
          signOptions: {
            expiresIn: "1d",
            issuer: "lawmedy-api",
            audience: "lawmedy",
          },
          verifyOptions: {
            issuer: "lawmedy-api",
            audience: "lawmedy",
            algorithms: ["HS256"],
          },
        };
      },
    }),
  ],
  controllers: [
    HealthController,
    PublicController,
    AdminController,
    AuthController,
    UsersController,
    MattersController,
    EvidenceController,
    PaymentWebhookController,
    AdvocateController,
    FinalDocumentController,
  ],
  providers: [
    PrismaService,
    AuthService,
    AuthGuard,
    MattersService,
    GeminiService,
    IntakeService,
    EvidenceService,
    ReviewService,
    RazorpayService,
    PaymentService,
    AdminService,
    RecoveryService,
    QuickCheckService,
    AdvocateInterestService,
    AccountService,
    DocumentsService,
    AdvocateService,
    RolesGuard,
    FinalDocumentService,
    PdfRendererService,
    TransactionalEmailService,
    RtiService,
    {
      provide: PrivateStorage,
      inject: [ConfigService],
      useFactory: (config: ConfigService): PrivateStorage =>
        config.get<string>("STORAGE_DRIVER", "local") === "supabase"
          ? new SupabasePrivateStorage(config)
          : new LocalPrivateStorage(config),
    },
    { provide: APP_GUARD, useClass: AppThrottlerGuard },
  ],
})
export class AppModule {}
