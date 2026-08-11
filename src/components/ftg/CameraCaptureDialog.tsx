import { useEffect, useRef, useState } from "react";
import { Camera, Loader2, RefreshCw } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export function CameraCaptureDialog({
  open,
  onOpenChange,
  onCapture,
  title = "Sacar foto",
  description = "Encuadrá el documento o la escena y capturá la imagen.",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (file: File) => void | Promise<void>;
  title?: string;
  description?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;

    function stop() {
      streamRef.current?.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
      setReady(false);
    }

    async function start() {
      if (!open) return;
      if (!navigator.mediaDevices?.getUserMedia) {
        toast.error("Cámara no disponible", {
          description: "Tu navegador no permite acceder a la cámara. Subí el archivo desde el dispositivo.",
        });
        onOpenChange(false);
        return;
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: facing, width: { ideal: 1920 }, height: { ideal: 1080 } },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((track) => track.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => undefined);
        }
        setReady(true);
      } catch (error) {
        toast.error("No pudimos activar la cámara", {
          description: error instanceof Error ? error.message : "Revisá los permisos del navegador.",
        });
        onOpenChange(false);
      }
    }

    void start();
    return () => {
      cancelled = true;
      stop();
    };
  }, [open, facing, onOpenChange]);

  function shoot() {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (!blob) return;
        const file = new File([blob], `captura-${Date.now()}.jpg`, { type: "image/jpeg" });
        onOpenChange(false);
        void onCapture(file);
      },
      "image/jpeg",
      0.92,
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <div className="relative overflow-hidden rounded-xl border border-border bg-muted">
          <video ref={videoRef} playsInline muted className="h-64 w-full bg-black object-cover" />
          {!ready && (
            <div className="absolute inset-0 flex items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Activando cámara…
            </div>
          )}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setFacing((prev) => (prev === "environment" ? "user" : "environment"))}
          >
            <RefreshCw className="mr-1.5 h-4 w-4" /> Cambiar cámara
          </Button>
          <Button type="button" size="sm" disabled={!ready} onClick={shoot}>
            <Camera className="mr-1.5 h-4 w-4" /> Capturar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
