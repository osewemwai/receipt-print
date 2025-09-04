import express, { Request, Response } from "express";
import cors from "cors";
import { exec } from "child_process";
import os from "os";
import fs from "fs";
import path from "path";

const PORT = process.env.PRINT_AGENT_PORT
  ? Number(process.env.PRINT_AGENT_PORT)
  : 3333;

interface ExecResult {
  stdout: string;
  stderr: string;
}

interface Printer {
  name: string;
  status: string;
  enabled: boolean;
  isDefault: boolean;
}

interface PrintersInfo {
  defaultName: string | null;
  printers: Printer[];
  error?: string;
}

interface PrintOptions {
  copies?: number;
  widthMm?: number;
  heightMm?: number;
}

interface PrintRequest {
  jobType?: string;
  data: string;
  printerName?: string;
  options?: PrintOptions;
}

interface DownloadRequest {
  data: string;
  filename?: string;
}

type JobStatus = "queued" | "processing" | "completed" | "error" | "unknown";

interface JobRecord {
  id: string;
  printerName?: string;
  createdAt: number;
  updatedAt: number;
  status: JobStatus;
  detail?: string;
  command?: string;
  error?: string;
}

const jobs = new Map<string, JobRecord>();

const app = express();
app.use(express.json({ limit: "20mb" }));
app.use(cors({ origin: true })); // In production, restrict origins

// Utilities
function execCmd(cmd: string): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    exec(cmd, { timeout: 15000 }, (error, stdout, stderr) => {
      if (error) return reject(Object.assign(error, { stdout, stderr }));
      resolve({ stdout, stderr });
    });
  });
}

async function getPrintersDarwin(): Promise<PrintersInfo> {
  // Uses CUPS via lpstat
  const { stdout } = await execCmd("lpstat -p -d");
  const lines = stdout
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);
  let defaultName: string | null = null;
  const printers: Printer[] = [];

  for (const line of lines) {
    if (line.startsWith("system default destination:")) {
      defaultName = line.replace("system default destination:", "").trim();
      continue;
    }
    if (line.startsWith("printer ")) {
      // Example: "printer HP_LaserJet is idle.  enabled since ..."
      const match = line.match(/^printer\s+(.+?)\s+is\s+([^\.]+)\./);
      const name = match ? match[1] : line.split(" ")[1];
      const status = match ? match[2].trim() : "unknown";
      const enabled = line.includes(" enabled ");
      printers.push({ name, status, enabled, isDefault: false });
    }
  }

  for (const p of printers) {
    p.isDefault = defaultName ? p.name === defaultName : false;
  }

  return { defaultName, printers };
}

async function getPrinters(): Promise<PrintersInfo> {
  const platform = process.platform;
  if (platform === "darwin" || platform === "linux") {
    try {
      return await getPrintersDarwin();
    } catch (e) {
      return { defaultName: null, printers: [], error: (e as Error).message };
    }
  } else if (platform === "win32") {
    // TODO: Implement Windows support via PowerShell Get-Printer
    return {
      defaultName: null,
      printers: [],
      error: "Windows printer status not implemented yet",
    };
  }
  return {
    defaultName: null,
    printers: [],
    error: `Unsupported platform: ${platform}`,
  };
}

function writeTempPdf(base64: string): string {
  const buf = Buffer.from(base64, "base64");
  const tmp = path.join(
    os.tmpdir(),
    `receipt-print-${Date.now()}-${Math.random().toString(16).slice(2)}.pdf`
  );
  fs.writeFileSync(tmp, buf);
  return tmp;
}

interface PrintPdfParams {
  printerName?: string;
  copies?: number;
  filePath: string;
  options?: PrintOptions;
}

async function printPdfDarwin({
  printerName,
  copies = 1,
  filePath,
  options = {},
}: PrintPdfParams): Promise<{ ok: boolean; command: string; detail: string }> {
  const quotedFile = `"${filePath.replace(/"/g, '\\"')}"`;
  const args: string[] = [];

  if (printerName) args.push("-d", `"${printerName.replace(/"/g, '\\"')}"`);
  if (copies && Number(copies) > 1) args.push("-n", String(Number(copies)));

  // Add CUPS options for exact thermal paper size (no scaling)
  const cupsOptions = ["fit-to-page=false", "print-scaling=none"];

  // Set exact thermal paper size using actual dimensions
  const thermalWidth = options.widthMm || 80;
  const thermalHeight = options.heightMm || 200;

  cupsOptions.push(`media=custom_${thermalWidth}x${thermalHeight}mm`);

  // Zero margins for exact positioning
  cupsOptions.push("page-left=0");
  cupsOptions.push("page-right=0");
  cupsOptions.push("page-top=0");
  cupsOptions.push("page-bottom=0");

  // Add all CUPS options as -o parameters
  cupsOptions.forEach((opt) => args.push("-o", opt));

  const lpCmd = ["lp", ...args, quotedFile].join(" ");
  try {
    const r = await execCmd(lpCmd);
    return { ok: true, command: lpCmd, detail: r.stdout.trim() };
  } catch (err) {
    // Fallback to lpr with same options
    const altArgs: string[] = [];
    if (printerName)
      altArgs.push("-P", `"${printerName.replace(/"/g, '\\"')}"`);
    if (copies && Number(copies) > 1)
      altArgs.push("-#", String(Number(copies)));

    // Add CUPS options to lpr as well
    cupsOptions.forEach((opt) => altArgs.push("-o", opt));

    const lprCmd = ["lpr", ...altArgs, quotedFile].join(" ");
    const r2 = await execCmd(lprCmd);
    return { ok: true, command: lprCmd, detail: r2.stdout.trim() };
  }
}

