"use client";
import { useState } from "react";
import Link from "next/link";
import { useInvoices, useInvoiceSummary } from "../../../hooks/useInvoices";
import KPICard from "../../../components/dashboard/KPICard";

const STATUS_COLORS: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-800",
  sent: "bg-sky-100 text-sky-800",
  overdue: "bg-rose-100 text-rose-800",
  partial: "bg-amber-100 text-amber-800",
  draft: "bg-stone-100 text-stone-600",
  cancelled: "bg-stone-100 text-stone-400",
};

export default function InvoicesPage() {
  const [status, setStatus] = useState("");
  const { data, isLoading } = useInvoices(status ? { status } : undefined);
  const { data: summary } = useInvoiceSummary();

  const inr = (n: any) =>
    "₹" + (Number(n) || 0).toLocaleString("en-IN");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Invoices</h1>
        <Link
          href="/dashboard/invoices/new"
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
        >
          + New Invoice
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard label="Total" value={String(summary?.total || 0)} color="sky" />
        <KPICard label="Paid" value={String(summary?.paid || 0)} color="green" />
        <KPICard label="Pending" value={String(summary?.pending || 0)} color="amber" />
        <KPICard label="Overdue" value={String(summary?.overdue || 0)} color="rose" />
      </div>

      <div className="bg-white rounded-xl border border-stone-200">
        <div className="flex gap-2 p-4 border-b border-stone-100 flex-wrap">
          {["", "sent", "paid", "overdue", "partial", "draft"].map((s) => (
            <button
              key={s}
              onClick={() => setStatus(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                status === s
                  ? "bg-stone-800 text-white"
                  : "bg-stone-100 text-stone-500 hover:bg-stone-200"
              }`}
            >
              {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-stone-100">
                {[
                  "Invoice #", "Client", "Date", "Due", "Amount", "GST", "Status", "Action",
                ].map((h) => (
                  <th
                    key={h}
                    className="px-4 py-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider"
                  >
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-stone-400 text-sm">
                    Loading...
                  </td>
                </tr>
              ) : (data?.invoices || []).length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-stone-400 text-sm">
                    No invoices found.{" "}
                    <Link href="/dashboard/invoices/new" className="text-emerald-600 underline">
                      Create your first invoice
                    </Link>
                  </td>
                </tr>
              ) : (
                (data?.invoices || []).map((inv: any) => (
                  <tr
                    key={inv.id}
                    className="border-b border-stone-50 hover:bg-stone-50"
                  >
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-stone-700">
                      {inv.invoice_number}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-stone-800">
                        {inv.client_name}
                      </div>
                      <div className="text-xs text-stone-400 font-mono">
                        {inv.client_gstin}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500">
                      {new Date(inv.invoice_date).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-xs text-stone-500">
                      {new Date(inv.due_date).toLocaleDateString("en-IN")}
                    </td>
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-stone-800">
                      {inr(inv.total_amount)}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-stone-400">
                      {inr(
                        Number(inv.cgst_amount) +
                        Number(inv.sgst_amount) +
                        Number(inv.igst_amount)
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-semibold ${
                          STATUS_COLORS[inv.status] || "bg-stone-100 text-stone-500"
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Link
                        href={`/dashboard/invoices/${inv.id}`}
                        className="text-xs text-emerald-600 font-medium hover:underline"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}