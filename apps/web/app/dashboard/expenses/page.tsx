"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { expensesApi } from "../../../lib/api";

export default function ExpensesPage() {
  const qc = useQueryClient();
  const [showForm, setShowForm] = useState(false);
  const { data: expenses = [], isLoading } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => expensesApi.list().then((r) => r.data),
  });

  const createExpense = useMutation({
    mutationFn: expensesApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["expenses"] });
      setShowForm(false);
    },
  });

  const [form, setForm] = useState({
    vendor_name: "", category: "Office", amount: "",
    gst_amount: "", expense_date: new Date().toISOString().split("T")[0],
    itc_eligible: true, description: "",
  });

  const categories = ["Office", "Travel", "Software", "Marketing", "Rent", "Salaries", "Utilities", "Other"];
  const inr = (n: any) => "₹" + (Number(n) || 0).toLocaleString("en-IN");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Expenses</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
        >
          + Add Expense
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-stone-600 mb-4">New Expense</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              createExpense.mutate(form);
            }}
            className="grid grid-cols-2 gap-4"
          >
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Vendor Name</label>
              <input value={form.vendor_name} onChange={(e) => setForm(f => ({ ...f, vendor_name: e.target.value }))} placeholder="Amazon Web Services" className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Category</label>
              <select value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400">
                {categories.map((c) => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Amount (₹)</label>
              <input type="number" value={form.amount} onChange={(e) => setForm(f => ({ ...f, amount: e.target.value }))} placeholder="5000" required className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">GST Amount (₹)</label>
              <input type="number" value={form.gst_amount} onChange={(e) => setForm(f => ({ ...f, gst_amount: e.target.value }))} placeholder="900" className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400" />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Date</label>
              <input type="date" value={form.expense_date} onChange={(e) => setForm(f => ({ ...f, expense_date: e.target.value }))} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400" />
            </div>
            <div className="flex items-center gap-2 pt-5">
              <input type="checkbox" id="itc" checked={form.itc_eligible} onChange={(e) => setForm(f => ({ ...f, itc_eligible: e.target.checked }))} className="rounded" />
              <label htmlFor="itc" className="text-sm text-stone-600">ITC Eligible</label>
            </div>
            <div className="col-span-2 flex gap-3">
              <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">Save</button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm border border-stone-200 text-stone-600 hover:bg-stone-50">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl border border-stone-200">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-100">
              {["Vendor", "Category", "Amount", "GST", "ITC", "Date"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-stone-400 text-sm">Loading...</td></tr>
            ) : (expenses as any[]).length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-stone-400 text-sm">No expenses yet</td></tr>
            ) : (expenses as any[]).map((e) => (
              <tr key={e.id} className="border-b border-stone-50 hover:bg-stone-50">
                <td className="px-4 py-3 text-sm font-medium text-stone-800">{e.vendor_name}</td>
                <td className="px-4 py-3"><span className="px-2.5 py-1 bg-stone-100 text-stone-600 text-xs rounded-full font-medium">{e.category}</span></td>
                <td className="px-4 py-3 font-mono font-semibold text-stone-800">{inr(e.amount)}</td>
                <td className="px-4 py-3 font-mono text-xs text-stone-400">{inr(e.gst_amount)}</td>
                <td className="px-4 py-3"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${e.itc_eligible ? "bg-emerald-100 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>{e.itc_eligible ? "Yes" : "No"}</span></td>
                <td className="px-4 py-3 text-xs text-stone-500">{new Date(e.expense_date).toLocaleDateString("en-IN")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}