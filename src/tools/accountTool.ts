import { ToolResult } from "./types";

export async function getAccountStatus(input: {
  customerId: string;
}): Promise<ToolResult<{
  plan: "free" | "pro" | "enterprise";
  apiKeyStatus: "active" | "revoked" | "expired";
  slaHours: number;
  email: string;
}>> {
  // MOCK DATA (replace later with real API call)
  if (!input.customerId) return { ok: false, error: "customerId is required" };

  return {
    ok: true,
    data: {
      plan: "pro",
      apiKeyStatus: "expired",
      slaHours: 24,
      email: "customer@example.com"
    }
  };
}
