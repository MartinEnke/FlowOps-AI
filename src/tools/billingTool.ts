import { ToolResult } from "./types";

export async function getBillingSummary(input: {
  customerId: string;
}): Promise<ToolResult<{
  lastInvoiceId: string;
  lastInvoiceAmount: number;
  invoiceStatus: "paid" | "open" | "void";
  refundableAmount: number;
}>> {
  if (!input.customerId) return { ok: false, error: "customerId is required" };

  return {
    ok: true,
    data: {
      lastInvoiceId: "inv_123",
      lastInvoiceAmount: 49,
      invoiceStatus: "paid",
      refundableAmount: 49
    }
  };
}