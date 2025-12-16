export type Mode = "shadow" | "live";

export type ChatRequest = {
  customerId: string;
  message: string;
  mode?: Mode; // default shadow
};

export type ChatResponse = {
  reply: string;
  mode: Mode;
  ticketId?: string;
  escalated: boolean;
  confidence: number;
  actions: string[];
};
