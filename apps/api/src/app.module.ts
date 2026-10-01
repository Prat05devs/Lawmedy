import { Module } from "@nestjs/common";
import { ConfigModule, ConfigService } from "@nestjs/config";
import { JwtModule } from "@nestjs/jwt";
import { APP_GUARD } from "@nestjs/core";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { PrismaService } from "./prisma.service";
import { AuthService } from "./auth.service";
import { AuthGuard } from "./auth.guard";
import { MattersService } from "./matters.service";
import { GeminiService } from "./intake/gemini.service";
import { IntakeService } from "./intake/intake.service";
import { EvidenceController } from "./evidence/evidence.controller";
import { EvidenceService } from "./evidence/evidence.service";
import {
  LocalPrivateStorage,
  PrivateStorage,
} from "./evidence/storage.service";
import { ReviewService } from "./review/review.service";
import { RazorpayService } from "./payment/razorpay.service";
import { PaymentService } from "./payment/payment.service";
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
    ThrottlerModule.forRoot([{ ttl: 60000, limit: 100 }]),
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
    DocumentsService,
    AdvocateService,
    RolesGuard,
    FinalDocumentService,
    PdfRendererService,
    TransactionalEmailService,
    RtiService,
    { provide: PrivateStorage, useClass: LocalPrivateStorage },
    { provide: APP_GUARD, useClass: ThrottlerGuard },
  ],
})
export class AppModule {}
