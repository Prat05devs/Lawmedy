import { SecretBox } from "./secret-box";
describe("Provider secret encryption", () => {
  const box = new SecretBox("ab".repeat(32));
  it("encrypts with a fresh nonce and authenticates the credential identity", () => {
    const secret = { apiKey: "secret-value-never-returned" };
    const encrypted = box.seal(secret, "credential-1:GEMINI:");
    expect(encrypted).not.toContain(secret.apiKey);
    expect(box.open(encrypted, "credential-1:GEMINI:")).toEqual(secret);
    expect(box.seal(secret, "credential-1:GEMINI:")).not.toEqual(encrypted);
    expect(() => box.open(encrypted, "credential-2:GEMINI:")).toThrow();
    expect(() =>
      new SecretBox("cd".repeat(32)).open(encrypted, "credential-1:GEMINI:"),
    ).toThrow();
  });
  it("rejects missing or malformed encryption keys", () => {
    expect(() => new SecretBox("")).toThrow();
    expect(() => new SecretBox("replace-with-a-key")).toThrow();
  });
});
