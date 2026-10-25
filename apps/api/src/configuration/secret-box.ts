import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

export class SecretBox {
  private readonly key: Buffer;
  constructor(hex: string) {
    if (!/^[a-f0-9]{64}$/i.test(hex))
      throw new Error(
        "CONFIG_ENCRYPTION_KEY must be 32 random bytes encoded as 64 hex characters.",
      );
    this.key = Buffer.from(hex, "hex");
  }
  seal(value: unknown, context: string) {
    const iv = randomBytes(12);
    const cipher = createCipheriv("aes-256-gcm", this.key, iv);
    cipher.setAAD(Buffer.from(context));
    const encrypted = Buffer.concat([
      cipher.update(JSON.stringify(value), "utf8"),
      cipher.final(),
    ]);
    return [
      "v1",
      iv.toString("base64"),
      cipher.getAuthTag().toString("base64"),
      encrypted.toString("base64"),
    ].join(":");
  }
  open<T>(value: string, context: string): T {
    const [version, iv, tag, encrypted] = value.split(":");
    if (version !== "v1" || !iv || !tag || !encrypted)
      throw new Error("Invalid encrypted configuration.");
    const decipher = createDecipheriv(
      "aes-256-gcm",
      this.key,
      Buffer.from(iv, "base64"),
    );
    decipher.setAAD(Buffer.from(context));
    decipher.setAuthTag(Buffer.from(tag, "base64"));
    return JSON.parse(
      Buffer.concat([
        decipher.update(Buffer.from(encrypted, "base64")),
        decipher.final(),
      ]).toString("utf8"),
    ) as T;
  }
}
