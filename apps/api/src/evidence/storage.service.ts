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
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, contents, { flag: "wx" });
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
  private ready: Promise<void> | null = null;

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
  // Creates the bucket as private the first time; a 400/409 means it already exists.
  private ensureBucket() {
    this.ready ??= fetch(`${this.base}/storage/v1/bucket`, {
      method: "POST",
      headers: this.headers({ "Content-Type": "application/json" }),
      body: JSON.stringify({ id: this.bucket, name: this.bucket, public: false }),
    }).then(async (response) => {
      if (!response.ok && response.status !== 400 && response.status !== 409)
        throw new Error(`STORAGE_BUCKET_FAILED_${response.status}`);
    });
    return this.ready;
  }

  async put(key: string, contents: Buffer) {
    await this.ensureBucket();
    const response = await fetch(this.url(key), {
      method: "POST",
      headers: this.headers({ "Content-Type": "application/octet-stream", "x-upsert": "false" }),
      body: new Uint8Array(contents),
    });
    if (!response.ok) throw new Error(`STORAGE_PUT_FAILED_${response.status}`);
  }

  async read(key: string) {
    const response = await fetch(this.url(key), { headers: this.headers() });
    if (!response.ok) throw new Error(`STORAGE_READ_FAILED_${response.status}`);
    return Buffer.from(await response.arrayBuffer());
  }

  async remove(key: string) {
    await fetch(this.url(key), { method: "DELETE", headers: this.headers() });
  }
}
