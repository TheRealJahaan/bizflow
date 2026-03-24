"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateInvoice } from "../../../../hooks/useInvoices";
import { useClients } from "../../../../hooks/useClients";
import GSTCalculator from "../../../../components/invoice/GSTCalculator";
import type { LineItem, SupplyType } from "../../../../packages/gst-engine/src/types";

const defaultItem = (): LineItem => ({
  description: "",
  hsn_sac: "",
  quantity: 1,
  unit_price: 0,
  gst_rate: 18,
});

export default function NewInvoicePage() {
  const router = useRouter();
  const { data: clients = [] } = useClients();
  const createInvoice = useCreateInvoice();

  const [clientId, setClientId] = useState("");
  const [invoiceDate, setInvoiceDate] = useState(
    new Date().toISOString().split("T")[0]
  );
  const [dueDate, setDueDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().split("T")[0];
  });
  const [supplyType, setSupplyType] = useState<SupplyType>("intra_state");
  const [lineItems, setLineItems] = useState<LineItem[]>([defaultItem()]);
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const selectedClient = (clients as any[]).find((c) => c.id === clientId);

  function updateItem(index: number, field: keyof LineItem, value: any) {
    setLineItems((prev) =>
      prev.map((item, i) =>
        i === index
          ? { ...item, [field]: field === "quantity" || field === "unit_price" || field === "gst_rate" ? Number(value) : value }
          : item
      )
    );
  }

  function addItem() {
    setLineItems((prev) => [...prev, defaultItem()]);
  }

  function removeItem(index: number) {
    setLineItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!clientId) return setError("Please select a client");
    setLoading(true);
    setError("");
    try {
      await createInvoice.mutateAsync({
        client_id: clientId,
        invoice_date: invoiceDate,
        due_date: dueDate,
        supply_type: supplyType,
        line_items: lineItems,
        notes,
      });
      router.push("/dashboard/invoices");
    } catch (err: any) {
      setError(err.response?.data?.error || "Failed to create invoice");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-3xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-stone-800">New Invoice</h1>
        <button
          onClick={() => router.back()}
          className="text-sm text-stone-400 hover:text-stone-600"
        >
          ← Back
        </button>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm px-4 py-3 rounded-lg mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <h2 className="text-sm font-semibold text-stone-600 mb-4">
            Client & Dates
          </h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Client *
              </label>
              <select
                value={clientId}
                onChange={(e) => setClientId(e.target.value)}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400"
              >
                <option value="">Select a client...</option>
                {(clients as any[]).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Supply Type *
              </label>
              <select
                value={supplyType}
                onChange={(e) => setSupplyType(e.target.value as SupplyType)}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400"
              >
                <option value="intra_state">Intra-State (CGST + SGST)</option>
                <option value="inter_state">Inter-State (IGST)</option>
                <option value="export">Export (Zero Rated)</option>
                <option value="exempt">Exempt</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Invoice Date *
              </label>
              <input
                type="date"
                value={invoiceDate}
                onChange={(e) => setInvoiceDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-stone-500 mb-1">
                Due Date *
              </label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400"
              />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <h2 className="text-sm font-semibold text-stone-600 mb-4">
            Line Items
          </h2>

          <div className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_32px] gap-2 mb-2">
            {["Description", "HSN/SAC", "Qty", "Rate (₹)", "GST%", ""].map(
              (h) => (
                <span
                  key={h}
                  className="text-xs font-semibold text-stone-400 uppercase"
                >
                  {h}
                </span>
              )
            )}
          </div>

          {lineItems.map((item, index) => (
            <div
              key={index}
              className="grid grid-cols-[2fr_1fr_1fr_1fr_1fr_32px] gap-2 mb-2"
            >
              <input
                value={item.description}
                onChange={(e) => updateItem(index, "description", e.target.value)}
                placeholder="Service / Product"
                className="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400"
              />
              <input
                value={item.hsn_sac}
                onChange={(e) => updateItem(index, "hsn_sac", e.target.value)}
                placeholder="998314"
                className="px-3 py-2 border border-stone-200 rounded-lg text-sm font-mono focus:outline-none focus:border-emerald-400"
              />
              <input
                type="number"
                value={item.quantity}
                onChange={(e) => updateItem(index, "quantity", e.target.value)}
                min="0.01"
                step="0.01"
                className="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400"
              />
              <input
                type="number"
                value={item.unit_price}
                onChange={(e) => updateItem(index, "unit_price", e.target.value)}
                min="0"
                step="0.01"
                className="px-3 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400"
              />
              <select
                value={item.gst_rate}
                onChange={(e) => updateItem(index, "gst_rate", e.target.value)}
                className="px-2 py-2 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400"
              >
                {[0, 5, 12, 18, 28].map((r) => (
                  <option key={r} value={r}>
                    {r}%
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => removeItem(index)}
                disabled={lineItems.length === 1}
                className="w-8 h-9 border border-stone-200 rounded-lg text-rose-400 hover:bg-rose-50 disabled:opacity-30 flex items-center justify-center"
              >
                ×
              </button>
            </div>
          ))}

          <button
            type="button"
            onClick={addItem}
            className="text-sm text-emerald-600 font-medium hover:text-emerald-700 mt-2"
          >
            + Add Line Item
          </button>

          <GSTCalculator
            lineItems={lineItems}
            supplyType={supplyType}
            sellerStateCode="29"
            buyerStateCode={selectedClient?.state_code || "29"}
          />
        </div>

        <div className="bg-white rounded-xl border border-stone-200 p-6">
          <h2 className="text-sm font-semibold text-stone-600 mb-3">Notes</h2>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Payment terms, bank details, thank you note..."
            className="w-full px-3 py-2.5 border border-stone-200 rounded-lg text-sm focus:outline-none focus:border-emerald-400"
          />
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading}
            className="bg-emerald-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-emerald-700 disabled:opacity-50"
          >
            {loading ? "Creating..." : "Create Invoice"}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-6 py-2.5 rounded-lg font-medium border border-stone-200 text-stone-600 hover:bg-stone-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}