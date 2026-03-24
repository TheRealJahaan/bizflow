import cron from "node-cron";
import { db } from "../db";
import { generateInvoiceNumber } from "../utils/sequence";
import { logger } from "../utils/logger";

cron.schedule("30 1 * * *", async () => {
  logger.info("Running recurring invoice job");
  try {
    const { rows } = await db.query(
      `SELECT i.*, b.invoice_prefix
       FROM invoices i
       JOIN businesses b ON i.business_id=b.id
       WHERE i.is_recurring=true
         AND i.next_recurring_date=CURRENT_DATE
         AND i.status!='cancelled'`
    );

    for (const tmpl of rows) {
      try {
        const invoiceNumber = await generateInvoiceNumber(
          tmpl.business_id,
          tmpl.invoice_prefix
        );

        const dueDate = new Date(tmpl.next_recurring_date);
        dueDate.setDate(dueDate.getDate() + 30);

        const nextDate = new Date(tmpl.next_recurring_date);
        nextDate.setMonth(nextDate.getMonth() + 1);

        await db.query(
          `INSERT INTO invoices
           (business_id,client_id,invoice_number,invoice_date,due_date,
            supply_type,line_items,subtotal,discount_amount,
            cgst_amount,sgst_amount,igst_amount,total_amount,
            notes,terms,is_recurring,recurring_interval,next_recurring_date,status)
           SELECT business_id,client_id,$1,CURRENT_DATE,$2,
                  supply_type,line_items,subtotal,discount_amount,
                  cgst_amount,sgst_amount,igst_amount,total_amount,
                  notes,terms,is_recurring,recurring_interval,$3,'sent'
           FROM invoices WHERE id=$4`,
          [
            invoiceNumber,
            dueDate.toISOString().split("T")[0],
            nextDate.toISOString().split("T")[0],
            tmpl.id,
          ]
        );

        await db.query(
          "UPDATE invoices SET next_recurring_date=$1 WHERE id=$2",
          [nextDate.toISOString().split("T")[0], tmpl.id]
        );

        logger.info(`Recurring invoice created: ${invoiceNumber}`);
      } catch (err) {
        logger.error(`Failed recurring invoice from ${tmpl.invoice_number}`, err);
      }
    }
  } catch (err) {
    logger.error("Recurring job failed", err);
  }
});