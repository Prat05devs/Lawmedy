import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  SetMetadata,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import type { UserRole } from "@prisma/client";
import type { AuthRequest } from "./auth.guard";
import { PrismaService } from "./prisma.service";

const ROLES_KEY = "lawmedy_roles";
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly db: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext) {
    const roles = this.reflector.getAllAndOverride<UserRole[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!roles?.length) return true;
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const user = await this.db.user.findUnique({
      where: { id: request.userId },
      select: { role: true, active: true },
    });
    if (!user || !user.active || !roles.includes(user.role))
      throw new ForbiddenException("You do not have access to this area.");
    return true;
  }
}
