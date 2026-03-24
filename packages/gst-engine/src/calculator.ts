import { LineItem, GSTBreakdown, SupplyType } from "./types";

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function calculateGST(
  items: LineItem[],
  supplyType: SupplyType,
  sellerStateCode: string,
  buyerStateCode: string
): GSTBreakdown {
  const isExempt = supplyType === "exempt";
  const isExport = supplyType === "export" || supplyType === "sez";
  const isIntraState =
    !isExport &&
    (supplyType === "intra_state" ||
      (supplyType !== "inter_state" &&
        sellerStateCode === buyerStateCode));

  let subtotal = 0;
  let discountTotal = 0;
  let cgstTotal = 0;
  let sgstTotal = 0;
  let igstTotal = 0;

  for (const item of items) {
    const lineTotal = round2(item.quantity * item.unit_price);
    const discountAmt = round2(
      lineTotal * ((item.discount_percent || 0) / 100)
    );
    const taxable = round2(lineTotal - discountAmt);

    subtotal += lineTotal;
    discountTotal += discountAmt;

    if (isExempt || isExport) continue;

    const gstAmt = round2(taxable * (item.gst_rate / 100));

    if (isIntraState) {
      cgstTotal += round2(gstAmt / 2);
      sgstTotal += round2(gstAmt / 2);
    } else {
      igstTotal += gstAmt;
    }
  }

  const taxableValue = round2(subtotal - discountTotal);
  const totalGST = round2(cgstTotal + sgstTotal + igstTotal);

  return {
    subtotal: round2(subtotal),
    discount: round2(discountTotal),
    taxable_value: taxableValue,
    cgst_rate: isIntraState ? 9 : 0,
    cgst_amount: round2(cgstTotal),
    sgst_rate: isIntraState ? 9 : 0,
    sgst_amount: round2(sgstTotal),
    igst_rate: !isIntraState && !isExempt && !isExport ? 18 : 0,
    igst_amount: round2(igstTotal),
    total_gst: totalGST,
    grand_total: round2(taxableValue + totalGST),
    reverse_charge: false,
  };
}

export function getGSTRateForHSN(hsn: string): number {
  const rates: Record<string, number> = {
    "9983": 18,
    "9984": 18,
    "9985": 18,
    "9987": 18,
    "9988": 18,
    "9992": 18,
    "9993": 12,
    "9995": 28,
    "9997": 18,
    "3004": 12,
    "8471": 18,
    "8517": 18,
    "1006": 5,
    "0101": 0,
  };
  return rates[hsn.slice(0, 4)] ?? rates[hsn.slice(0, 2)] ?? 18;
}