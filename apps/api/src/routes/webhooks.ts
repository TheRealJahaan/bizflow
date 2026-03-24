import { Router } from "express";
import crypto from "crypto";
import { db } from "../db";

const router = Router();

router.post("/razorpay", async (req, res) => {
  try {
    const signature = req.headers["x-razorpay-signature"];
    const body = JSON.stringify(req.body);
    const expected = crypto
      .createHmac("sha256", process.env.RAZORPAY_WEBHOOK_SECRET || "")
      .update(body)
      .digest("hex");

    if (signature !== expected) {
      return res.status(400).json({ error: "Invalid signature" });
    }

    const { event, payload } = req.body;

    if (event === "payment.captured") {
      const payment = payload.payment.entity;
      const invoiceId = payment.notes?.invoice_id;

      if (invoiceId) {
        const { rows: [invoice] } = await db.query(
          "SELECT * FROM invoices WHERE id=$1",
          [invoiceId]
        );

        if (invoice) {
          const amount = payment.amount / 100;
          const newPaid = parseFloat(invoice.amount_paid) + amount;
          const newStatus =
            newPaid >= parseFloat(invoice.total_amount) ? "paid" : "partial";

          await db.transaction(async (client) => {
            await client.query(
              `INSERT INTO payments
               (invoice_id,business_id,amount,payment_date,payment_method,gateway_payment_id,gateway_response)
               VALUES ($1,$2,$3,CURRENT_DATE,'razorpay',$4,$5)`,
              [invoiceId, invoice.business_id, amount, payment.id, JSON.stringify(payment)]
            );
            await client.query(
              "UPDATE invoices SET amount_paid=$1,status=$2,updated_at=NOW() WHERE id=$3",
              [newPaid, newStatus, invoiceId]
            );
          });
        }
      }
    }

    res.json({ received: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;