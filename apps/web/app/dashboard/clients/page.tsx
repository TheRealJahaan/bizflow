"use client";
import { useState } from "react";
import { useClients, useCreateClient } from "../../../hooks/useClients";

export default function ClientsPage() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const { data: clients = [], isLoading } = useClients(search || undefined);
  const createClient = useCreateClient();

  const [form, setForm] = useState({
    name: "", gstin: "", email: "", phone: "",
    state_code: "29", payment_terms_days: 30,
  });

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    await createClient.mutateAsync(form);
    setShowForm(false);
    setForm({ name: "", gstin: "", email: "", phone: "", state_code: "29", payment_terms_days: 30 });
  }

  const inr = (n: any) => "₹" + (Number(n) || 0).toLocaleString("en-IN");

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-800">Clients</h1>
        <button
          onClick={() => setShowForm(!showForm)}
          className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700"
        >
          + Add Client
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-stone-200 p-6 mb-6">
          <h2 className="text-sm font-semibold text-stone-600 mb-4">New Client</h2>
          <form onSubmit={handleCreate} className="grid grid-cols-2 gap-4">
            {[
              { name: "name", label: "Business Name", placeholder: "Acme Corp" },
              { name: "gstin", label: "GSTIN", placeholder: "29AABCT3518Q1ZV" },
              { name: "email", label: "Email", placeholder: "billing@acme.com" },
              { name: "phone", label: "Phone", placeholder: "+91 98765 43210" },
            ].map(({ name, label, placeholder }) => (
              <div key={name}>
                <label className="block text-xs font-medium text-stone-500 mb-1">{label}</label>
                <input
                  value={(form as any)[name]}
                  onChange={(e) => setForm(f => ({ ...f, [name]: e.target.value }))}
                  placeholder={placeholder}
                  className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400"
                />
              </div>
            ))}
            <div className="col-span-2 flex gap-3">
              <button type="submit" className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700">
                Save Client
              </button>
              <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 rounded-lg text-sm border border-stone-200 text-stone-600 hover:bg-stone-50">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="mb-4">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search clients by name, GSTIN or email..."
          className="w-full max-w-sm px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400"
        />
      </div>

      <div className="bg-white rounded-xl border border-stone-200">
        <table className="w-full">
          <thead>
            <tr className="border-b border-stone-100">
              {["Client", "GSTIN", "Email", "Invoices", "Total Billed", "Outstanding"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-stone-400 uppercase tracking-wider">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-stone-400 text-sm">Loading...</td></tr>
            ) : (clients as any[]).length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-12 text-center text-stone-400 text-sm">No clients yet. Add your first client above.</td></tr>
            ) : (clients as any[]).map((c) => (
              <tr key={c.id} className="border-b border-stone-50 hover:bg-stone-50">
                <td className="px-4 py-3">
                  <div className="text-sm font-medium text-stone-800">{c.name}</div>
                  <div className="text-xs text-stone-400">{c.phone}</div>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-stone-500">{c.gstin || "—"}</td>
                <td className="px-4 py-3 text-xs text-stone-500">{c.email || "—"}</td>
                <td className="px-4 py-3 text-sm text-stone-600">{c.invoice_count}</td>
                <td className="px-4 py-3 font-mono text-sm font-semibold text-stone-800">{inr(c.total_billed)}</td>
                <td className="px-4 py-3 font-mono text-sm font-semibold text-rose-600">{inr(Number(c.total_billed) - Number(c.total_paid))}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}