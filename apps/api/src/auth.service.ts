import {
  BadRequestException,
  ConflictException,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Prisma } from "@prisma/client";
import * as bcrypt from "bcrypt";
import { ConfigService } from "@nestjs/config";
import { randomBytes } from "node:crypto";
import { PrismaService } from "./prisma.service";
import { LoginDto, SignupDto } from "./dto";

export const publicUser = {
  id: true,
  email: true,
  fullName: true,
  role: true,
  createdAt: true,
} as const;
@Injectable()
export class AuthService {
  constructor(
    private readonly db: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async signup(dto: SignupDto) {
    if (Buffer.byteLength(dto.password, "utf8") > 72)
      throw new BadRequestException("Password must be at most 72 UTF-8 bytes.");
    const passwordHash = await bcrypt.hash(dto.password, 12);
    try {
      const user = await this.db.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: { email: dto.email, fullName: dto.fullName, passwordHash },
          select: publicUser,
        });
        await tx.auditLog.create({
          data: {
            actorId: created.id,
            action: "SIGNUP",
            entityType: "User",
            entityId: created.id,
          },
        });
        return created;
      });
      return { user, accessToken: await this.jwt.signAsync({ sub: user.id }) };
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      )
        throw new ConflictException(
          "An account with this email already exists.",
        );
      throw error;
    }
  }

  async login(dto: LoginDto) {
    const user = await this.db.user.findUnique({ where: { email: dto.email } });
    // Use a real bcrypt comparison even for unknown users to reduce timing differences.
    const hash =
      user?.passwordHash ??
      "$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW";
    const valid = await bcrypt.compare(dto.password, hash);
    if (!user || !user.active || !valid || Buffer.byteLength(dto.password, "utf8") > 72)
      throw new UnauthorizedException("Email or password is incorrect.");
    await this.db.auditLog.create({
      data: {
        actorId: user.id,
        action: "LOGIN",
        entityType: "User",
        entityId: user.id,
      },
    });
    return {
      accessToken: await this.jwt.signAsync({ sub: user.id }),
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        createdAt: user.createdAt,
      },
    };
  }

  // Sign in with a Google ID token obtained natively by the web or mobile app.
  async google(idToken: string) {
    const audiences = this.config.get<string>("GOOGLE_CLIENT_IDS", "").split(",").map((id) => id.trim()).filter((id) => id && !id.startsWith("replace-"));
    if (!audiences.length) throw new ServiceUnavailableException("Google sign-in is not configured yet.");
    let info: { aud?: string; iss?: string; email?: string; email_verified?: string | boolean; name?: string; exp?: string };
    try {
      const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) throw new Error("rejected");
      info = (await response.json()) as typeof info;
    } catch {
      throw new UnauthorizedException("Google sign-in could not be verified.");
    }
    const issuerOk = info.iss === "accounts.google.com" || info.iss === "https://accounts.google.com";
    if (!issuerOk || !info.aud || !audiences.includes(info.aud) || !info.email || String(info.email_verified) !== "true")
      throw new UnauthorizedException("Google sign-in could not be verified.");
    const email = info.email.trim().toLowerCase();
    let user = await this.db.user.findUnique({ where: { email } });
    if (!user) {
      // Google accounts have no password; store a hash nobody knows.
      const passwordHash = await bcrypt.hash(randomBytes(32).toString("hex"), 12);
      user = await this.db.user.create({ data: { email, fullName: (info.name || email.split("@")[0]).slice(0, 100), passwordHash } });
    }
    await this.db.auditLog.create({ data: { actorId: user.id, action: "LOGIN_GOOGLE", entityType: "User", entityId: user.id } });
    return {
      accessToken: await this.jwt.signAsync({ sub: user.id }),
      user: { id: user.id, email: user.email, fullName: user.fullName, role: user.role, createdAt: user.createdAt },
    };
  }

  async me(id: string) {
    const user = await this.db.user.findUnique({
      where: { id },
      select: publicUser,
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
