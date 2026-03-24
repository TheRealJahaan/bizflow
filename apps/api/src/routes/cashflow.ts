import { Router } from "express";
import { db } from "../db";
import { authMiddleware } from "../middleware/auth";
import { predictCashFlow } from "../services/cashflow.ai";

const router = Router();
router.use(authMiddleware);

router.get("/dashboard", async (req, res) => {
  try {
    const businessId = req.user!.businessId;

    const [monthly, outstanding, topClients] = await Promise.all([
      db.query(
        `SELECT
           TO_CHAR(invoice_date,'YYYY-MM') as month,
           COALESCE(SUM(total_amount),0) as revenue,
           COALESCE(SUM(total_amount) FILTER (WHERE status='paid'),0) as collected
         FROM invoices
         WHERE business_id=$1
           AND invoice_date >= NOW() - INTERVAL '12 months'
         GROUP BY month ORDER BY month`,
        [businessId]
      ),
      db.query(
        `SELECT
           COALESCE(SUM(total_amount-amount_paid),0) as outstanding,
           COUNT(*) FILTER (WHERE due_date < CURRENT_DATE) as overdue_count,
           COALESCE(SUM(total_amount-amount_paid)
             FILTER (WHERE due_date < CURRENT_DATE),0) as overdue_amount
         FROM invoices
         WHERE business_id=$1
           AND status NOT IN ('paid','cancelled')`,
        [businessId]
      ),
      db.query(
        `SELECT c.name,
                SUM(i.total_amount) as revenue,
                ROUND(SUM(i.total_amount)/SUM(SUM(i.total_amount)) OVER ()*100,1) as pct
         FROM invoices i
         JOIN clients c ON i.client_id=c.id
         WHERE i.business_id=$1
           AND i.invoice_date >= NOW() - INTERVAL '6 months'
         GROUP BY c.id,c.name
         ORDER BY revenue DESC LIMIT 5`,
        [businessId]
      ),
    ]);

    const predictions = await predictCashFlow(businessId, 3);

    res.json({
      monthly_trend: monthly.rows,
      outstanding: outstanding.rows[0],
      top_clients: topClients.rows,
      predictions,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/predict", async (req, res) => {
  try {
    const { periods = "3" } = req.query;
    const predictions = await predictCashFlow(
      req.user!.businessId,
      parseInt(periods as string)
    );
    res.json(predictions);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;