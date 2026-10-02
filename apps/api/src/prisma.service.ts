import { Injectable, OnModuleInit, OnModuleDestroy } from "@nestjs/common";
import { PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor() {
    // The database is remote (Supabase), so each query costs a network round trip.
    // Prisma's 5s default for interactive transactions is too tight for multi-step writes.
    super({ transactionOptions: { maxWait: 10000, timeout: 30000 } });
  }
  async onModuleInit() {
    await this.$connect();
  }
  async onModuleDestroy() {
    await this.$disconnect();
  }
}
