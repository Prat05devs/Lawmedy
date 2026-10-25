import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";

export abstract class PrivateStorage {
  abstract put(key: string, contents: Buffer): Promise<void>;
  abstract read(key: string): Promise<Buffer>;
  abstract remove(key: string): Promise<void>;
}

@Injectable()
export class LocalPrivateStorage implements PrivateStorage {
  private readonly root: string;

  constructor(config: ConfigService) {
    this.root = path.resolve(
      config.get<string>("PRIVATE_STORAGE_DIR", ".local/private-files"),
    );
  }

  private resolve(key: string) {
    if (!/^[a-f0-9-]+\/[a-f0-9-]+$/.test(key))
      throw new Error("INVALID_STORAGE_KEY");
    const target = path.resolve(this.root, ...key.split("/"));
    if (!target.startsWith(`${this.root}${path.sep}`))
      throw new Error("INVALID_STORAGE_KEY");
    return target;
  }

  async put(key: string, contents: Buffer) {
    const target = this.resolve(key);
    await mkdir(path.dirname(target), { recursive: true, mode: 0o700 });
    await writeFile(target, contents, { flag: "wx", mode: 0o600 });
  }

  read(key: string) {
    return readFile(this.resolve(key));
  }

  async remove(key: string) {
    await rm(this.resolve(key), { force: true });
  }
}

// Supabase Storage (private bucket) over its REST API. Used when STORAGE_DRIVER=supabase,
// so uploads and final PDFs survive redeploys on hosts with an ephemeral disk.
@Injectable()
export class SupabasePrivateStorage implements PrivateStorage {
  private readonly base: string;
  private readonly bucket: string;
  private readonly key: string;

  constructor(config: ConfigService) {
    this.base = config.get<string>("SUPABASE_URL", "").replace(/\/$/, "");
    this.key = config.get<string>("SUPABASE_SERVICE_KEY", "").trim();
    this.bucket = config.get<string>("SUPABASE_BUCKET", "lawmedy-private");
    if (!this.base || !this.key) throw new Error("SUPABASE_URL and SUPABASE_SERVICE_KEY are required when STORAGE_DRIVER=supabase.");
  }

  private headers(extra: Record<string, string> = {}) {
    return { Authorization: `Bearer ${this.key}`, apikey: this.key, ...extra };
  }
  private url(key: string) {
    if (!/^[a-f0-9-]+\/[a-f0-9-]+$/.test(key)) throw new Error("INVALID_STORAGE_KEY");
    return `${this.base}/storage/v1/object/${this.bucket}/${key}`;
  }
  // An existing public bucket must never silently accept legal evidence. Recheck
  // before every read/write so a later configuration change fails closed too.
  private async ensureBucket() {
    const url = `${this.base}/storage/v1/bucket/${encodeURIComponent(this.bucket)}`;
    let response = await fetch(url, { headers: this.headers(), signal: AbortSignal.timeout(15000) });
    if (response.status === 404) {
      const created = await fetch(`${this.base}/storage/v1/bucket`, {
        method: "POST", headers: this.headers({ "Content-Type": "application/json" }),
        body: JSON.stringify({ id: this.bucket, name: this.bucket, public: false }), signal: AbortSignal.timeout(15000),
      });
      if (!created.ok && created.status !== 409) throw new Error("STORAGE_BUCKET_CREATION_FAILED");
      response = await fetch(url, { headers: this.headers(), signal: AbortSignal.timeout(15000) });
    }
    const bucket = await response.json().catch(() => null);
    if (!response.ok || bucket?.id !== this.bucket || bucket?.public !== false)
      throw new Error("STORAGE_BUCKET_MUST_BE_PRIVATE");
  }

  async put(key: string, contents: Buffer) {
    await this.ensureBucket();
    const response = await fetch(this.url(key), {
      method: "POST",
      headers: this.headers({ "Content-Type": "application/octet-stream", "x-upsert": "false" }),
      body: new Uint8Array(contents),
      signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`STORAGE_PUT_FAILED_${response.status}`);
  }

  async read(key: string) {
    await this.ensureBucket();
    const response = await fetch(this.url(key), { headers: this.headers(), signal: AbortSignal.timeout(30000) });
    if (!response.ok) throw new Error(`STORAGE_READ_FAILED_${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }

  async remove(key: string) {
    await fetch(this.url(key), { method: "DELETE", headers: this.headers(), signal: AbortSignal.timeout(15000) });
  }
}
