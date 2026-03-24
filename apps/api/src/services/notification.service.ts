import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT || "587"),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

export async function sendEmailReminder(invoice: any) {
  if (
    !process.env.SMTP_USER ||
    process.env.SMTP_USER === "your@gmail.com"
  ) {
    console.log(
      `SMTP not configured — skipping reminder for ${invoice.invoice_number}`
    );
    return;
  }

  const totalAmount  = parseFloat(invoice.total_amount) || 0;
  const amountPaid   = parseFloat(invoice.amount_paid)  || 0;
  const balance      = totalAmount - amountPaid;
  const dueDate      = new Date(invoice.due_date);
  const now          = new Date();
  const daysOverdue  = Math.max(
    0,
    Math.floor((now.getTime() - dueDate.getTime()) / 86400000)
  );

  const subject =
    daysOverdue > 0
      ? `[Overdue ${daysOverdue} days] Invoice ${invoice.invoice_number}`
      : `Payment Reminder — Invoice ${invoice.invoice_number}`;

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
      <div style="background:#0d7a5f;padding:20px;text-align:center">
        <h2 style="color:#fff;margin:0">${invoice.business_name}</h2>
      </div>
      <div style="padding:24px">
        <p>Dear ${invoice.client_name},</p>
        <p>This is a reminder for Invoice
          <strong>${invoice.invoice_number}</strong>.
        </p>
        <div style="background:#f4f1eb;border-radius:8px;padding:16px;margin:16px 0">
          <p><strong>Invoice No:</strong> ${invoice.invoice_number}</p>
          <p><strong>Amount Due:</strong>
            ₹${balance.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </p>
          <p><strong>Due Date:</strong>
            ${dueDate.toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "long",
              year: "numeric",
            })}
          </p>
          ${
            daysOverdue > 0
              ? `<p style="color:#c0344a;font-weight:600">
                   Overdue by ${daysOverdue} day${daysOverdue > 1 ? "s" : ""}
                 </p>`
              : ""
          }
        </div>
        ${
          invoice.pdf_url
            ? `
                 href="${invoice.pdf_url}"
                 style="background:#0d7a5f;color:#fff;padding:10px 20px;
                        border-radius:6px;text-decoration:none;
                        display:inline-block;margin-top:10px"
               >
                 View Invoice PDF
               </a>`
            : ""
        }
        <p style="margin-top:20px;font-size:12px;color:#5a5a5a">
          Please process the payment at your earliest convenience.
          If you have already paid, kindly ignore this reminder.
        </p>
      </div>
      <div style="background:#f4f1eb;padding:16px;text-align:center;
                  font-size:11px;color:#9a9a9a">
        Sent via BizFlow · Automated reminder from ${invoice.business_name}
      </div>
    </div>
  `;

  await transporter.sendMail({
    from: `"${invoice.business_name}" <${process.env.SMTP_USER}>`,
    to:      invoice.email,
    subject,
    html,
  });
}

export async function sendWeeklySummaryEmail(user: any, data: any) {
  if (
    !process.env.SMTP_USER ||
    process.env.SMTP_USER === "your@gmail.com"
  ) {
    return;
  }

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto">
      <div style="background:#0d7a5f;padding:20px;text-align:center">
        <h2 style="color:#fff;margin:0">Weekly Summary</h2>
        <p style="color:rgba(255,255,255,0.7);margin:4px 0 0">
          ${data.business_name}
        </p>
      </div>
      <div style="padding:24px">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:20px">
          ${[
            ["Revenue This Week",   `₹${(data.weekly_revenue   || 0).toLocaleString("en-IN")}`],
            ["Invoices Sent",        String(data.invoices_sent  || 0)],
            ["Payments Received",   `₹${(data.payments_received|| 0).toLocaleString("en-IN")}`],
            ["Outstanding",         `₹${(data.outstanding      || 0).toLocaleString("en-IN")}`],
          ]
            .map(
              ([label, value]) => `
                <div style="background:#f4f1eb;border-radius:8px;
                            padding:14px;text-align:center">
                  <div style="font-size:10px;color:#9a9a9a;
                              text-transform:uppercase;letter-spacing:0.06em">
                    ${label}
                  </div>
                  <div style="font-size:18px;font-weight:800;
                              color:#0d7a5f;margin-top:4px">
                    ${value}
                  </div>
                </div>`
            )
            .join("")}
        </div>
        <p style="font-size:12px;color:#9a9a9a">
          Log in to BizFlow to view detailed analytics.
        </p>
      </div>
    </div>
  `;

  await transporter.sendMail({
    from:    `"BizFlow" <${process.env.SMTP_USER}>`,
    to:      user.email,
    subject: `Weekly Summary — ${data.business_name}`,
    html,
  });
}