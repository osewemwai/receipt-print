/// <reference types="vite/client" />
const BASE = import.meta.env.VITE_PRINT_AGENT_URL || "http://localhost:3333";

interface AgentStatus {
  ok: boolean;
  error?: string;
  version?: string;
  platform?: string;
  hostname?: string;
  printers?: number;
  defaultPrinter?: string | null;
}

interface Printer {
  name: string;
  status: string;
  enabled: boolean;
  isDefault: boolean;
}

interface PrintersResponse {
  printers: Printer[];
  defaultName: string | null;
  error?: string;
}

interface PrintDimensions {
  widthMm: number;
  heightMm: number;
}

interface PrintPdfParams {
  base64: string;
  printerName?: string;
  copies?: number;
  dimensions?: Partial<PrintDimensions>;
}

interface DownloadPdfParams {
  base64: string;
  filename?: string;
}

export type JobStatus =
  | "queued"
  | "processing"
  | "completed"
  | "error"
  | "unknown";

export interface JobRecord {
  id: string;
  printerName?: string;
  createdAt: number;
  updatedAt: number;
  status: JobStatus;
  detail?: string;
  command?: string;
  error?: string;
  // If job was not tracked server-side, this flag may be present in responses from /jobs/:id
  tracked?: boolean;
}

export interface PrintResponse {
  ok: boolean;
  filePath?: string;
  result?: { ok: boolean; command: string; detail: string };
  jobId?: string | null;
  job?: JobRecord;
  error?: string;
}

export async function getAgentStatus(
  signal?: AbortSignal
): Promise<AgentStatus> {
  try {
    const res = await fetch(`${BASE}/status`, { signal });
    if (!res.ok) throw new Error(`Agent /status error: ${res.status}`);
    return await res.json();
  } catch (e) {
    return { ok: false, error: (e as Error).message };
  }
}

export async function getPrinters(
  signal?: AbortSignal
): Promise<PrintersResponse> {
  try {
    const res = await fetch(`${BASE}/printers`, { signal });
    if (!res.ok) throw new Error(`Agent /printers error: ${res.status}`);
    return await res.json();
  } catch (e) {
    return { printers: [], defaultName: null, error: (e as Error).message };
  }
}

export async function printPdf(
  { base64, printerName, copies = 1, dimensions }: PrintPdfParams,
  signal?: AbortSignal
): Promise<any> {
  const body = {
    jobType: "pdf",
    data: base64,
    printerName,
    options: {
      copies,
      widthMm: dimensions?.widthMm ?? 80,
      heightMm: dimensions?.heightMm ?? 200,
    },
  };
  const res = await fetch(`${BASE}/print`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Agent /print error: ${res.status} ${msg}`);
  }
  const data: PrintResponse = await res.json();
  return data;
}

export async function downloadPdf(
  { base64, filename = "receipt.pdf" }: DownloadPdfParams,
  signal?: AbortSignal
): Promise<{ success: boolean }> {
  const body = {
    data: base64,
    filename,
  };
  const res = await fetch(`${BASE}/download-pdf`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Agent /download-pdf error: ${res.status} ${msg}`);
  }

  // Create download from response
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return { success: true };
}

export async function getJob(
  jobId: string,
  signal?: AbortSignal
): Promise<JobRecord> {
  const res = await fetch(`${BASE}/jobs/${encodeURIComponent(jobId)}`, {
    signal,
  });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Agent /jobs/${jobId} error: ${res.status} ${msg}`);
  }
  return res.json();
}

export async function getJobs(
  signal?: AbortSignal
): Promise<{ jobs: JobRecord[] }> {
  const res = await fetch(`${BASE}/jobs`, { signal });
  if (!res.ok) {
    const msg = await res.text();
    throw new Error(`Agent /jobs error: ${res.status} ${msg}`);
  }
  return res.json();
}
