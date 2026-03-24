import { Router } from "express";
import { db } from "../db";
import { authMiddleware } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

router.get("/", async (req, res) => {
  try {
    const { month, year, category } = req.query;
    const businessId = req.user!.businessId;
    const conditions = ["business_id=$1"];
    const params: any[] = [businessId];
    let idx = 2;

    if (month) { conditions.push(`EXTRACT(MONTH FROM expense_date)=$${idx++}`); params.push(month); }
    if (year) { conditions.push(`EXTRACT(YEAR FROM expense_date)=$${idx++}`); params.push(year); }
    if (category) { conditions.push(`category=$${idx++}`); params.push(category); }

    const { rows } = await db.query(
      `SELECT * FROM expenses WHERE ${conditions.join(" AND ")} ORDER BY expense_date DESC`,
      params
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      vendor_name, vendor_gstin, category, description,
      amount, gst_amount, cgst_amount, sgst_amount, igst_amount,
      expense_date, itc_eligible, invoice_number,
    } = req.body;

    const { rows: [expense] } = await db.query(
      `INSERT INTO expenses
       (business_id,vendor_name,vendor_gstin,category,description,
        amount,gst_amount,cgst_amount,sgst_amount,igst_amount,
        expense_date,itc_eligible,invoice_number,created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14) RETURNING *`,
      [
        req.user!.businessId, vendor_name, vendor_gstin, category,
        description, amount, gst_amount || 0, cgst_amount || 0,
        sgst_amount || 0, igst_amount || 0, expense_date,
        itc_eligible !== false, invoice_number, req.user!.userId,
      ]
    );
    res.status(201).json(expense);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.query(
      "DELETE FROM expenses WHERE id=$1 AND business_id=$2",
      [req.params.id, req.user!.businessId]
    );
    res.json({ message: "Deleted" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;