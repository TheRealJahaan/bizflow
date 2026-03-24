"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { businessApi } from "../../../lib/api";

export default function SettingsPage() {
  const { data: business } = useQuery({
    queryKey: ["business"],
    queryFn: () => businessApi.get().then((r) => r.data),
  });

  const update = useMutation({
    mutationFn: businessApi.update,
    onSuccess: () => alert("Settings saved!"),
  });

  const [form, setForm] = useState({
    name: "", gstin: "", invoice_prefix: "INV",
    address: { line1: "", city: "", state: "", state_code: "29", pincode: "" },
    bank_details: { bank_name: "", account_no: "", ifsc: "" },
  });

  useEffect(() => {
    if (business) {
      setForm({
        name: business.name || "",
        gstin: business.gstin || "",
        invoice_prefix: business.invoice_prefix || "INV",
        address: business.address || form.address,
        bank_details: business.bank_details || form.bank_details,
      });
    }
  }, [business]);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-stone-800 mb-6">Business Settings</h1>

      <form onSubmit={(e) => { e.preventDefault(); update.mutate(form); }} className="space-y-5">
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <h2 className="text-sm font-semibold text-stone-600 mb-4">Business Profile</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">Business Name</label>
              <input value={form.name} onChange={(e) => setForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">GSTIN</label>
                <input value={form.gstin} readOnly className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm bg-stone-50 font-mono" />
              </div>
              <div>
                <label className="block text-xs font-medium text-stone-500 mb-1">Invoice Prefix</label>
                <input value={form.invoice_prefix} onChange={(e) => setForm(f => ({ ...f, invoice_prefix: e.target.value }))} className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400" />
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <h2 className="text-sm font-semibold text-stone-600 mb-4">Bank Details</h2>
          <div className="space-y-3">
            {[
              { key: "bank_name", label: "Bank Name", placeholder: "HDFC Bank" },
              { key: "account_no", label: "Account Number", placeholder: "50200012345678" },
              { key: "ifsc", label: "IFSC Code", placeholder: "HDFC0001234" },
            ].map(({ key, label, placeholder }) => (
              <div key={key}>
                <label className="block text-xs font-medium text-stone-500 mb-1">{label}</label>
                <input
                  value={(form.bank_details as any)[key]}
                  onChange={(e) => setForm(f => ({ ...f, bank_details: { ...f.bank_details, [key]: e.target.value } }))}
                  placeholder={placeholder}
                  className={`w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400 ${key !== "bank_name" ? "font-mono" : ""}`}
                />
              </div>
            ))}
          </div>
        </div>

        <button
          type="submit"
          disabled={update.isPending}
          className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50"
        >
          {update.isPending ? "Saving..." : "Save Settings"}
        </button>
      </form>
    </div>
  );
}