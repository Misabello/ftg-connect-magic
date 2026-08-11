import { useRef, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Camera, Loader2, ScanText, Upload } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { CameraCaptureDialog } from "@/components/ftg/CameraCaptureDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { readTicket } from "@/lib/ftg/ocr.functions";
import { uploadTicketToDrive } from "@/lib/ftg/drive.functions";

type TicketKind = "gasto" | "ingreso";

export function TicketDialog({
  open,
  onOpenChange,
  organizationId,
  locationId,
  pointOfSaleId,
  cashSessionId,
  currency,
  userId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  organizationId: string;
  locationId: string;
  pointOfSaleId: string;
  cashSessionId: string | null;
  currency: string;
  userId: string | null;
}) {
  const ocr = useServerFn(readTicket);
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);

  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [scanning, setScanning] = useState(false);
  const [kind, setKind] = useState<TicketKind>("gasto");
  const [amount, setAmount] = useState("");
  const [taxAmount, setTaxAmount] = useState("");
  const [issuedOn, setIssuedOn] = useState(new Date().toISOString().slice(0, 10));
  const [documentNumber, setDocumentNumber] = useState("");
  const [supplierName, setSupplierName] = useState("");
  const [taxId, setTaxId] = useState("");
  const [notes, setNotes] = useState("");
  const [confidence, setConfidence] = useState<number | null>(null);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setAmount("");
    setTaxAmount("");
    setDocumentNumber("");
    setSupplierName("");
    setTaxId("");
    setNotes("");
    setConfidence(null);
  };

  const handleFile = async (selected: File | null) => {
    if (!selected) return;
    setFile(selected);
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(String(reader.result));
      reader.onerror = () => reject(new Error("No se pudo leer el archivo"));
      reader.readAsDataURL(selected);
    });
    setPreview(dataUrl);

    setScanning(true);
    try {
      const result = await ocr({ data: { imageUrl: dataUrl } });
      if (result.amount !== null) setAmount(String(result.amount));
      if (result.taxAmount !== null) setTaxAmount(String(result.taxAmount));
      if (result.issuedOn) setIssuedOn(result.issuedOn);
      if (result.documentNumber) setDocumentNumber(result.documentNumber);
      if (result.supplierName) setSupplierName(result.supplierName);
      if (result.taxId) setTaxId(result.taxId);
      setConfidence(result.confidence);
      if (result.documentNumber) {
        toast.success("Ticket leído", { description: "Revisá los datos antes de confirmar." });
      } else {
        toast.warning("No detectamos el número de comprobante", {
          description: "Cargalo a mano antes de confirmar; el resto de los datos ya se completó.",
        });
      }
    } catch (error) {
      toast.error("No se pudo leer el ticket", { description: (error as Error).message });
    } finally {
      setScanning(false);
    }
  };

  const save = useMutation({
    mutationFn: async () => {
      const parsedAmount = Number(amount);
      if (!file || !preview) throw new Error("Adjuntá la foto o el archivo del ticket");
      if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) throw new Error("Ingresá un importe válido");

      const mimeExtension = (file.type || "").split("/")[1]?.toLowerCase();
      const nameExtension = file.name.includes(".") ? file.name.split(".").pop()?.toLowerCase() : undefined;
      const allowed = ["jpg", "jpeg", "png", "webp", "heic", "pdf"];
      const extension =
        (nameExtension && allowed.includes(nameExtension) && nameExtension) ||
        (mimeExtension === "jpeg" ? "jpg" : mimeExtension && allowed.includes(mimeExtension) ? mimeExtension : "jpg");
      const path = `${organizationId}/${pointOfSaleId}/${crypto.randomUUID()}.${extension}`;
      const { error: uploadError } = await supabase.storage
        .from("pos-tickets")
        .upload(path, file, { contentType: file.type || "image/jpeg", upsert: false });
      if (uploadError) throw uploadError;

      const { data: inserted, error } = await supabase.from("pos_tickets").insert({
        organization_id: organizationId,
        location_id: locationId,
        point_of_sale_id: pointOfSaleId,
        cash_session_id: cashSessionId,
        kind,
        image_path: path,
        amount: parsedAmount,
        tax_amount: taxAmount ? Number(taxAmount) : 0,
        currency_code: currency,
        issued_on: issuedOn,
        document_number: documentNumber || null,
        supplier_name: supplierName || null,
        tax_id: taxId || null,
        notes: notes || null,
        ocr_confidence: confidence,
        status: "confirmado",
        created_by: userId,
      }).select("id").single();
      if (error) throw error;

      // Copia del original a Google Drive (no bloquea el registro del ticket).
      try {
        await uploadTicketToDrive({
          data: {
            ticketId: inserted.id,
            path,
            fileName: `${issuedOn ?? "sin-fecha"}_${documentNumber || "ticket"}_${supplierName || "sin-proveedor"}.${extension}`,
          },
        });
      } catch (driveError) {
        toast.warning("El ticket se guardó, pero no se pudo copiar a Google Drive", {
          description: (driveError as Error).message,
        });
      }
    },
    onSuccess: () => {
      toast.success("Ticket registrado con su asiento contable");
      queryClient.invalidateQueries({ queryKey: ["pos-tickets"] });
      queryClient.invalidateQueries({ queryKey: ["pos-ledger"] });
      reset();
      onOpenChange(false);
    },
    onError: (error: Error) => toast.error("No se pudo registrar el ticket", { description: error.message }),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92vh] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ingresar ticket</DialogTitle>
          <DialogDescription>
            Sacá una foto o subí el comprobante: la IA lee el importe y genera el asiento en esta caja.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setCameraOpen(true)}>
              <Camera className="h-3.5 w-3.5" /> Sacar foto
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => fileInput.current?.click()}>
              <Upload className="h-3.5 w-3.5" /> Subir archivo
            </Button>
            {scanning && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Leyendo ticket…
              </span>
            )}
            {!scanning && confidence !== null && (
              <span className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <ScanText className="h-3.5 w-3.5" /> Confianza {confidence}%
              </span>
            )}
          </div>
          <CameraCaptureDialog
            open={cameraOpen}
            onOpenChange={setCameraOpen}
            title="Sacar foto del ticket"
            description="Encuadrá el comprobante completo y capturá."
            onCapture={(file) => handleFile(file)}
          />
          <input
            ref={fileInput}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => void handleFile(e.target.files?.[0] ?? null)}
          />

          {preview && (
            <img src={preview} alt="Vista previa del ticket" className="max-h-52 w-full rounded-xl object-contain" />
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label className="text-xs text-muted-foreground">Tipo</Label>
              <Select value={kind} onValueChange={(v) => setKind(v as TicketKind)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="gasto">Gasto / compra</SelectItem>
                  <SelectItem value="ingreso">Ingreso extra</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Importe total</Label>
              <Input
                className="mt-1"
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Impuesto</Label>
              <Input
                className="mt-1"
                type="number"
                min={0}
                step="0.01"
                value={taxAmount}
                onChange={(e) => setTaxAmount(e.target.value)}
              />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Fecha</Label>
              <Input className="mt-1" type="date" value={issuedOn} onChange={(e) => setIssuedOn(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Comprobante N°</Label>
              <Input className="mt-1" value={documentNumber} onChange={(e) => setDocumentNumber(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Emisor</Label>
              <Input className="mt-1" value={supplierName} onChange={(e) => setSupplierName(e.target.value)} />
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Identificación fiscal</Label>
              <Input className="mt-1" value={taxId} onChange={(e) => setTaxId(e.target.value)} />
            </div>
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Notas</Label>
            <Textarea className="mt-1" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending || scanning || !file}>
            {save.isPending ? "Guardando…" : "Confirmar ticket"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}