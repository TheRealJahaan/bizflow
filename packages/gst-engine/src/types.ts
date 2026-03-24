export interface LineItem {
  description: string;
  hsn_sac: string;
  quantity: number;
  unit_price: number;
  gst_rate: number;
  discount_percent?: number;
}

export interface GSTBreakdown {
  subtotal: number;
  discount: number;
  taxable_value: number;
  cgst_rate: number;
  cgst_amount: number;
  sgst_rate: number;
  sgst_amount: number;
  igst_rate: number;
  igst_amount: number;
  total_gst: number;
  grand_total: number;
  reverse_charge: boolean;
}

export type SupplyType =
  | "intra_state"
  | "inter_state"
  | "export"
  | "sez"
  | "exempt";

export interface GSTR1Payload {
  gstin: string;
  fp: string;
  b2b: B2BRecord[];
  b2cs: B2CSRecord[];
  nil: NilRecord;
  version: string;
}

export interface B2BRecord {
  ctin: string;
  inv: B2BInvoice[];
}

export interface B2BInvoice {
  inum: string;
  idt: string;
  val: number;
  pos: string;
  rchrg: "Y" | "N";
  itms: B2BItem[];
}

export interface B2BItem {
  num: number;
  itm_det: {
    txval: number;
    rt: number;
    camt: number;
    samt: number;
    iamt: number;
  };
}

export interface B2CSRecord {
  typ: "OE";
  pos: string;
  txval: number;
  rt: number;
  iamt: number;
  camt: number;
  samt: number;
}

export interface NilRecord {
  inv: Array<{
    sply_ty: string;
    nil_amt: number;
    expt_amt: number;
    ngsup_amt: number;
  }>;
}

export interface GSTR3BPayload {
  gstin: string;
  ret_period: string;
  outward_taxable: number;
  outward_cgst: number;
  outward_sgst: number;
  outward_igst: number;
  itc_cgst: number;
  itc_sgst: number;
  itc_igst: number;
  net_cgst: number;
  net_sgst: number;
  net_igst: number;
  total_payable: number;
}