"use client";
import Link from "next/link";
import { useInvoiceSummary } from "../../hooks/useInvoices";
import { useCashFlowDashboard } from "../../hooks/useCashFlow";
import KPICard from "../../components/dashboard/KPICard";
import CashFlowChart from "../../components/dashboard/CashFlowChart";

export default function DashboardPage() {
  const { data: summary } = useInvoiceSummary();
  const { data: cashflow } = useCashFlowDashboard();

  const inr = (n: any) =>
    "₹" + (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

  const pred = cashflow?.predictions?.[0];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Dashboard</h1>
        <Link
          href="/dashboard/invoices/new"
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
        >
          + New Invoice
        </Link>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <KPICard
          label="Total Revenue"
          value={inr(summary?.total_revenue)}
          color="green"
        />
        <KPICard
          label="Outstanding"
          value={inr(summary?.outstanding)}
          sub={`${summary?.pending || 0} invoices pending`}
          trend="down"
          color="amber"
        />
        <KPICard
          label="Overdue"
          value={String(summary?.overdue || 0)}
          sub="invoices overdue"
          trend="down"
          color="rose"
        />
        <KPICard
          label="Total Invoices"
          value={String(summary?.total || 0)}
          sub={`${summary?.paid || 0} paid`}
          color="sky"
        />
      </div>

      {pred && (
        <div className="bg-emerald-800 rounded-xl p-5 mb-6 text-white">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-emerald-300 rounded-full animate-pulse" />
            <span className="text-xs font-semibold text-emerald-300 uppercase tracking-wider">
              AI Cash Flow Prediction
            </span>
          </div>
          <p className="text-sm text-white/80 mb-3">
            Next month forecast · Confidence:{" "}
            {Math.round(pred.confidence * 100)}%
          </p>
          <div className="grid grid-cols-3 gap-3">
            {[
              ["Projected Revenue", inr(pred.predicted_revenue), "text-emerald-300"],
              ["Projected Expenses", inr(pred.predicted_expenses), "text-amber-300"],
              [
                "Net Cash Flow",
                inr(pred.net_cash_flow),
                pred.net_cash_flow >= 0 ? "text-emerald-300" : "text-rose-300",
              ],
            ].map(([label, value, cls]) => (
              <div key={label} className="bg-white/10 rounded-lg p-3">
                <div className="text-[10px] text-white/60 mb-1">{label}</div>
                <div className={`text-lg font-bold font-mono ${cls}`}>
                  {value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-5">
        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h3 className="text-sm font-semibold text-stone-700 mb-4">
            Revenue Trend (12 months)
          </h3>
          {cashflow?.monthly_trend?.length ? (
            <CashFlowChart data={cashflow.monthly_trend} />
          ) : (
            <div className="h-48 flex items-center justify-center text-stone-400 text-sm">
              No data yet — create your first invoice
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-5">
          <h3 className="text-sm font-semibold text-stone-700 mb-4">
            Top Clients by Revenue
          </h3>
          {(cashflow?.top_clients || []).length === 0 ? (
            <div className="h-48 flex items-center justify-center text-stone-400 text-sm">
              No client data yet
            </div>
          ) : (
            <div className="space-y-3 mt-2">
              {(cashflow?.top_clients || []).map((c: any, i: number) => (
                <div key={i}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-stone-700 font-medium">{c.name}</span>
                    <span className="text-stone-400 font-mono text-xs">
                      {c.pct}%
                    </span>
                  </div>
                  <div className="h-1.5 bg-stone-100 rounded-full">
                    <div
                      className="h-full bg-emerald-500 rounded-full"
                      style={{ width: `${c.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}