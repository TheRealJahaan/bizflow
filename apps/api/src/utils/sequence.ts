import { db } from "../db";

export async function generateInvoiceNumber(
  businessId: string,
  prefix: string = "INV"
): Promise<string> {
  const { rows: [result] } = await db.query(
    `UPDATE businesses
     SET invoice_sequence = invoice_sequence + 1
     WHERE id = $1
     RETURNING invoice_sequence, invoice_prefix`,
    [businessId]
  );

  const seq = String(result.invoice_sequence).padStart(4, "0");
  const now = new Date();
  const year = now.getMonth() + 1 < 4
    ? now.getFullYear() - 1
    : now.getFullYear();
  const fy = `${year}-${String(year + 1).slice(2)}`;

  return `${result.invoice_prefix || prefix}-${fy}-${seq}`;
}