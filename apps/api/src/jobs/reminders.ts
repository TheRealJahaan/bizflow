import cron from "node-cron";
import { db } from "../db";
import { sendEmailReminder } from "../services/notification.service";
import { logger } from "../utils/logger";

cron.schedule("30 3 * * *", async () => {
  logger.info("Running daily reminder job");
  try {
    const { rows } = await db.query(
      `SELECT i.*, c.email, c.phone, c.name as client_name, b.name as business_name
       FROM invoices i
       JOIN clients c ON i.client_id=c.id
       JOIN businesses b ON i.business_id=b.id
       WHERE i.status IN ('sent','partial','overdue')
         AND i.due_date < CURRENT_DATE
         AND (i.last_reminder_at IS NULL OR i.last_reminder_at < NOW() - INTERVAL '3 days')
         AND c.email IS NOT NULL
       LIMIT 50`
    );

    for (const invoice of rows) {
      try {
        await sendEmailReminder(invoice);
        await db.query(
          `UPDATE invoices SET last_reminder_at=NOW(),
           reminder_count=reminder_count+1 WHERE id=$1`,
          [invoice.id]
        );
      } catch (err) {
        logger.error(`Reminder failed for ${invoice.invoice_number}`, err);
      }
    }
  } catch (err) {
    logger.error("Reminder job failed", err);
  }
});