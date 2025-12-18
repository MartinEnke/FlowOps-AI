// src/ai/openaiClient.ts

type JsonSchema = Record<string, any>;

export class OpenAIError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = "OpenAIError";
  }
}

function getApiKey(): string {
  // Support both names so you don't get stuck.
  return (
    process.env.OPENAI_API_KEY ||
    process.env.OPENAPIKEY || // fallback if you used this name
    ""
  ).trim();
}

/**
 * Extract assistant output text from OpenAI Responses API payload.
 * Some responses provide `output_text`, but the canonical structure is:
 *   output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: "..." }, ...] }]
 */
function extractOutputText(resp: any): string {
  const direct =
    typeof resp?.output_text === "string" ? resp.output_text.trim() : "";
  if (direct) return direct;

  const output = Array.isArray(resp?.output) ? resp.output : [];
  const texts: string[] = [];

  for (const item of output) {
    if (item?.type !== "message") continue;
    if (!Array.isArray(item?.content)) continue;

    for (const part of item.content) {
      if (part?.type === "output_text" && typeof part.text === "string") {
        const t = part.text.trim();
        if (t) texts.push(t);
      }
    }
  }

  if (texts.length) return texts.join("\n");

  // Provide diagnostics to make failures actionable.
  const types = output.map((o: any) => o?.type).filter(Boolean);
  throw new OpenAIError(
    `OpenAI returned no assistant output text. output item types=${JSON.stringify(types)}`
  );
}

/**
 * Generate JSON that conforms to the provided JSON schema using OpenAI Responses API.
 * This function returns parsed JSON (object) and throws OpenAIError on failure.
 */
export async function generateStructuredJson(params: {
  model?: string;
  system: string;
  user: string;
  schemaName: string;
  schema: JsonSchema;
  timeoutMs?: number;
}): Promise<any> {
  const apiKey = getApiKey();
  if (!apiKey) {
    throw new OpenAIError(
      "Missing OPENAI_API_KEY (or OPENAPIKEY) in environment"
    );
  }

  const model = (params.model || process.env.OPENAI_MODEL || "gpt-4o-mini").trim();
  const timeoutMs = params.timeoutMs ?? 20_000;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        input: [
          { role: "system", content: params.system },
          { role: "user", content: params.user }
        ],
        // Structured outputs / JSON schema (strict)
        text: {
          format: {
            type: "json_schema",
            name: params.schemaName,
            strict: true,
            schema: params.schema
          }
        }
      })
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new OpenAIError(`OpenAI error ${res.status}: ${txt}`, res.status);
    }

    const data: any = await res.json();

    const text = extractOutputText(data);

    try {
      return JSON.parse(text);
    } catch (e: any) {
      // Include a short snippet for debugging (without dumping huge content)
      const snippet = text.slice(0, 300);
      throw new OpenAIError(
        `Failed to parse JSON from OpenAI output. Snippet="${snippet}" Error=${String(
          e?.message ?? e
        )}`
      );
    }
  } catch (e: any) {
    // Normalize AbortError message for retries
    if (e?.name === "AbortError") {
      throw new OpenAIError(`OpenAI request timed out after ${timeoutMs}ms`);
    }
    throw e;
  } finally {
    clearTimeout(timeout);
  }
}
