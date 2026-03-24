"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { gstApi } from "../../../lib/api";

export default function GSTPage() {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());

  const { data, isLoading } = useQuery({
    queryKey: ["gst-summary", month, year],
    queryFn: () => gstApi.summary(month, year).then((r) => r.data),
  });

  const inr = (n: any) =>
    "₹" + (Number(n) || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-800">GST Reports</h1>
        <div className="flex gap-2">
          <select
            value={month}
            onChange={(e) => setMonth(parseInt(e.target.value))}
            className="px-3 py-2 border border-stone-200 rounded-lg text-sm"
          >
            {Array.from({ length: 12 }, (_, i) => (
              <option key={i + 1} value={i + 1}>
                {new Date(2024, i).toLocaleString("en-IN", { month: "long" })}
              </option>
            ))}
          </select>
          <select
            value={year}
            onChange={(e) => setYear(parseInt(e.target.value))}
            className="px-3 py-2 border border-stone-200 rounded-lg text-sm"
          >
            {[2023, 2024, 2025, 2026].map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
        </div>
      </div>

      {isLoading ? (
        <p className="text-stone-400">Loading...</p>
      ) : (
        <div className="grid grid-cols-2 gap-5">
          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <h2 className="text-sm font-semibold text-stone-600 mb-4">Output Tax (Sales)</h2>
            <div className="space-y-3">
              {[
                ["Taxable Turnover", inr(data?.output_tax?.taxable_value)],
                ["CGST (9%)", inr(data?.output_tax?.cgst)],
                ["SGST (9%)", inr(data?.output_tax?.sgst)],
                ["IGST (18%)", inr(data?.output_tax?.igst)],
                ["Total Output Tax", inr(data?.output_tax?.total_output_tax)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm border-b border-stone-50 pb-2">
                  <span className="text-stone-500">{label}</span>
                  <span className="font-mono font-semibold text-emerald-700">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-xl border border-stone-200 p-6">
            <h2 className="text-sm font-semibold text-stone-600 mb-4">Input Tax Credit (Purchases)</h2>
            <div className="space-y-3">
              {[
                ["Total Purchases", inr(data?.input_tax?.total_purchases)],
                ["ITC CGST", inr(data?.input_tax?.itc_cgst)],
                ["ITC SGST", inr(data?.input_tax?.itc_sgst)],
                ["ITC IGST", inr(data?.input_tax?.itc_igst)],
                ["Total ITC", inr(data?.input_tax?.total_itc)],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between text-sm border-b border-stone-50 pb-2">
                  <span className="text-stone-500">{label}</span>
                  <span className="font-mono font-semibold text-rose-600">{value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-amber-800">Net GST Payable</p>
                <p className="text-xs text-amber-600 mt-1">Output Tax minus Input Tax Credit</p>
              </div>
              <div className="text-3xl font-bold font-mono text-amber-800">
                {inr(data?.net_payable)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}