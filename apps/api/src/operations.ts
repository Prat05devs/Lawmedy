import { CallHandler, ExecutionContext, Injectable, NestInterceptor, ServiceUnavailableException } from "@nestjs/common";
import { Observable, defer, finalize, tap } from "rxjs";
import type { IncomingMessage, ServerResponse } from "node:http";

// Bounded, per-process aggregates only: no URLs with IDs, bodies, users or tokens.
@Injectable()
export class OperationsMetrics implements NestInterceptor {
  private requests = 0;
  private errors = 0;
  private active = 0;
  private peak = 0;
  private readonly bounds = [25, 50, 100, 250, 500, 1000, 2000, 5000, 15000, Infinity];
  private readonly histogram = this.bounds.map(() => 0);
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const started = performance.now();
    this.active++; this.peak = Math.max(this.peak, this.active);
    let failed = false;
    const finish = () => {
      this.active--; this.requests++;
      if (failed) this.errors++;
      this.histogram[this.bounds.findIndex((limit) => performance.now() - started <= limit)]++;
    };
    return next.handle().pipe(tap({ error: () => { failed = true; } }), finalize(finish));
  }
  snapshot() {
    const memory = process.memoryUsage();
    let count = 0;
    const index = this.histogram.findIndex((n) => { count += n; return count >= this.requests * 0.95; });
    return { uptimeSeconds: Math.floor(process.uptime()), requests: this.requests, failedRequests: this.errors,
      activeRequests: this.active, peakActiveRequests: this.peak,
      p95UpperBoundMs: this.requests ? Number.isFinite(this.bounds[index]) ? this.bounds[index] : null : null,
      rssBytes: memory.rss, heapUsedBytes: memory.heapUsed, heapTotalBytes: memory.heapTotal,
      scope: "single API process; resets on restart" };
  }
}

// Global interceptors run before route-level Multer buffering. Fail promptly
// instead of retaining hundreds of 10 MB multipart bodies on a small API host.
@Injectable()
export class UploadCapacity implements NestInterceptor {
  private active = 0;
  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<IncomingMessage>();
    if (!request.headers["content-type"]?.toLowerCase().startsWith("multipart/form-data")) return next.handle();
    if (this.active >= 2) {
      context.switchToHttp().getResponse<ServerResponse>().setHeader("Retry-After", "2");
      throw new ServiceUnavailableException("Uploads are busy. Please try again in a few seconds.");
    }
    this.active++;
    const response = context.switchToHttp().getResponse<ServerResponse>();
    let released = false;
    const release = () => {
      if (released) return;
      released = true; this.active--;
      request.off("aborted", release); response.off("close", release);
    };
    request.once("aborted", release); response.once("close", release);
    return defer(() => next.handle()).pipe(finalize(release));
  }
}
