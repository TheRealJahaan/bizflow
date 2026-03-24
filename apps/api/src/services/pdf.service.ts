// PDF generation without puppeteer
// In production, use a hosted service like html-pdf-node or WeasyPrint
// or a SaaS like PDFShift / DocRaptor

export async function generateInvoicePDF(
  invoice: any,
  business: any,
  client: any
): Promise<string> {
  // Return the invoice HTML as a data URL for now
  // Wire up a PDF service when ready for production
  console.log(`PDF generation skipped for ${invoice.invoice_number} — configure a PDF service`);
  return "";
}

export function buildInvoiceHTML(
  invoice: any,
  business: any,
  client: any
): string {
  const inr = (n: number) =>
    "₹" + (n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2 });

  const items = (invoice.line_items as any[])
    .map(
      (item) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #f0f0f0">${item.description}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f0f0f0">${item.hsn_sac || ""}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;text-align:center">${item.quantity}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;text-align:right">${inr(item.unit_price)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #f0f0f0;text-align:right">${inr(item.quantity * item.unit_price)}</td>
      </tr>`
    )
    .join("");

  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><title>Invoice ${invoice.invoice_number}</title></head>
<body style="font-family:Arial,sans-serif;font-size:12px;color:#1a1a1a;padding:30px;max-width:800px;margin:0 auto">
  <div style="display:flex;justify-content:space-between;padding-bottom:20px;border-bottom:2px solid #0d7a5f;margin-bottom:24px">
    <div>
      <div style="font-size:22px;font-weight:800;color:#0d7a5f">TAX INVOICE</div>
      <div style="font-weight:700;font-size:14px;margin-top:8px">${business.name}</div>
      <div style="font-size:11px;background:#f0faf7;color:#0a5c47;padding:2px 8px;border-radius:4px;display:inline-block;margin-top:4px">GSTIN: ${business.gstin}</div>
    </div>
    <div style="text-align:right;font-size:12px">
      <div><strong>Invoice No:</strong> ${invoice.invoice_number}</div>
      <div style="margin-top:4px"><strong>Date:</strong> ${new Date(invoice.invoice_date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</div>
      <div style="margin-top:4px"><strong>Due Date:</strong> ${new Date(invoice.due_date).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })}</div>
    </div>
  </div>

  <div style="display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-bottom:24px">
    <div>
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#9a9a9a;margin-bottom:6px;letter-spacing:0.08em">Bill To</div>
      <div style="font-weight:700;font-size:13px">${client.name}</div>
      ${client.gstin ? `<div style="font-size:11px;color:#5a5a5a">GSTIN: ${client.gstin}</div>` : ""}
      <div style="color:#5a5a5a;line-height:1.7;margin-top:4px">${client.address?.line1 || ""}<br>${client.address?.city || ""}</div>
    </div>
    <div>
      <div style="font-size:9px;font-weight:700;text-transform:uppercase;color:#9a9a9a;margin-bottom:6px;letter-spacing:0.08em">Bank Details</div>
      <div style="background:#f0faf7;border-radius:6px;padding:10px;color:#5a5a5a;line-height:1.8">
        <strong>${business.bank_details?.bank_name || ""}</strong><br>
        A/c: ${business.bank_details?.account_no || ""}<br>
        IFSC: ${business.bank_details?.ifsc || ""}
      </div>
    </div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-bottom:0">
    <thead>
      <tr style="background:#1a1a1a;color:#fff">
        <th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase">Description</th>
        <th style="padding:8px 10px;text-align:left;font-size:10px;font-weight:700;text-transform:uppercase">HSN/SAC</th>
        <th style="padding:8px 10px;text-align:center;font-size:10px;font-weight:700;text-transform:uppercase">Qty</th>
        <th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase">Rate</th>
        <th style="padding:8px 10px;text-align:right;font-size:10px;font-weight:700;text-transform:uppercase">Amount</th>
      </tr>
    </thead>
    <tbody>${items}</tbody>
  </table>

  <div style="display:flex;justify-content:flex-end;margin-top:16px">
    <div style="width:240px">
      <div style="display:flex;justify-content:space-between;padding:5px 0;color:#5a5a5a;font-size:11px"><span>Subtotal</span><span>${inr(invoice.subtotal)}</span></div>
      ${invoice.cgst_amount > 0 ? `<div style="display:flex;justify-content:space-between;padding:5px 0;color:#5a5a5a;font-size:11px"><span>CGST @ 9%</span><span>${inr(invoice.cgst_amount)}</span></div><div style="display:flex;justify-content:space-between;padding:5px 0;color:#5a5a5a;font-size:11px"><span>SGST @ 9%</span><span>${inr(invoice.sgst_amount)}</span></div>` : ""}
      ${invoice.igst_amount > 0 ? `<div style="display:flex;justify-content:space-between;padding:5px 0;color:#5a5a5a;font-size:11px"><span>IGST @ 18%</span><span>${inr(invoice.igst_amount)}</span></div>` : ""}
      <div style="display:flex;justify-content:space-between;padding:10px 0;font-size:14px;font-weight:800;border-top:2px solid #1a1a1a;margin-top:6px"><span>Total</span><span>${inr(invoice.total_amount)}</span></div>
    </div>
  </div>

  ${invoice.notes ? `<div style="margin-top:20px;background:#f8f8f5;border-radius:6px;padding:12px;font-size:10px;color:#5a5a5a">${invoice.notes}</div>` : ""}
  <div style="margin-top:30px;padding-top:14px;border-top:1px solid #f0f0f0;font-size:9px;color:#b0b0b0">Generated by BizFlow — India's MSME Finance Platform</div>
</body>
</html>`;
}