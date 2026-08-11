import type { PendingOperation } from "@/lib/ftg/offline.db";

export type EmergencyBundle = {
  format: "ftg-emergency-batch";
  version: 1;
  bundleId: string;
  createdAt: string;
  deviceIdentifier: string;
  pointOfSaleId: string | null;
  operationCount: number;
  signature: string;
  salt: string;
  iv: string;
  ciphertext: string;
};

const encoder = new TextEncoder();

async function deriveKey(passphrase: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey("raw", encoder.encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: salt as unknown as BufferSource, iterations: 150_000, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
}

function toBase64(bytes: ArrayBuffer | Uint8Array) {
  const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let binary = "";
  view.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary);
}

function fromBase64(value: string) {
  return Uint8Array.from(atob(value), (c) => c.charCodeAt(0));
}

async function sign(text: string) {
  const digest = await crypto.subtle.digest("SHA-256", encoder.encode(text));
  return toBase64(digest);
}

/** Genera un lote de emergencia cifrado y firmado, sin credenciales. */
export async function exportEmergencyBundle(
  operations: PendingOperation[],
  passphrase: string,
): Promise<EmergencyBundle> {
  const payload = JSON.stringify(
    operations.map((op) => ({
      id: op.id,
      entityType: op.entityType,
      idempotencyKey: op.idempotencyKey,
      localSequence: op.localSequence,
      localCreatedAt: op.localCreatedAt,
      businessDate: op.businessDate,
      organizationId: op.organizationId,
      locationId: op.locationId,
      pointOfSaleId: op.pointOfSaleId,
      cashSessionId: op.cashSessionId,
      currency: op.currency,
      amount: op.amount,
      label: op.label,
      payload: op.payload,
      deviceId: op.deviceId,
      priority: op.priority,
      syncStatus: "pendiente",
      attempts: 0,
    })),
  );
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(passphrase, salt);
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv: iv as unknown as BufferSource }, key, encoder.encode(payload));

  return {
    format: "ftg-emergency-batch",
    version: 1,
    bundleId: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    deviceIdentifier: operations[0]?.deviceId ?? "",
    pointOfSaleId: operations[0]?.pointOfSaleId ?? null,
    operationCount: operations.length,
    signature: await sign(payload),
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(cipher),
  };
}

/** Descifra y valida la firma de un lote de emergencia. */
export async function importEmergencyBundle(bundle: EmergencyBundle, passphrase: string): Promise<PendingOperation[]> {
  if (bundle.format !== "ftg-emergency-batch") throw new Error("El archivo no es un lote de emergencia válido");
  const key = await deriveKey(passphrase, fromBase64(bundle.salt));
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(bundle.iv) as unknown as BufferSource },
      key,
      fromBase64(bundle.ciphertext),
    );
  } catch {
    throw new Error("La clave del lote es incorrecta");
  }
  const text = new TextDecoder().decode(plain);
  if ((await sign(text)) !== bundle.signature) throw new Error("La firma del lote no coincide");
  return JSON.parse(text) as PendingOperation[];
}

export function downloadBundle(bundle: EmergencyBundle) {
  const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `lote-emergencia-${bundle.bundleId.slice(0, 8)}.ftgsync`;
  link.click();
  URL.revokeObjectURL(url);
}
