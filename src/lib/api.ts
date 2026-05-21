/**
 * Client API pour asuka-server.
 * Toutes les routes /api/* sont proxiées vers le backend en dev (voir vite.config.ts).
 * En production, VITE_API_URL pointe vers le serveur hébergé.
 */
import { getAuthToken } from "@/context/AuthProvider";

export const API_BASE_URL = import.meta.env.VITE_API_URL ?? "";
const BASE = API_BASE_URL;

async function authHeaders(): Promise<Record<string, string>> {
  const token = getAuthToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

/** POST /api/coach — streaming SSE */
export async function callCoach(
  messages: { role: "user" | "assistant"; content: string }[],
  lang: string,
  profile: unknown
): Promise<ReadableStream<Uint8Array>> {
  const headers = await authHeaders();
  const resp = await fetch(`${BASE}/api/coach`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify({ messages, lang, profile }),
  });
  if (!resp.ok || !resp.body) {
    throw new Error(`Coach API error: ${resp.status}`);
  }
  return resp.body;
}

/** POST /api/profile-ai — analyze_profile | generate_cv | score_match */
export async function callProfileAI(payload: {
  action: "analyze_profile" | "generate_cv" | "score_match";
  lang?: string;
  profile?: unknown;
  opportunity?: unknown;
}): Promise<unknown> {
  const headers = await authHeaders();
  const resp = await fetch(`${BASE}/api/profile-ai`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
  if (!resp.ok) {
    const text = await resp.text();
    throw new Error(`Profile-AI API error ${resp.status}: ${text}`);
  }
  return resp.json();
}
