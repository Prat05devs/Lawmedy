import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Prisma } from "@prisma/client";
import * as bcrypt from "bcrypt";
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
    if (!user || !valid || Buffer.byteLength(dto.password, "utf8") > 72)
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

  async me(id: string) {
    const user = await this.db.user.findUnique({
      where: { id },
      select: publicUser,
    });
    if (!user) throw new UnauthorizedException();
    return user;
  }
}
