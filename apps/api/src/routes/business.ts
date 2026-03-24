import { Router } from "express";
import { db } from "../db";
import { authMiddleware, requireRole } from "../middleware/auth";

const router = Router();
router.use(authMiddleware);

router.get("/", async (req, res) => {
  try {
    const { rows: [business] } = await db.query(
      "SELECT * FROM businesses WHERE id=$1",
      [req.user!.businessId]
    );
    res.json(business);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/", requireRole(["admin"]), async (req, res) => {
  try {
    const { name, address, bank_details, invoice_prefix } = req.body;
    const { rows: [business] } = await db.query(
      `UPDATE businesses
       SET name=$1,address=$2,bank_details=$3,invoice_prefix=$4,updated_at=NOW()
       WHERE id=$5 RETURNING *`,
      [
        name,
        JSON.stringify(address),
        JSON.stringify(bank_details),
        invoice_prefix,
        req.user!.businessId,
      ]
    );
    res.json(business);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/users", requireRole(["admin"]), async (req, res) => {
  try {
    const { rows } = await db.query(
      `SELECT id,name,email,role,is_active,created_at,last_login_at
       FROM users WHERE business_id=$1`,
      [req.user!.businessId]
    );
    res.json(rows);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;