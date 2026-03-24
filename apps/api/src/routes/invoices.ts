import { Router } from "express";
import { db } from "../db";
import { authMiddleware, requireRole } from "../middleware/auth";
import { generateInvoiceNumber } from "../utils/sequence";

// ─── Inline GST calculator ────────────────────────────────────────────────────
function round2(n: number) {
  return Math.round(n * 100) / 100;
}

function calculateGST(
  items: any[],
  supplyType: string,
  sellerState: string,
  buyerState: string
) {
  const isExempt = supplyType === "exempt";
  const isExport = supplyType === "export" || supplyType === "sez";
  const isIntra =
    !isExport &&
    (supplyType === "intra_state" ||
      (supplyType !== "inter_state" && sellerState === buyerState));

  let subtotal = 0, discount = 0, cgst = 0, sgst = 0, igst = 0;

  for (const item of items) {
    const line    = round2(item.quantity * item.unit_price);
    const disc    = round2(line * ((item.discount_percent || 0) / 100));
    const taxable = round2(line - disc);
    subtotal += line;
    discount += disc;
    if (isExempt || isExport) continue;
    const gstAmt = round2(taxable * (item.gst_rate / 100));
    if (isIntra) {
      cgst += round2(gstAmt / 2);
      sgst += round2(gstAmt / 2);
    } else {
      igst += gstAmt;
    }
  }

  const taxableValue = round2(subtotal - discount);
  const totalGST     = round2(cgst + sgst + igst);

  return {
    subtotal:       round2(subtotal),
    discount:       round2(discount),
    taxable_value:  taxableValue,
    cgst_rate:      isIntra ? 9 : 0,
    cgst_amount:    round2(cgst),
    sgst_rate:      isIntra ? 9 : 0,
    sgst_amount:    round2(sgst),
    igst_rate:      !isIntra && !isExempt && !isExport ? 18 : 0,
    igst_amount:    round2(igst),
    total_gst:      totalGST,
    grand_total:    round2(taxableValue + totalGST),
    reverse_charge: false,
  };
}
// ─────────────────────────────────────────────────────────────────────────────

const router = Router();
router.use(authMiddleware);

