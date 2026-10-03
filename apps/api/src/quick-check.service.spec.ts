import { ServiceUnavailableException } from "@nestjs/common";
import { QuickCheckService } from "./quick-check.service";

describe("QuickCheckService", () => {
  const statement = "I lent Rahul Verma Rs 2,00,000 on 5 March 2026 by bank transfer and he has not repaid.";
  const analysis = { category: "MONEY_RECOVERY", summary: "Unpaid loan.", facts: [{ key: "borrower", value: "Rahul Verma", sourceQuote: "Rahul Verma" }], missingInformation: [{ field: "RECIPIENT_ADDRESS", question: "What is his address?" }, { field: "AGREEMENT", question: "Is there anything in writing?" }] };
  const build = (classify: jest.Mock, configured = true) => {
    const db = { aiRun: { create: jest.fn().mockResolvedValue({ id: "r1" }), update: jest.fn().mockResolvedValue({}) } };
    const gemini = { configured: () => configured, settings: () => ({ provider: "gemini", modelName: "m" }), classify };
    return { db, service: new QuickCheckService(db as never, gemini as never) };
  };

  it("returns what we understood and logs the run without a matter or the raw statement", async () => {
    const { db, service } = build(jest.fn().mockResolvedValue({ text: JSON.stringify(analysis), inputTokens: 10, outputTokens: 20 }));
    const result = await service.run(statement, "LEGAL_NOTICE");
    expect(result).toMatchObject({ document: "Legal notice", category: "MONEY_RECOVERY", needed: ["What is his address?", "Is there anything in writing?"] });
    expect(result.facts).toEqual([{ key: "borrower", value: "Rahul Verma" }]);
    const created = db.aiRun.create.mock.calls[0][0].data;
    expect(created.matterId).toBeNull();
    expect(JSON.stringify(created)).not.toContain("Rahul");
  });

  it("fails politely and records the failure when the AI is unavailable", async () => {
    const { db, service } = build(jest.fn().mockRejectedValue(new Error("503")));
    await expect(service.run(statement, "RTI")).rejects.toBeInstanceOf(ServiceUnavailableException);
    expect(db.aiRun.update.mock.calls[0][0].data.status).toBe("FAILED");
  });
});
