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