async function printPdf({
  printerName,
  copies = 1,
  filePath,
  options = {},
}: PrintPdfParams): Promise<{ ok: boolean; command: string; detail: string }> {
  const platform = process.platform;
  if (platform === "darwin" || platform === "linux") {
    return await printPdfDarwin({ printerName, copies, filePath, options });
  } else if (platform === "win32") {
    // TODO: Implement Windows printing (PowerShell: Start-Process -FilePath file -Verb Print -ArgumentList "-p \"printer\"")
    throw new Error("Windows printing not implemented yet");
  }
  throw new Error(`Unsupported platform: ${platform}`);
}

function parseCupsJobId(output: string): string | null {
  // Common lp output: "request id is PRINTER-NNN (1 file(s))"
  const m = output.match(/request id is\s+([^\s]+-\d+)/i);
  if (m) return m[1];
  // Some environments may output "job NNN" or similar
  const m2 = output.match(/(\S+-\d+)/);
  if (m2) return m2[1];
  return null;
}

async function queryJobStatusDarwin(jobId: string): Promise<JobStatus> {
  try {
    const { stdout } = await execCmd("lpstat -o");
    const line = stdout.split("\n").find((l) => l.includes(jobId));
    if (line) {
      const lower = line.toLowerCase();
      if (lower.includes("printing") || lower.includes("active"))
        return "processing";
      return "queued";
    }
    return "completed";
  } catch {
    // If lpstat fails, unknown status
    return "unknown";
  }
}

async function queryJobStatus(jobId: string): Promise<JobStatus> {
  const platform = process.platform;
  if (platform === "darwin" || platform === "linux")
    return queryJobStatusDarwin(jobId);
  return "unknown";
}

function startJobTracking(job: JobRecord): void {
  const maxMs = 2 * 60 * 1000; // 2 minutes
  const intervalMs = 1500;
  const started = Date.now();
  const timer = setInterval(async () => {
    const current = jobs.get(job.id);
    if (!current) {
      clearInterval(timer);
      return;
    }
    if (Date.now() - started > maxMs) {
      current.status = current.status === "completed" ? "completed" : "unknown";
      current.updatedAt = Date.now();
      jobs.set(current.id, current);
      clearInterval(timer);
      return;
    }
    try {
      const status = await queryJobStatus(job.id);
      current.status = status;
      current.updatedAt = Date.now();
      jobs.set(current.id, current);
      if (status === "completed") {
        clearInterval(timer);
      }
    } catch (e) {
      current.status = "error";
      current.error = (e as Error).message;
      current.updatedAt = Date.now();
      jobs.set(current.id, current);
      clearInterval(timer);
    }
  }, intervalMs);
}

// Routes
app.get("/status", async (req: Request, res: Response) => {
  const info = await getPrinters();
  res.json({
    ok: true,
    version: "0.1.0",
    platform: process.platform,
    hostname: os.hostname(),
    printers: info.printers.length,
    defaultPrinter: info.defaultName || null,
    error: info.error || null,
  });
});

app.get("/printers", async (req: Request, res: Response) => {
  try {
    const info = await getPrinters();
    res.json(info);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.post("/print", async (req: Request, res: Response) => {
  try {
    const {
      jobType = "pdf",
      data,
      printerName,
      options = {},
    }: PrintRequest = req.body || {};
    if (jobType !== "pdf")
      return res
        .status(400)
        .json({ error: "Only jobType=pdf supported for now" });
    if (!data)
      return res.status(400).json({ error: "Missing data (base64 pdf)" });

    const filePath = writeTempPdf(data);
    try {
      const result = await printPdf({
        printerName,
        copies: options.copies || 1,
        filePath,
        options,
      });
      const jobId = parseCupsJobId(result.detail);
      let job: JobRecord | undefined;
      if (jobId) {
        job = {
          id: jobId,
          printerName,
          createdAt: Date.now(),
          updatedAt: Date.now(),
          status: "queued",
          detail: result.detail,
          command: result.command,
        };
        jobs.set(jobId, job);
        // kick off polling
        startJobTracking(job);
      }
      res.json({ ok: true, filePath, result, jobId, job });
    } finally {
      // Clean up temp file (best-effort)
      try {
        fs.unlinkSync(filePath);
      } catch {}
    }
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

// Jobs API
app.get("/jobs", (req: Request, res: Response) => {
  const list = Array.from(jobs.values()).sort(
    (a, b) => b.createdAt - a.createdAt
  );
  res.json({ jobs: list });
});

app.get("/jobs/:id", async (req: Request, res: Response) => {
  const id = req.params.id;
  const existing = jobs.get(id);
  if (!existing) {
    // Best effort: try to query live status even if not tracked
    const status = await queryJobStatus(id);
    return res.json({ id, status, tracked: false });
  }
  res.json(existing);
});

app.post("/download-pdf", async (req: Request, res: Response) => {
  try {
    const { data, filename = "receipt.pdf" }: DownloadRequest = req.body || {};
    if (!data)
      return res.status(400).json({ error: "Missing data (base64 pdf)" });

    // Convert base64 to buffer
    const pdfBuffer = Buffer.from(data, "base64");

    // Set headers for PDF download
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    res.setHeader("Content-Length", pdfBuffer.length);

    // Send PDF buffer
    res.send(pdfBuffer);
  } catch (e) {
    res.status(500).json({ error: (e as Error).message });
  }
});

app.listen(PORT, () => {
  console.log(`[print-agent] listening on http://localhost:${PORT}`);
});
