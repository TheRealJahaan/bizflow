"use client";
import { useCashFlowDashboard, usePredictions } from "../../../hooks/useCashFlow";
import CashFlowChart from "../../../components/dashboard/CashFlowChart";

export default function CashFlowPage() {
  const { data: dashboard } = useCashFlowDashboard();
  const { data: predictions = [] } = usePredictions(3);

  const inr = (n: any) =>
    "₹" + (Number(n) || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 });

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Cash Flow AI</h1>

      <div className="grid grid-cols-3 gap-4 mb-6">
        {predictions.map((p: any) => (
          <div key={p.month} className="bg-white rounded-xl border border-stone-200 p-5">
            <p className="text-xs font-semibold text-stone-400 uppercase tracking-wider mb-3">
              {p.month} · {Math.round(p.confidence * 100)}% confidence
            </p>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Projected Revenue</span>
                <span className="font-mono font-semibold text-emerald-700">{inr(p.predicted_revenue)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-stone-500">Projected Expenses</span>
                <span className="font-mono font-semibold text-amber-600">{inr(p.predicted_expenses)}</span>
              </div>
              <div className="flex justify-between text-sm border-t border-stone-100 pt-2">
                <span className="font-semibold text-stone-700">Net Cash Flow</span>
                <span className={`font-mono font-bold ${p.net_cash_flow >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                  {inr(p.net_cash_flow)}
                </span>
              </div>
            </div>
            <div className="mt-3">
              <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                p.risk_level === "low" ? "bg-emerald-100 text-emerald-700" :
                p.risk_level === "medium" ? "bg-amber-100 text-amber-700" :
                "bg-rose-100 text-rose-700"
              }`}>
                {p.risk_level} risk
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <h2 className="text-sm font-semibold text-stone-700 mb-4">12-Month Revenue Trend</h2>
        {dashboard?.monthly_trend?.length ? (
          <CashFlowChart data={dashboard.monthly_trend} />
        ) : (
          <div className="h-48 flex items-center justify-center text-stone-400 text-sm">
            No data yet
          </div>
        )}
      </div>
    </div>
  );
}