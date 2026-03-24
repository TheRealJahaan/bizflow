"use client";
import { useQuery } from "@tanstack/react-query";
import { paymentsApi } from "../../../lib/api";

export default function PaymentsPage() {
  const { data: payments = [], isLoading } = useQuery({
    queryKey: ["payments"],
    queryFn: () => paymentsApi.list().then((r) => r.data),
  });

  const inr = (n: any) => "₹" + (Number(n) || 0).toLocaleString("en-IN");

  return (
    <div>
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Payments</h1>
      <div className="bg-white rounded-xl border border-stone-200">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-100">
              {["Invoice #", "Client", "Amount", "Method", "Reference", "Date"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-stone-400 text-sm">Loading...</td></tr>
            ) : payments.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-stone-400 text-sm">No payments recorded yet</td></tr>
            ) : payments.map((p: any) => (
              <tr key={p.id} className="border-b border-stone-50 hover:bg-stone-50">
                <td className="px-4 py-3 font-mono text-xs font-semibold">{p.invoice_number}</td>
                <td className="px-4 py-3 text-sm font-medium text-stone-800">{p.client_name}</td>
                <td className="px-4 py-3 font-mono font-semibold text-emerald-700">{inr(p.amount)}</td>
                <td className="px-4 py-3 text-xs text-stone-500 capitalize">{p.payment_method || "—"}</td>
                <td className="px-4 py-3 font-mono text-xs text-stone-400">{p.reference_number || "—"}</td>
                <td className="px-4 py-3 text-xs text-stone-500">{new Date(p.payment_date).toLocaleDateString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}