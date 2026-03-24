import "dotenv/config";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { json } from "express";
import { errorHandler } from "./middleware/error";

import authRoutes from "./routes/auth";
import invoiceRoutes from "./routes/invoices";
import paymentRoutes from "./routes/payments";
import clientRoutes from "./routes/clients";
import gstRoutes from "./routes/gst";
import cashflowRoutes from "./routes/cashflow";
import expenseRoutes from "./routes/expenses";
import businessRoutes from "./routes/business";
import webhookRoutes from "./routes/webhooks";

import "./jobs/reminders";
import "./jobs/recurring-invoices";

const app = express();
const PORT = process.env.PORT || 4000;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || "http://localhost:3000",
  credentials: true,
}));
app.use(json({ limit: "10mb" }));

app.get("/health", (_, res) =>
  res.json({ status: "ok", time: new Date().toISOString() })
);

app.use("/api/auth", authRoutes);
app.use("/api/invoices", invoiceRoutes);
app.use("/api/payments", paymentRoutes);
app.use("/api/clients", clientRoutes);
app.use("/api/gst", gstRoutes);
app.use("/api/cashflow", cashflowRoutes);
app.use("/api/expenses", expenseRoutes);
app.use("/api/business", businessRoutes);
app.use("/api/webhooks", webhookRoutes);

app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`BizFlow API running on http://localhost:${PORT}`);
});

export default app;