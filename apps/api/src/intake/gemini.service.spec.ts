import { generationContents } from "./gemini.service";

describe("Gemini document generation inputs", () => {
  it("includes supporting file bytes and identifies the source alongside structured facts", () => {
    const documentBytes = Buffer.from("%PDF-test-document");
    const contents = generationContents(
      { confirmedFacts: [{ id: "fact-1", value: "₹50,000" }] },
      [{ id: "evidence-1", filename: "transfer.pdf", mimeType: "application/pdf", contents: documentBytes }],
    );

    expect(contents).toHaveLength(1);
    expect(contents[0].role).toBe("user");
    expect(contents[0].parts[0]).toEqual({
      text: JSON.stringify({ confirmedFacts: [{ id: "fact-1", value: "₹50,000" }] }),
    });
    expect((contents[0].parts[1] as { text: string }).text).toContain("evidence-1");
    expect((contents[0].parts[2] as { inlineData: unknown }).inlineData).toEqual({
      mimeType: "application/pdf",
      data: documentBytes.toString("base64"),
    });
  });

  it("keeps generation valid when no supporting files were uploaded", () => {
    expect(generationContents({ confirmedFacts: [] })[0].parts).toEqual([
      { text: JSON.stringify({ confirmedFacts: [] }) },
    ]);
  });
});