import { GSTR1Payload, B2BRecord, B2CSRecord, NilRecord } from "./types";

function formatDate(d: Date): string {
  return [
    String(d.getDate()).padStart(2, "0"),
    String(d.getMonth() + 1).padStart(2, "0"),
    d.getFullYear(),
  ].join("-");
}

export function generateGSTR1(
  gstin: string,
  invoices: any[],
  period: { month: number; year: number }
): GSTR1Payload {
  const b2bMap = new Map<string, B2BRecord>();
  const b2csList: B2CSRecord[] = [];
  let nilSupply = 0;

  for (const inv of invoices) {
    if (inv.client_gstin) {
      const invEntry = {
        inum: inv.invoice_number,
        idt: formatDate(new Date(inv.invoice_date)),
        val: Number(inv.total_amount),
        pos: inv.buyer_state_code || "29",
        rchrg: "N" as const,
        itms: (inv.line_items || []).map((item: any, i: number) => ({
          num: i + 1,
          itm_det: {
            txval: Number(item.taxable_value || item.unit_price * item.quantity),
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
        b2bMap.set(inv.client_gstin, {
          ctin: inv.client_gstin,
          inv: [invEntry],
        });
      }
    } else if (inv.supply_type === "exempt") {
      nilSupply += Number(inv.taxable_value || 0);
    } else {
      const existing = b2csList.find(
        (r) => r.pos === (inv.buyer_state_code || "29")
      );
      if (existing) {
        existing.txval += Number(inv.taxable_value || 0);
        existing.camt += Number(inv.cgst_amount || 0);
        existing.samt += Number(inv.sgst_amount || 0);
        existing.iamt += Number(inv.igst_amount || 0);
      } else {
        b2csList.push({
          typ: "OE",
          pos: inv.buyer_state_code || "29",
          txval: Number(inv.taxable_value || 0),
          rt: 18,
          iamt: Number(inv.igst_amount || 0),
          camt: Number(inv.cgst_amount || 0),
          samt: Number(inv.sgst_amount || 0),
        });
      }
    }
  }

  const nil: NilRecord = {
    inv: [
      {
        sply_ty: "INTRB2B",
        nil_amt: nilSupply,
        expt_amt: 0,
        ngsup_amt: 0,
      },
    ],
  };

  return {
    gstin,
    fp: `${String(period.month).padStart(2, "0")}${period.year}`,
    b2b: Array.from(b2bMap.values()),
    b2cs: b2csList,
    nil,
    version: "1.1",
  };
}