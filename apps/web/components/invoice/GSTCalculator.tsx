"use client";
import { useMemo } from "react";
import { calculateGST } from "../../../packages/gst-engine/src/calculator";
import type { LineItem, SupplyType } from "../../../packages/gst-engine/src/types";

interface Props {
  lineItems: LineItem[];
  supplyType: SupplyType;
  sellerStateCode?: string;
  buyerStateCode?: string;
}

export default function GSTCalculator({
  lineItems,
  supplyType,
  sellerStateCode = "29",
  buyerStateCode = "29",
}: Props) {
  const gst = useMemo(
    () => calculateGST(lineItems, supplyType, sellerStateCode, buyerStateCode),
    [lineItems, supplyType, sellerStateCode, buyerStateCode]
  );

  const inr = (n: number) =>
    "₹" + n.toLocaleString("en-IN", { minimumFractionDigits: 2 });

  const rows = [
    ["Subtotal", inr(gst.subtotal)],
    ...(gst.discount > 0 ? [["Discount", `-${inr(gst.discount)}`]] : []),
    ["Taxable Value", inr(gst.taxable_value)],
    ...(gst.cgst_amount > 0
      ? [
          [`CGST @ ${gst.cgst_rate}%`, inr(gst.cgst_amount)],
          [`SGST @ ${gst.sgst_rate}%`, inr(gst.sgst_amount)],
        ]
      : []),
    ...(gst.igst_amount > 0
      ? [[`IGST @ ${gst.igst_rate}%`, inr(gst.igst_amount)]]
      : []),
  ];

  return (
    <div className="bg-stone-50 rounded-xl p-4 border border-stone-200 mt-4">
      <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
        GST Breakdown
      </p>
      <div className="space-y-2">
        {rows.map(([label, value]) => (
          <div
            key={label}
            className="flex justify-between text-sm text-stone-600"
          >
            <span>{label}</span>
            <span className="font-mono">{value}</span>
          </div>
        ))}
        <div className="border-t border-stone-300 pt-2 flex justify-between items-center">
          <span className="font-semibold text-stone-800">Grand Total</span>
          <span className="font-mono font-bold text-lg text-emerald-700">
            {inr(gst.grand_total)}
          </span>
        </div>
      </div>
    </div>
  );
}