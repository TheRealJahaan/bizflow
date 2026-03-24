import { Router } from "express";
import { db } from "../db";
import { authMiddleware } from "../middleware/auth";
import ExcelJS from "exceljs";

const router = Router();
router.use(authMiddleware);

// ─── GST helpers inlined to avoid path issues ────────────────────────────────

function formatGSTDate(d: Date): string {
  return [
    String(d.getDate()).padStart(2, "0"),
    String(d.getMonth() + 1).padStart(2, "0"),
    d.getFullYear(),
  ].join("-");
}

function buildGSTR1(gstin: string, invoices: any[], period: { month: number; year: number }) {
  const b2bMap = new Map<string, any>();
  const b2csList: any[] = [];
  let nilSupply = 0;

  for (const inv of invoices) {
    if (inv.client_gstin) {
      const invEntry = {
        inum: inv.invoice_number,
        idt: formatGSTDate(new Date(inv.invoice_date)),
        val: Number(inv.total_amount),
        pos: inv.buyer_state_code || "29",
        rchrg: "N",
        itms: (inv.line_items || []).map((item: any, i: number) => ({
          num: i + 1,
          itm_det: {
            txval: Number(item.unit_price * item.quantity),
            rt: Number(item.gst_rate),
            camt: Number(item.cgst_amount || 0),
            samt: Number(item.sgst_amount || 0),
            iamt: Number(item.igst_amount || 0),
          },
        })),
      };
      const existing = b2bMap.get(inv.client_gstin);
      if (existing) {
        existing.inv.push(invEntry);
      } else {
        b2bMap.set(inv.client_gstin, { ctin: inv.client_gstin, inv: [invEntry] });
      }
    } else if (inv.supply_type === "exempt") {
      nilSupply += Number(inv.subtotal || 0);
    } else {
      const pos = inv.buyer_state_code || "29";
      const existing = b2csList.find((r) => r.pos === pos);
      if (existing) {
        existing.txval += Number(inv.subtotal || 0);
        existing.camt += Number(inv.cgst_amount || 0);
        existing.samt += Number(inv.sgst_amount || 0);
        existing.iamt += Number(inv.igst_amount || 0);
      } else {
        b2csList.push({
          typ: "OE",
          pos,
          txval: Number(inv.subtotal || 0),
          rt: 18,
          iamt: Number(inv.igst_amount || 0),
          camt: Number(inv.cgst_amount || 0),
          samt: Number(inv.sgst_amount || 0),
        });
      }
    }
  }

  return {
    gstin,
    fp: `${String(period.month).padStart(2, "0")}${period.year}`,
    b2b: Array.from(b2bMap.values()),
    b2cs: b2csList,
    nil: {
      inv: [{ sply_ty: "INTRB2B", nil_amt: nilSupply, expt_amt: 0, ngsup_amt: 0 }],
    },
    version: "1.1",
  };
}

function buildGSTR3B(
  gstin: string,
  period: { month: number; year: number },
  data: {
    outward_taxable: number;
    outward_cgst: number;
    outward_sgst: number;
    outward_igst: number;
    nil_exempt: number;
    itc_cgst: number;
    itc_sgst: number;
    itc_igst: number;
  }
) {
  const netCGST = Math.max(0, data.outward_cgst - data.itc_cgst);
  const netSGST = Math.max(0, data.outward_sgst - data.itc_sgst);
  const netIGST = Math.max(0, data.outward_igst - data.itc_igst);

  return {
    gstin,
    ret_period: `${String(period.month).padStart(2, "0")}${period.year}`,
    outward_taxable: data.outward_taxable,
    outward_cgst: data.outward_cgst,
    outward_sgst: data.outward_sgst,
    outward_igst: data.outward_igst,
    itc_cgst: data.itc_cgst,
    itc_sgst: data.itc_sgst,
    itc_igst: data.itc_igst,
    net_cgst: netCGST,
    net_sgst: netSGST,
    net_igst: netIGST,
    total_payable: netCGST + netSGST + netIGST,
  };
}

// ─── Routes ──────────────────────────────────────────────────────────────────