// GET /api/invoices/summary
router.get("/summary", async (req, res) => {
  try {
    const { rows: [s] } = await db.query(
      `SELECT
         COUNT(*)                                                              AS total,
         COUNT(*) FILTER (WHERE status = 'paid')                              AS paid,
         COUNT(*) FILTER (WHERE status IN ('sent','partial','overdue'))        AS pending,
         COUNT(*) FILTER (WHERE status = 'overdue')                           AS overdue,
         COALESCE(SUM(total_amount), 0)                                       AS total_revenue,
         COALESCE(SUM(total_amount) FILTER (WHERE status = 'paid'), 0)        AS collected,
         COALESCE(SUM(total_amount - amount_paid)
           FILTER (WHERE status NOT IN ('paid','cancelled')), 0)              AS outstanding
       FROM invoices
       WHERE business_id = $1`,
      [req.user!.businessId]
    );
    res.json(s);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/invoices
router.get("/", async (req, res) => {
  try {
    const { status, page = "1", limit = "20", search } = req.query;
    const businessId = req.user!.businessId;
    const offset = (parseInt(page as string) - 1) * parseInt(limit as string);

    // Auto-mark overdue
    await db.query(
      `UPDATE invoices
       SET status = 'overdue', updated_at = NOW()
       WHERE business_id = $1
         AND status IN ('sent', 'partial')
         AND due_date < CURRENT_DATE
         AND amount_paid < total_amount`,
      [businessId]
    );

    const conditions = ["i.business_id = $1"];
    const params: any[] = [businessId];
    let idx = 2;

    if (status) {
      conditions.push(`i.status = $${idx++}`);
      params.push(status);
    }
    if (search) {
      conditions.push(
        `(i.invoice_number ILIKE $${idx} OR c.name ILIKE $${idx})`
      );
      params.push(`%${search}%`);
      idx++;
    }

    const where = conditions.join(" AND ");

    const { rows: invoices } = await db.query(
      `SELECT i.*,
              c.name  AS client_name,
              c.gstin AS client_gstin,
              c.email AS client_email,
              (i.total_amount - i.amount_paid)   AS balance_due,
              (CURRENT_DATE - i.due_date)        AS days_overdue
       FROM invoices i
       LEFT JOIN clients c ON i.client_id = c.id
       WHERE ${where}
       ORDER BY i.invoice_date DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    const { rows: [{ count }] } = await db.query(
      `SELECT COUNT(*)
       FROM invoices i
       LEFT JOIN clients c ON i.client_id = c.id
       WHERE ${where}`,
      params
    );

    res.json({
      invoices,
      total: parseInt(count),
      page:  parseInt(page as string),
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/invoices/:id
router.get("/:id", async (req, res) => {
  try {
    const { rows: [invoice] } = await db.query(
      `SELECT i.*,
              c.name       AS client_name,
              c.gstin      AS client_gstin,
              c.email      AS client_email,
              c.phone      AS client_phone,
              c.address    AS client_address,
              c.state_code AS client_state_code
       FROM invoices i
       LEFT JOIN clients c ON i.client_id = c.id
       WHERE i.id = $1 AND i.business_id = $2`,
      [req.params.id, req.user!.businessId]
    );

    if (!invoice) return res.status(404).json({ error: "Not found" });

    const { rows: payments } = await db.query(
      "SELECT * FROM payments WHERE invoice_id = $1 ORDER BY payment_date DESC",
      [invoice.id]
    );

    res.json({ ...invoice, payment_history: payments });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/invoices
router.post("/", requireRole(["admin", "accountant"]), async (req, res) => {
  try {
    const {
      client_id, invoice_date, due_date,
      line_items, supply_type, notes, terms,
      is_recurring, recurring_interval,
    } = req.body;

    const businessId = req.user!.businessId;

    const [{ rows: [business] }, { rows: [client] }] = await Promise.all([
      db.query("SELECT * FROM businesses WHERE id = $1", [businessId]),
      db.query(
        "SELECT * FROM clients WHERE id = $1 AND business_id = $2",
        [client_id, businessId]
      ),
    ]);

    if (!client) return res.status(404).json({ error: "Client not found" });

    const gstCalc = calculateGST(
      line_items,
      supply_type || "intra_state",
      business.address?.state_code || "29",
      client.state_code || "29"
    );

    const invoiceNumber = await generateInvoiceNumber(
      businessId,
      business.invoice_prefix
    );

    let nextRecurringDate = null;
    if (is_recurring && recurring_interval === "monthly") {
      const d = new Date(invoice_date);
      d.setMonth(d.getMonth() + 1);
      nextRecurringDate = d.toISOString().split("T")[0];
    }

    const { rows: [invoice] } = await db.query(
      `INSERT INTO invoices (
         business_id, client_id, invoice_number, invoice_date, due_date,
         supply_type, line_items, subtotal, discount_amount,
         cgst_amount, sgst_amount, igst_amount, total_amount,
         notes, terms, is_recurring, recurring_interval,
         next_recurring_date, status, created_by
       ) VALUES (
         $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,'sent',$19
       ) RETURNING *`,
      [
        businessId, client_id, invoiceNumber,
        invoice_date, due_date,
        supply_type || "intra_state",
        JSON.stringify(line_items),
        gstCalc.subtotal,
        gstCalc.discount,
        gstCalc.cgst_amount,
        gstCalc.sgst_amount,
        gstCalc.igst_amount,
        gstCalc.grand_total,
        notes, terms,
        is_recurring || false,
        recurring_interval,
        nextRecurringDate,
        req.user!.userId,
      ]
    );

    res.status(201).json({ invoice, gst_breakdown: gstCalc });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/invoices/:id
router.put("/:id", requireRole(["admin", "accountant"]), async (req, res) => {
  try {
    const { rows: [existing] } = await db.query(
      "SELECT * FROM invoices WHERE id = $1 AND business_id = $2",
      [req.params.id, req.user!.businessId]
    );
    if (!existing) return res.status(404).json({ error: "Not found" });
    if (existing.status === "paid") {
      return res.status(400).json({ error: "Cannot edit a paid invoice" });
    }

    const { line_items, notes, terms, due_date, supply_type } = req.body;

    const [{ rows: [business] }, { rows: [client] }] = await Promise.all([
      db.query("SELECT * FROM businesses WHERE id = $1", [req.user!.businessId]),
      db.query("SELECT * FROM clients WHERE id = $1", [existing.client_id]),
    ]);

    const items    = line_items || existing.line_items;
    const supType  = supply_type || existing.supply_type;
    const gstCalc  = calculateGST(
      items, supType,
      business.address?.state_code || "29",
      client.state_code || "29"
    );

    const { rows: [invoice] } = await db.query(
      `UPDATE invoices
       SET line_items   = $1,
           notes        = $2,
           terms        = $3,
           due_date     = $4,
           supply_type  = $5,
           subtotal     = $6,
           cgst_amount  = $7,
           sgst_amount  = $8,
           igst_amount  = $9,
           total_amount = $10,
           updated_at   = NOW()
       WHERE id = $11
       RETURNING *`,
      [
        JSON.stringify(items),
        notes   ?? existing.notes,
        terms   ?? existing.terms,
        due_date ?? existing.due_date,
        supType,
        gstCalc.subtotal,
        gstCalc.cgst_amount,
        gstCalc.sgst_amount,
        gstCalc.igst_amount,
        gstCalc.grand_total,
        req.params.id,
      ]
    );

    res.json({ invoice, gst_breakdown: gstCalc });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/invoices/:id
router.delete("/:id", requireRole(["admin"]), async (req, res) => {
  try {
    const { rows: [inv] } = await db.query(
      "SELECT * FROM invoices WHERE id = $1 AND business_id = $2",
      [req.params.id, req.user!.businessId]
    );
    if (!inv) return res.status(404).json({ error: "Not found" });
    if (inv.status === "paid") {
      return res.status(400).json({ error: "Cannot delete a paid invoice" });
    }
    await db.query(
      "UPDATE invoices SET status = 'cancelled' WHERE id = $1",
      [req.params.id]
    );
    res.json({ message: "Invoice cancelled" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/invoices/:id/payment
router.post(
  "/:id/payment",
  requireRole(["admin", "accountant"]),
  async (req, res) => {
    try {
      const {
        amount, payment_date, payment_method,
        reference_number, notes,
      } = req.body;

      const { rows: [invoice] } = await db.query(
        "SELECT * FROM invoices WHERE id = $1 AND business_id = $2",
        [req.params.id, req.user!.businessId]
      );
      if (!invoice) return res.status(404).json({ error: "Not found" });

      const payAmt  = parseFloat(amount);
      const newPaid = parseFloat(invoice.amount_paid) + payAmt;
      const total   = parseFloat(invoice.total_amount);

      if (newPaid > total) {
        return res.status(400).json({ error: "Payment exceeds invoice total" });
      }

      const newStatus =
        newPaid >= total      ? "paid"    :
        newPaid > 0           ? "partial" :
        invoice.status;

      await db.transaction(async (client) => {
        await client.query(
          `INSERT INTO payments
           (invoice_id, business_id, amount, payment_date,
            payment_method, reference_number, notes, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
          [
            invoice.id, req.user!.businessId, payAmt,
            payment_date, payment_method,
            reference_number, notes, req.user!.userId,
          ]
        );
        await client.query(
          `UPDATE invoices
           SET amount_paid = $1,
               status      = $2,
               paid_at     = CASE WHEN $2 = 'paid' THEN NOW() ELSE paid_at END,
               updated_at  = NOW()
           WHERE id = $3`,
          [newPaid, newStatus, invoice.id]
        );
      });

      res.json({
        message:    "Payment recorded",
        new_status: newStatus,
        balance_due: total - newPaid,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  }
);

// POST /api/invoices/:id/remind
router.post("/:id/remind", async (req, res) => {
  try {
    await db.query(
      `UPDATE invoices
       SET last_reminder_at  = NOW(),
           reminder_count    = reminder_count + 1
       WHERE id = $1`,
      [req.params.id]
    );
    res.json({ message: "Reminder sent" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;