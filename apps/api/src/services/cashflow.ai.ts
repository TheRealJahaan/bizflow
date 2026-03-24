import { db } from "../db";

function linearRegression(data: number[]) {
  const n = data.length;
  if (n < 2) return { slope: 0, intercept: data[0] || 0, r2: 0 };

  const xMean = (n - 1) / 2;
  const yMean = data.reduce((a, b) => a + b, 0) / n;
  let ssxy = 0, ssxx = 0, ssyy = 0;

  for (let i = 0; i < n; i++) {
    ssxy += (i - xMean) * (data[i] - yMean);
    ssxx += (i - xMean) ** 2;
    ssyy += (data[i] - yMean) ** 2;
  }

  const slope = ssxx !== 0 ? ssxy / ssxx : 0;
  const intercept = yMean - slope * xMean;
  const r2 = ssyy !== 0 ? (ssxy ** 2) / (ssxx * ssyy) : 0;

  return { slope, intercept, r2 };
}

export async function predictCashFlow(businessId: string, periods = 3) {
  const { rows: revRows } = await db.query(
    `SELECT COALESCE(SUM(total_amount),0) as revenue
     FROM invoices
     WHERE business_id=$1
       AND status NOT IN ('draft','cancelled')
       AND invoice_date >= NOW() - INTERVAL '13 months'
     GROUP BY TO_CHAR(invoice_date,'YYYY-MM')
     ORDER BY TO_CHAR(invoice_date,'YYYY-MM')`,
    [businessId]
  );

  const { rows: expRows } = await db.query(
    `SELECT COALESCE(SUM(amount),0) as expenses
     FROM expenses
     WHERE business_id=$1
       AND expense_date >= NOW() - INTERVAL '13 months'
     GROUP BY TO_CHAR(expense_date,'YYYY-MM')
     ORDER BY TO_CHAR(expense_date,'YYYY-MM')`,
    [businessId]
  );

  const revenues = revRows.map((r) => parseFloat(r.revenue));
  const expenses = expRows.map((e) => parseFloat(e.expenses));

  const revReg = linearRegression(revenues.length ? revenues : [0, 0]);
  const expReg = linearRegression(expenses.length ? expenses : [0, 0]);

  const predictions = [];

  for (let i = 1; i <= periods; i++) {
    const futureIdx = revenues.length + i;
    const futureDate = new Date();
    futureDate.setMonth(futureDate.getMonth() + i);

    const seasonalFactor =
      revenues[futureIdx % 12] && revReg.intercept
        ? revenues[futureIdx % 12] /
          Math.max(1, revReg.slope * (futureIdx % 12) + revReg.intercept)
        : 1;

    const trendRev = revReg.slope * futureIdx + revReg.intercept;
    const predictedRevenue = Math.max(0, Math.round(trendRev * seasonalFactor));
    const predictedExpenses = Math.max(
      0,
      Math.round(expReg.slope * futureIdx + expReg.intercept)
    );

    const confidence = Math.max(0.5, Math.min(0.92, revReg.r2 - i * 0.05));
    const ratio = predictedExpenses / Math.max(1, predictedRevenue);

    predictions.push({
      month: futureDate.toISOString().slice(0, 7),
      predicted_revenue: predictedRevenue,
      predicted_expenses: predictedExpenses,
      net_cash_flow: predictedRevenue - predictedExpenses,
      confidence: Math.round(confidence * 100) / 100,
      risk_level: ratio > 0.85 ? "high" : ratio > 0.7 ? "medium" : "low",
    });
  }

  return predictions;
}