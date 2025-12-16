export type Mode = "shadow" | "live";

export type ChatRequest = {
  customerId: string;
  message: string;
  mode?: Mode;
  requestId?: string; // ✅ NEW
};

export type ChatResponse = {
  reply: string;
  mode: Mode;
  ticketId?: string;
  escalated: boolean;
  confidence: number;
  actions: string[];
};

