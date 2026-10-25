import { lastValueFrom, of, Subject, throwError } from "rxjs";
import { OperationsMetrics, UploadCapacity } from "./operations";
import { EventEmitter } from "node:events";

describe("bounded operations metrics", () => {
  it("counts a complete stream once and releases its active slot", async () => {
    const metrics = new OperationsMetrics();
    await lastValueFrom(metrics.intercept({} as never, { handle: () => of(1, 2) }));
    expect(metrics.snapshot()).toMatchObject({ requests: 1, activeRequests: 0, peakActiveRequests: 1, failedRequests: 0 });
  });
  it("records an application error without retaining request data", async () => {
    const metrics = new OperationsMetrics();
    await expect(lastValueFrom(metrics.intercept({} as never, { handle: () => throwError(() => new Error("private detail")) }))).rejects.toThrow();
    expect(metrics.snapshot()).toMatchObject({ requests: 1, failedRequests: 1, activeRequests: 0 });
    expect(JSON.stringify(metrics.snapshot())).not.toContain("private detail");
  });
});

describe("multipart admission", () => {
  it("rejects a third upload before buffering and releases slots on failure or cancellation", () => {
    const limiter = new UploadCapacity();
    const setHeader = jest.fn();
    const request = Object.assign(new EventEmitter(), { headers: { "content-type": "multipart/form-data; boundary=test" } });
    const response = Object.assign(new EventEmitter(), { setHeader });
    const context = { switchToHttp: () => ({ getRequest: () => request, getResponse: () => response }) };
    const stream = new Subject();
    const next = { handle: () => stream };
    const a = limiter.intercept(context as never, next).subscribe();
    const b = limiter.intercept(context as never, next).subscribe();
    expect(() => limiter.intercept(context as never, next)).toThrow("Uploads are busy");
    expect(setHeader).toHaveBeenCalledWith("Retry-After", "2");
    a.unsubscribe();
    const c = limiter.intercept(context as never, next).subscribe();
    b.unsubscribe(); c.unsubscribe();
    expect(() => limiter.intercept(context as never, next)).not.toThrow();
  });
});
