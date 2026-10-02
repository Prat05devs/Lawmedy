import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from "@nestjs/common";
import { PrismaService } from "./prisma.service";
import { DocumentsService } from "./documents/documents.service";
import { EvidenceService } from "./evidence/evidence.service";
import { FinalDocumentService } from "./final-document/final-document.service";

const MINUTE = 60_000;
const BATCH = 5;
// A matter whose AI work keeps failing is left for a manual retry instead of looping forever.
const MAX_FAILED_RUNS = 3;
const FAILURE_WINDOW_MINUTES = 120;
const DRAFT_TASKS = ["NOTICE_GENERATION", "NOTICE_QA", "RTI_GENERATION", "RTI_QA"] as const;

// Background work (drafting, reading uploads, rendering PDFs) starts after the HTTP response.
// A deploy or a free-instance restart can kill it midway, leaving a matter waiting forever.
// This sweep re-triggers interrupted work. Each step goes through the service's own claim
// logic, so a task that is genuinely still running is never started twice.
@Injectable()
export class RecoveryService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(RecoveryService.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly db: PrismaService,
    private readonly documents: DocumentsService,
    private readonly evidence: EvidenceService,
    private readonly finalDocuments: FinalDocumentService,
  ) {}

  onApplicationBootstrap() {
    setTimeout(() => void this.sweep(), 20_000).unref();
    this.timer = setInterval(() => void this.sweep(), 5 * MINUTE);
    this.timer.unref();
  }
  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  // force=true (admin action) ignores the failure cap and retries everything that is stuck.
  async sweep(force = false) {
    if (this.running) return { recovered: 0, skipped: true };
    this.running = true;
    let recovered = 0;
    try {
      const now = Date.now();
      const ago = (minutes: number) => new Date(now - minutes * MINUTE);

      const drafts = await this.db.matter.findMany({
        where: { OR: [{ status: "PAID", updatedAt: { lt: ago(2) } }, { status: "AI_PROCESSING", updatedAt: { lt: ago(5) } }] },
        select: { id: true },
        orderBy: { updatedAt: "asc" },
        take: BATCH,
      });
      for (const { id } of drafts) {
        const failures = await this.db.aiRun.count({
          where: { matterId: id, taskType: { in: [...DRAFT_TASKS] }, status: "FAILED", createdAt: { gt: ago(FAILURE_WINDOW_MINUTES) } },
        });
        if (!force && failures >= MAX_FAILED_RUNS) {
          this.logger.warn(`Not retrying draft for matter ${id}: ${failures} failed runs in the last ${FAILURE_WINDOW_MINUTES} minutes. Use the admin recover action or the user retry.`);
          continue;
        }
        recovered++;
        this.logger.warn(`Recovering draft generation for matter ${id}`);
        await this.documents.generateAfterPayment(id).catch((error: unknown) => this.logger.error(`Draft recovery failed for ${id}`, error instanceof Error ? error.message : String(error)));
      }

      const files = await this.db.evidence.findMany({
        where: { status: "PROCESSING", createdAt: { lt: ago(3) } },
        select: { id: true, matterId: true, uploadedBy: true },
        orderBy: { createdAt: "asc" },
        take: BATCH,
      });
      for (const file of files) {
        const live = await this.db.aiRun.findFirst({
          where: { taskType: "EVIDENCE_EXTRACTION", inputReference: file.id, status: "RUNNING", expiresAt: { gt: new Date() } },
          select: { id: true },
        });
        if (live) continue;
        const failures = await this.db.aiRun.count({
          where: { taskType: "EVIDENCE_EXTRACTION", inputReference: file.id, status: "FAILED", createdAt: { gt: ago(FAILURE_WINDOW_MINUTES) } },
        });
        if (!force && failures >= MAX_FAILED_RUNS) continue;
        recovered++;
        this.logger.warn(`Recovering evidence processing for ${file.id}`);
        await this.evidence.process(file.uploadedBy, file.matterId, file.id).catch((error: unknown) => this.logger.error(`Evidence recovery failed for ${file.id}`, error instanceof Error ? error.message : String(error)));
      }

      const approved = await this.db.matter.findMany({
        where: { status: "APPROVED", updatedAt: { lt: ago(3) }, finalDocument: null },
        select: { id: true },
        orderBy: { updatedAt: "asc" },
        take: BATCH,
      });
      for (const { id } of approved) {
        recovered++;
        this.logger.warn(`Recovering final PDF for matter ${id}`);
        await this.finalDocuments.generateAndDeliver(id).catch((error: unknown) => this.logger.error(`Final PDF recovery failed for ${id}`, error instanceof Error ? error.message : String(error)));
      }
    } finally {
      this.running = false;
    }
    return { recovered, skipped: false };
  }
}
