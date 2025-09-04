import { forwardRef } from "react";
import { Receipt } from "../lib/fakeReceipt";

interface ReceiptPreviewProps {
  data: Receipt;
}

function formatMoney(n: number, currency: string = "USD"): string {
  try {
    return new Intl.NumberFormat(undefined, {
      style: "currency",
      currency,
    }).format(n);
  } catch {
    return `$${n.toFixed(2)}`;
  }
}

const ReceiptPreview = forwardRef<HTMLDivElement, ReceiptPreviewProps>(
  function ReceiptPreview({ data }, ref) {
    if (!data) {
      return (
        <div className="receipt w-80mm max-w-80mm min-w-80mm p-2 bg-white border border-gray-200 font-mono text-xs leading-tight text-black">
          <div className="text-center text-gray-500">No receipt data yet</div>
        </div>
      );
    }

    const {
      store,
      cashierName,
      receiptNumber,
      currency,
      timestamp,
      items,
      subtotal,
      taxRate,
      tax,
      total,
      paidAmount,
      change,
    } = data;

    return (
      <div
        ref={ref}
        className="receipt w-[360px] max-w-[360px] min-w-[360px] p-3 bg-white border border-gray-200 font-mono text-sm leading-tight text-black md:w-[420px] md:max-w-[420px] md:min-w-[420px]"
      >
        {/* Header */}
        <div className="text-center mb-2">
          <div className="text-base font-bold">
            {store.name || "Store Name"}
          </div>
          <div>{store.address1}</div>
          <div>{store.address2}</div>
          <div>{store.phone}</div>
        </div>

        <hr className="border-t border-dashed border-gray-400 my-2" />

        {/* Receipt Info */}
        <div className="mb-2">
          <div>Receipt: {receiptNumber || "N/A"}</div>
          <div>Cashier: {cashierName || "N/A"}</div>
          <div>Date: {new Date(timestamp).toLocaleString()}</div>
        </div>

        <hr className="border-t border-dashed border-gray-400 my-2" />

        {/* Items */}
        {items.length > 0 ? (
          <div className="mb-2">
            {items.map((item) => (
              <div key={item.id} className="mb-1">
                <div className="flex justify-between">
                  <span>{item.name}</span>
                  <span>{formatMoney(item.totalPrice, currency)}</span>
                </div>
                <div className="text-gray-500 text-xs">
                  {item.quantity} x {formatMoney(item.unitPrice, currency)}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center text-gray-500 mb-2">No items</div>
        )}

        <hr className="border-t border-dashed border-gray-400 my-2" />

        {/* Totals */}
        <div className="space-y-1">
          <div className="flex justify-between">
            <span>Subtotal:</span>
            <span>{formatMoney(subtotal, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span>Tax ({(taxRate * 100).toFixed(1)}%):</span>
            <span>{formatMoney(tax, currency)}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Total:</span>
            <span>{formatMoney(total, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span>Paid:</span>
            <span>{formatMoney(paidAmount, currency)}</span>
          </div>
          <div className="flex justify-between">
            <span>Change:</span>
            <span>{formatMoney(change, currency)}</span>
          </div>
        </div>

        <hr className="border-t border-dashed border-gray-400 my-2" />

        <div className="text-center text-xs text-gray-500">
          Thank you for your business!
        </div>
      </div>
    );
  }
);

export default ReceiptPreview;
