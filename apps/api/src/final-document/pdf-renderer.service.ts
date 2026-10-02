import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { pathToFileURL } from "node:url";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

@Injectable()
export class PdfRendererService {
  constructor(private readonly config: ConfigService) {}

  private executablePath() {
    const configured = this.config
      .get<string>("CHROMIUM_EXECUTABLE_PATH", "")
      .trim();
    const candidates = [
      configured,
      process.platform === "win32"
        ? "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe"
        : "/usr/bin/google-chrome",
      process.platform === "win32"
        ? "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe"
        : "/usr/bin/chromium",
      "/usr/bin/chromium-browser",
      "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
      "/Applications/Chromium.app/Contents/MacOS/Chromium",
      "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
      "/Applications/Brave Browser.app/Contents/MacOS/Brave Browser",
    ].filter(Boolean);
    const found = candidates.find((candidate) => existsSync(candidate));
    if (!found)
      throw new Error(
        "PDF_RENDERER_NOT_CONFIGURED: set CHROMIUM_EXECUTABLE_PATH",
      );
    return found;
  }

  async render(html: string) {
    const directory = await mkdtemp(path.join(tmpdir(), "lawmedy-pdf-"));
    const source = path.join(directory, "notice.html");
    const output = path.join(directory, "notice.pdf");
    try {
      await writeFile(source, html, "utf8");
      await execFileAsync(
        this.executablePath(),
        [
          "--headless=new",
          "--disable-gpu",
          "--no-sandbox",
          "--disable-extensions",
          "--no-pdf-header-footer",
          "--print-to-pdf-no-header",
          `--user-data-dir=${path.join(directory, "chrome-profile")}`,
          `--print-to-pdf=${output}`,
          pathToFileURL(source).href,
        ],
        { timeout: 30000, windowsHide: true },
      );
      for (let attempt = 0; attempt < 100; attempt += 1) {
        try {
          const pdf = await readFile(output);
          if (pdf.subarray(0, 5).toString("ascii") === "%PDF-") return pdf;
        } catch (error) {
          if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error;
        }
        await delay(100);
      }
      throw new Error("PDF_RENDER_TIMEOUT");
    } finally {
      await rm(directory, { recursive: true, force: true }).catch(() => undefined);
    }
  }
}