router.get("/summary", async (req, res) => {
  try {
    const { month, year } = req.query;
    const businessId = req.user!.businessId;

    const [{ rows: [out] }, { rows: [inp] }] = await Promise.all([
      db.query(
        `SELECT
           COALESCE(SUM(subtotal - discount_amount), 0) AS taxable_value,
           COALESCE(SUM(cgst_amount), 0)                AS cgst,
           COALESCE(SUM(sgst_amount), 0)                AS sgst,
           COALESCE(SUM(igst_amount), 0)                AS igst,
           COALESCE(SUM(cgst_amount + sgst_amount + igst_amount), 0) AS total_output_tax
         FROM invoices
         WHERE business_id = $1
           AND EXTRACT(MONTH FROM invoice_date) = $2
           AND EXTRACT(YEAR  FROM invoice_date) = $3
           AND status != 'cancelled'`,
        [businessId, month, year]
      ),
      db.query(
        `SELECT
           COALESCE(SUM(amount), 0)      AS total_purchases,
           COALESCE(SUM(cgst_amount), 0) AS itc_cgst,
           COALESCE(SUM(sgst_amount), 0) AS itc_sgst,
           COALESCE(SUM(igst_amount), 0) AS itc_igst,
           COALESCE(SUM(gst_amount),  0) AS total_itc
         FROM expenses
         WHERE business_id = $1
           AND EXTRACT(MONTH FROM expense_date) = $2
           AND EXTRACT(YEAR  FROM expense_date) = $3
           AND itc_eligible = true`,
        [businessId, month, year]
      ),
    ]);

    const netPayable = Math.max(
      0,
      parseFloat(out.total_output_tax) - parseFloat(inp.total_itc)
    );

    res.json({
      output_tax: out,
      input_tax: inp,
      net_payable: netPayable,
      period: { month, year },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/gstr1", async (req, res) => {
  try {
    const { month, year, format } = req.query;
    const businessId = req.user!.businessId;

    const { rows: [business] } = await db.query(
      "SELECT * FROM businesses WHERE id = $1",
      [businessId]
    );

    const { rows: invoices } = await db.query(
      `SELECT i.*,
              c.gstin      AS client_gstin,
              c.state_code AS buyer_state_code
       FROM invoices i
       LEFT JOIN clients c ON i.client_id = c.id
       WHERE i.business_id = $1
         AND EXTRACT(MONTH FROM i.invoice_date) = $2
         AND EXTRACT(YEAR  FROM i.invoice_date) = $3
         AND i.status != 'cancelled'`,
      [businessId, month, year]
    );

    const gstr1 = buildGSTR1(
      business.gstin,
      invoices,
      { month: parseInt(month as string), year: parseInt(year as string) }
    );

    if (format === "excel") {
      const workbook = new ExcelJS.Workbook();
      const sheet = workbook.addWorksheet("B2B");

      sheet.columns = [
        { header: "GSTIN",          key: "gstin", width: 22 },
        { header: "Invoice No",     key: "inum",  width: 20 },
        { header: "Invoice Date",   key: "idt",   width: 15 },
        { header: "Total Value",    key: "val",   width: 15 },
        { header: "Place of Supply",key: "pos",   width: 15 },
        { header: "Reverse Charge", key: "rchrg", width: 15 },
      ];

      for (const b2b of gstr1.b2b) {
        for (const inv of b2b.inv) {
          sheet.addRow({
            gstin: b2b.ctin,
            inum:  inv.inum,
            idt:   inv.idt,
            val:   inv.val,
            pos:   inv.pos,
            rchrg: inv.rchrg,
          });
        }
      }

      res.setHeader(
        "Content-Disposition",
        `attachment; filename=GSTR1_${month}_${year}.xlsx`
      );
      res.setHeader(
        "Content-Type",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
      );
      await workbook.xlsx.write(res);
      return res.end();
    }

    res.json(gstr1);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/gstr3b", async (req, res) => {
  try {
    const { month, year } = req.query;
    const businessId = req.user!.businessId;

    const { rows: [business] } = await db.query(
      "SELECT * FROM businesses WHERE id = $1",
      [businessId]
    );

    const [{ rows: [out] }, { rows: [inp] }] = await Promise.all([
      db.query(
        `SELECT
           COALESCE(SUM(subtotal - discount_amount), 0)                           AS outward_taxable,
           COALESCE(SUM(cgst_amount), 0)                                          AS outward_cgst,
           COALESCE(SUM(sgst_amount), 0)                                          AS outward_sgst,
           COALESCE(SUM(igst_amount), 0)                                          AS outward_igst,
           COALESCE(SUM(subtotal) FILTER (WHERE supply_type = 'exempt'), 0)       AS nil_exempt
         FROM invoices
         WHERE business_id = $1
           AND EXTRACT(MONTH FROM invoice_date) = $2
           AND EXTRACT(YEAR  FROM invoice_date) = $3
           AND status != 'cancelled'`,
        [businessId, month, year]
      ),
      db.query(
        `SELECT
           COALESCE(SUM(cgst_amount), 0) AS itc_cgst,
           COALESCE(SUM(sgst_amount), 0) AS itc_sgst,
           COALESCE(SUM(igst_amount), 0) AS itc_igst
         FROM expenses
         WHERE business_id = $1
           AND EXTRACT(MONTH FROM expense_date) = $2
           AND EXTRACT(YEAR  FROM expense_date) = $3
           AND itc_eligible = true`,
        [businessId, month, year]
      ),
    ]);

    const gstr3b = buildGSTR3B(
      business.gstin,
      { month: parseInt(month as string), year: parseInt(year as string) },
      { ...out, ...inp }
    );

    res.json(gstr3b);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;