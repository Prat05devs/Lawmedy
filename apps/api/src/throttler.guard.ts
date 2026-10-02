import { ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { ThrottlerGuard } from "@nestjs/throttler";

// Behind Render (and the Vercel web server) many users share one IP, so an IP-only limiter
// would throttle everyone together. Buckets are keyed by who is acting instead:
//   login/signup  -> the email being used (stops password guessing per account)
//   signed in     -> the verified user id
//   anonymous     -> the client IP (trust proxy is enabled in main.ts)
@Injectable()
export class AppThrottlerGuard extends ThrottlerGuard {
  @Inject(JwtService) private readonly jwt!: JwtService;

  protected async getTracker(req: Record<string, any>): Promise<string> {
    const email = req.body?.email;
    if (typeof email === "string" && email.length < 255) return `email:${email.trim().toLowerCase()}`;
    const [scheme, token] = String(req.headers?.authorization ?? "").split(" ");
    if (scheme === "Bearer" && token) {
      try {
        const payload = await this.jwt.verifyAsync<{ sub?: string }>(token);
        if (typeof payload.sub === "string") return `user:${payload.sub}`;
      } catch {
        // Fall through: an invalid token is throttled like an anonymous caller.
      }
    }
    return `ip:${req.ip}`;
  }

  // Health checks and the payment webhook must never be rate limited.
  protected async shouldSkip(context: ExecutionContext): Promise<boolean> {
    const path: string = context.switchToHttp().getRequest().path ?? "";
    return path === "/health" || path.startsWith("/payments/razorpay/webhook");
  }
}
