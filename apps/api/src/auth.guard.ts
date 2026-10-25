import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
  createParamDecorator,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Request } from "express";
import { PrismaService } from "./prisma.service";
export type AuthRequest = Request & { userId: string };
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly jwt: JwtService, private readonly db: PrismaService) {}
  async canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const [scheme, token] = request.headers.authorization?.split(" ") ?? [];
    if (scheme !== "Bearer" || !token) throw new UnauthorizedException();
    try {
      const payload = await this.jwt.verifyAsync<{ sub: string; ver: number }>(token);
      if (typeof payload.sub !== "string" || !Number.isSafeInteger(payload.ver)) throw new Error("Invalid session");
      const user = await this.db.user.findUnique({ where: { id: payload.sub }, select: { active: true, tokenVersion: true } });
      if (!user?.active || user.tokenVersion !== payload.ver) throw new Error("Revoked session");
      request.userId = payload.sub;
      return true;
    } catch {
      throw new UnauthorizedException("Please log in again.");
    }
  }
}
export const UserId = createParamDecorator(
  (_: unknown, ctx: ExecutionContext) =>
    ctx.switchToHttp().getRequest<AuthRequest>().userId,
);
