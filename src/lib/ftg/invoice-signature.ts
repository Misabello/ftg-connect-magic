/** Firma HMAC compartida entre el Apps Script y el endpoint de ingesta. */

export const MAX_AGE_SECONDS = 300;

function toHex(buffer: ArrayBuffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

export async function hmacHex(secret: string, message: string) {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return toHex(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(message)));
}

export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function sha256Hex(bytes: Uint8Array) {
  return toHex(await crypto.subtle.digest("SHA-256", bytes as unknown as ArrayBuffer));
}

export function signaturePayload(timestamp: string, requestId: string, body: string) {
  return `${timestamp}.${requestId}.${body}`;
}

/** Verifica firma, antigüedad y presencia de cabeceras. */
export async function verifySignature(input: {
  secret: string;
  timestamp: string;
  requestId: string;
  signature: string;
  body: string;
  nowSeconds?: number;
}): Promise<{ ok: true } | { ok: false; reason: "missing_signature" | "stale_request" | "invalid_signature" }> {
  if (!input.timestamp || !input.requestId || !input.signature) return { ok: false, reason: "missing_signature" };
  const now = input.nowSeconds ?? Math.floor(Date.now() / 1000);
  const age = Math.abs(now - Number(input.timestamp));
  if (!Number.isFinite(age) || age > MAX_AGE_SECONDS) return { ok: false, reason: "stale_request" };
  const expected = await hmacHex(input.secret, signaturePayload(input.timestamp, input.requestId, input.body));
  if (!safeEqual(expected, input.signature.toLowerCase())) return { ok: false, reason: "invalid_signature" };
  return { ok: true };
}