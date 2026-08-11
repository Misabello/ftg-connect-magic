import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const GATEWAY = "https://connector-gateway.lovable.dev/google_drive";
const FOLDER_NAME = "FTG - Tickets";

const Input = z.object({
  ticketId: z.string().uuid(),
  path: z.string().min(3),
  fileName: z.string().min(1).max(160),
});

function driveHeaders() {
  const lovableKey = process.env["LOVABLE_API_KEY"];
  const driveKey = process.env["GOOGLE_DRIVE_API_KEY"];
  if (!lovableKey || !driveKey) throw new Error("Google Drive no está conectado en este proyecto");
  return {
    Authorization: `Bearer ${lovableKey}`,
    "X-Connection-Api-Key": driveKey,
  };
}

async function driveFetch(path: string, init: RequestInit = {}) {
  const res = await fetch(`${GATEWAY}${path}`, {
    ...init,
    headers: { ...driveHeaders(), ...(init.headers ?? {}) },
  });
  const body = await res.text();
  if (!res.ok) throw new Error(`Google Drive respondió ${res.status}: ${body}`);
  return body ? (JSON.parse(body) as Record<string, unknown>) : {};
}

async function ensureFolder(): Promise<string> {
  const q = encodeURIComponent(
    `mimeType='application/vnd.google-apps.folder' and name='${FOLDER_NAME}' and trashed=false`,
  );
  const found = (await driveFetch(`/drive/v3/files?q=${q}&fields=files(id,name)`)) as {
    files?: Array<{ id: string }>;
  };
  if (found.files?.[0]?.id) return found.files[0].id;
  const created = (await driveFetch(`/drive/v3/files?fields=id`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" }),
  })) as { id: string };
  return created.id;
}

/** Sube el comprobante original del ticket a Google Drive y devuelve su enlace. */
export const uploadTicketToDrive = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => Input.parse(data))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const download = await supabaseAdmin.storage.from("pos-tickets").download(data.path);
    if (download.error || !download.data) throw new Error("No se pudo leer el comprobante guardado");

    const blob = download.data;
    const contentType = blob.type || "application/octet-stream";
    const folderId = await ensureFolder();

    const boundary = `ftg${crypto.randomUUID().replace(/-/g, "")}`;
    const metadata = JSON.stringify({ name: data.fileName, parents: [folderId] });
    const bytes = new Uint8Array(await blob.arrayBuffer());
    const head = new TextEncoder().encode(
      `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n--${boundary}\r\nContent-Type: ${contentType}\r\n\r\n`,
    );
    const tail = new TextEncoder().encode(`\r\n--${boundary}--\r\n`);
    const body = new Uint8Array(head.length + bytes.length + tail.length);
    body.set(head, 0);
    body.set(bytes, head.length);
    body.set(tail, head.length + bytes.length);

    const uploaded = (await driveFetch(
      `/upload/drive/v3/files?uploadType=multipart&fields=id,webViewLink`,
      {
        method: "POST",
        headers: { "Content-Type": `multipart/related; boundary=${boundary}` },
        body,
      },
    )) as { id: string; webViewLink?: string };

    const url = uploaded.webViewLink ?? `https://drive.google.com/file/d/${uploaded.id}/view`;
    await supabaseAdmin
      .from("pos_tickets")
      .update({ drive_file_id: uploaded.id, drive_url: url })
      .eq("id", data.ticketId);

    void context.userId;
    return { fileId: uploaded.id, url };
  });
