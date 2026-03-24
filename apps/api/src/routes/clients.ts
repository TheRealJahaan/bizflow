import { Router } from "express";
import { db } from "../db";
import { authMiddleware } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

router.get("/", async (req, res) => {
  try {
    const { search } = req.query;
    const businessId = req.user!.businessId;
    const params: any[] = [businessId];
    let query = `
      SELECT c.*,
        COUNT(i.id) as invoice_count,
        COALESCE(SUM(i.total_amount),0) as total_billed,
        COALESCE(SUM(i.amount_paid),0) as total_paid
      FROM clients c
      LEFT JOIN invoices i ON i.client_id = c.id
      WHERE c.business_id=$1 AND c.is_active=true`;

    if (search) {
      query += ` AND (c.name ILIKE $2 OR c.gstin ILIKE $2 OR c.email ILIKE $2)`;
      params.push(`%${search}%`);
    }
    query += " GROUP BY c.id ORDER BY c.name";

    const { rows } = await db.query(query, params);
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/", async (req, res) => {
  try {
    const {
      name, gstin, pan, email, phone,
      address, state_code, payment_terms_days,
    } = req.body;

    const { rows: [client] } = await db.query(
      `INSERT INTO clients
       (business_id,name,gstin,pan,email,phone,address,state_code,payment_terms_days)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
      [
        req.user!.businessId, name, gstin, pan, email, phone,
        JSON.stringify(address || {}),
        state_code || "29",
        payment_terms_days || 30,
      ]
    );
    res.status(201).json(client);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:id", async (req, res) => {
  try {
    const { name, gstin, pan, email, phone, address, state_code, payment_terms_days } = req.body;
    const { rows: [client] } = await db.query(
      `UPDATE clients SET name=$1,gstin=$2,pan=$3,email=$4,phone=$5,
       address=$6,state_code=$7,payment_terms_days=$8,updated_at=NOW()
       WHERE id=$9 AND business_id=$10 RETURNING *`,
      [name, gstin, pan, email, phone, JSON.stringify(address || {}), state_code, payment_terms_days, req.params.id, req.user!.businessId]
    );
    if (!client) return res.status(404).json({ error: "Not found" });
    res.json(client);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:id", async (req, res) => {
  try {
    await db.query(
      "UPDATE clients SET is_active=false WHERE id=$1 AND business_id=$2",
      [req.params.id, req.user!.businessId]
    );
    res.json({ message: "Client deactivated" });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;