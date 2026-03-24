import { GSTR3BPayload } from "./types";

export function generateGSTR3B(
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
): GSTR3BPayload {
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