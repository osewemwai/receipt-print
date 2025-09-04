import { useMemo, useRef, useState, FormEvent } from "react";
import ReceiptPreview from "../components/ReceiptPreview";
import { generateFakeReceipt, Receipt } from "../lib/fakeReceipt";
import { captureElementToPdfBase64 } from "../lib/printService";
import { getJob, printPdf, type JobRecord } from "../lib/printClient";
import PrinterStatus from "../components/PrinterStatus";

const emptyForm: Receipt = {
  store: { name: "", address1: "", address2: "", phone: "" },
  cashierName: "",
  receiptNumber: "",
  currency: "USD",
  timestamp: new Date().toISOString(),
  items: [],
  subtotal: 0,
  taxRate: 0.07,
  tax: 0,
  total: 0,
  paidAmount: 0,
  change: 0,
};

function ReceiptForm() {
  const [data, setData] = useState<Receipt>(emptyForm);
  const [printing, setPrinting] = useState(false);
  const [printError, setPrintError] = useState("");
  const [job, setJob] = useState<JobRecord | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  function handleInputChange(field: string, value: string | number) {
    setData((prev) => ({ ...prev, [field]: value }));
  }

  function handleStoreChange(field: string, value: string) {
    setData((prev) => ({
      ...prev,
      store: { ...prev.store, [field]: value },
    }));
  }

  function generateFakeData() {
    const fake = generateFakeReceipt();
    setData(fake);
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setPrintError("");
    setPrinting(true);
    try {
      // Capture visible preview into a PDF and send to agent
      const el = previewRef.current;
      if (!el) throw new Error("Preview element not found");

      const result = await captureElementToPdfBase64(el);
      const resp = await printPdf({
        base64: result.base64,
        dimensions: result.dimensions,
        copies: 1,
      });
      if (resp?.jobId) {
        setJob(
          resp.job ||
            ({
              id: resp.jobId,
              status: "queued",
              createdAt: Date.now(),
              updatedAt: Date.now(),
            } as JobRecord)
        );
        // Poll job until it completes or errors
        await new Promise<void>((resolve) => {
          let cancelled = false;
          const tick = async () => {
            if (cancelled || !resp.jobId) return;
            try {
              const j = await getJob(resp.jobId!);
              setJob(j);
              if (j.status === "completed" || j.status === "error") {
                resolve();
                return;
              }
            } catch {
              // keep trying briefly
            }
            setTimeout(tick, 1500);
          };
          tick();
          // safety timeout
          setTimeout(() => {
            resolve();
          }, 2 * 60 * 1000);
          return () => {
            cancelled = true;
          };
        });
      }
    } catch (err) {
      console.error(err);
      setPrintError((err as Error).message || "Failed to print");
    } finally {
      setPrinting(false);
    }
  }

  const previewData = useMemo(() => data, [data]);

  return (
    <div className="flex gap-6 max-w-7xl mx-auto">
      <form
        className="flex-1 bg-white rounded-lg shadow-sm border p-6"
        onSubmit={handleSubmit}
      >
        <h2 className="text-xl font-semibold text-gray-900 mb-6">
          Receipt Composer
        </h2>

        <div className="space-y-6">
          {/* Store Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Store Information
            </h3>
            <div className="grid grid-cols-1 gap-4">
              <input
                type="text"
                placeholder="Store Name"
                value={data.store.name}
                onChange={(e) => handleStoreChange("name", e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
              />
              <input
                type="text"
                placeholder="Address Line 1"
                value={data.store.address1}
                onChange={(e) => handleStoreChange("address1", e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
              />
              <input
                type="text"
                placeholder="Address Line 2"
                value={data.store.address2}
                onChange={(e) => handleStoreChange("address2", e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
              />
              <input
                type="text"
                placeholder="Phone"
                value={data.store.phone}
                onChange={(e) => handleStoreChange("phone", e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
              />
            </div>
          </div>

          {/* Receipt Details */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-3">
              Receipt Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <input
                type="text"
                placeholder="Cashier Name"
                value={data.cashierName}
                onChange={(e) =>
                  handleInputChange("cashierName", e.target.value)
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
              />
              <input
                type="text"
                placeholder="Receipt Number"
                value={data.receiptNumber}
                onChange={(e) =>
                  handleInputChange("receiptNumber", e.target.value)
                }
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 px-3 py-2 border"
              />
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              type="button"
              onClick={generateFakeData}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Generate Fake Data
            </button>
            <button
              type="submit"
              disabled={printing}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {printing ? "Printing..." : "Print Receipt"}
            </button>
          </div>

          {job && (
            <div className="p-3 text-sm border rounded-md mt-2 ">
              <div className="flex items-center gap-2">
                <span
                  className={`w-2 h-2 rounded-full ${
                    job.status === "completed"
                      ? "bg-green-500"
                      : job.status === "error"
                      ? "bg-red-500"
                      : "bg-amber-400"
                  }`}
                ></span>
                <span className="text-gray-800">
                  Print job {job.id} — {job.status}
                </span>
              </div>
              {job.error && (
                <div className="text-red-700 mt-1">{job.error}</div>
              )}
            </div>
          )}

          {printError && (
            <div className="p-3 text-sm text-red-700 bg-red-50 border border-red-200 rounded-md">
              {printError}
            </div>
          )}
        </div>

        <div className="mt-6">
          <PrinterStatus />
        </div>
      </form>

      <div className="flex-1">
        <div ref={previewRef} className="capture-safe">
          <ReceiptPreview data={previewData} />
        </div>
      </div>
    </div>
  );
}

export default ReceiptForm;
