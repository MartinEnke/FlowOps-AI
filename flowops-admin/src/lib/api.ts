// flowops-admin/src/lib/api.ts

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "http://localhost:3000";
const OP_TOKEN = process.env.NEXT_PUBLIC_OPERATOR_TOKEN || "";

function authHeaders(): HeadersInit {
  return OP_TOKEN ? { Authorization: `Bearer ${OP_TOKEN}` } : {};
}

async function parseResponse(res: Response) {
  const text = await res.text();
  if (!text) return null;

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export async function apiGet<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: "GET",
    cache: "no-store",
    headers: {
      ...authHeaders()
    }
  });

  const data = await parseResponse(res);
  if (!res.ok) {
    throw new Error(`GET ${path} failed: ${res.status} ${JSON.stringify(data)}`);
  }
  return data as T;
}

/**
 * POST helper:
 * - If body is undefined/null -> send NO body and NO content-type
 * - If body is provided -> send JSON with content-type
 */
export async function apiPost<T>(path: string, body?: unknown): Promise<T> {
  const hasBody = body !== undefined && body !== null;

  const res = await fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: {
      ...authHeaders(),
      ...(hasBody ? { "Content-Type": "application/json" } : {})
    },
    ...(hasBody ? { body: JSON.stringify(body) } : {})
  });

  const data = await parseResponse(res);
  if (!res.ok) {
    throw new Error(
      `POST ${path} failed: ${res.status} ${JSON.stringify(data)}`
    );
  }
  return data as T;
}
