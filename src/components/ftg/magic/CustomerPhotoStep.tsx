import { useEffect, useRef, useState } from "react";
import { Camera, Check, ImageUp, RotateCcw, RotateCw, Trash2, TriangleAlert, Upload, ZoomIn } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import {
  ACCEPTED_TYPES,
  MAX_UPLOAD_MB,
  analyzeImage,
  detectFaces,
  fileToDataUrl,
  transformImage,
  type MediaCheck,
} from "@/lib/ftg/magic";

export type CustomerPhoto = {
  /** Imagen ya recortada y rotada, lista para generar */
  dataUrl: string;
  peopleCount: number;
};

export function CustomerPhotoStep({
  value,
  aspectRatio,
  onChange,
}: {
  value: CustomerPhoto | null;
  aspectRatio: string;
  onChange: (photo: CustomerPhoto | null) => void;
}) {
  const [source, setSource] = useState<string | null>(null);
  const [rotation, setRotation] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [check, setCheck] = useState<MediaCheck | null>(null);
  const [faces, setFaces] = useState<number | null>(null);
  const [dragging, setDragging] = useState(false);
  const [cameraOn, setCameraOn] = useState(false);
  const [working, setWorking] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    setCameraOn(false);
  };

  useEffect(() => stopCamera, []);

  async function loadFile(file: File) {
    if (!ACCEPTED_TYPES.includes(file.type)) {
      toast.error("Formato no permitido", { description: "Usá JPG, PNG o WEBP." });
      return;
    }
    if (file.size > MAX_UPLOAD_MB * 1024 * 1024) {
      toast.error("Archivo demasiado grande", { description: `El máximo es ${MAX_UPLOAD_MB} MB.` });
      return;
    }
    const dataUrl = await fileToDataUrl(file);
    await loadDataUrl(dataUrl);
  }

  async function loadDataUrl(dataUrl: string) {
    setWorking(true);
    try {
      const result = await analyzeImage(dataUrl);
      setCheck(result);
      const detected = await detectFaces(dataUrl);
      setFaces(detected);
      if (!result.ok) {
        toast.error("La fotografía no cumple los requisitos", { description: result.errors.join(" ") });
        return;
      }
      if (detected === 0) {
        toast.warning("No detectamos un rostro visible", { description: "Revisá que la cara se vea de frente." });
      }
      setSource(dataUrl);
      setRotation(0);
      setZoom(1);
    } finally {
      setWorking(false);
    }
  }

  // Reprocesa el recorte cada vez que cambian encuadre o formato.
  useEffect(() => {
    if (!source) return;
    let cancel = false;
    void (async () => {
      const out = await transformImage(source, { rotation, zoom, ratio: aspectRatio });
      if (!cancel) onChange({ dataUrl: out, peopleCount: Math.max(faces ?? 1, 1) });
    })();
    return () => {
      cancel = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [source, rotation, zoom, aspectRatio, faces]);

  async function startCamera() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      setCameraOn(true);
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          void videoRef.current.play();
        }
      });
    } catch {
      toast.error("No pudimos acceder a la cámara", { description: "Revisá los permisos del navegador." });
    }
  }

  function capture() {
    const video = videoRef.current;
    if (!video) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d")?.drawImage(video, 0, 0);
    stopCamera();
    void loadDataUrl(canvas.toDataURL("image/jpeg", 0.92));
  }

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(",")}
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) void loadFile(file);
          e.target.value = "";
        }}
      />

      {!source && !cameraOn && (
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const file = e.dataTransfer.files?.[0];
            if (file) void loadFile(file);
          }}
          className={cn(
            "flex flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed border-border p-8 text-center transition-colors",
            dragging && "border-primary bg-primary/5",
          )}
        >
          <ImageUp className="h-8 w-8 text-muted-foreground" />
          <p className="text-sm font-medium">Arrastrá la foto del cliente acá</p>
          <p className="text-xs text-muted-foreground">JPG, PNG o WEBP · hasta {MAX_UPLOAD_MB} MB</p>
          <div className="flex flex-wrap justify-center gap-2 pt-1">
            <Button size="sm" onClick={() => inputRef.current?.click()} disabled={working}>
              <Upload className="mr-1.5 h-4 w-4" /> Subir archivo
            </Button>
            <Button size="sm" variant="secondary" onClick={() => void startCamera()} disabled={working}>
              <Camera className="mr-1.5 h-4 w-4" /> Tomar foto
            </Button>
          </div>
        </div>
      )}

      {cameraOn && (
        <div className="space-y-2">
          <div className="overflow-hidden rounded-xl bg-muted">
            <video ref={videoRef} playsInline muted className="w-full" />
          </div>
          <div className="flex gap-2">
            <Button size="sm" onClick={capture}>
              <Camera className="mr-1.5 h-4 w-4" /> Capturar
            </Button>
            <Button size="sm" variant="ghost" onClick={stopCamera}>
              Cancelar
            </Button>
          </div>
        </div>
      )}

      {source && value && (
        <div className="space-y-3">
          <div className="overflow-hidden rounded-xl border border-border bg-muted">
            <img src={value.dataUrl} alt="Foto del cliente" className="w-full object-contain" />
          </div>

          <div className="space-y-2 rounded-lg border border-border p-3">
            <div className="flex items-center gap-2">
              <ZoomIn className="h-4 w-4 text-muted-foreground" />
              <Slider
                value={[zoom]}
                min={1}
                max={2.5}
                step={0.05}
                onValueChange={(v) => setZoom(v[0] ?? 1)}
                className="flex-1"
              />
            </div>
            <div className="flex flex-wrap gap-2">
              <Button size="sm" variant="secondary" onClick={() => setRotation((r) => (r + 270) % 360)}>
                <RotateCcw className="mr-1.5 h-4 w-4" /> Girar
              </Button>
              <Button size="sm" variant="secondary" onClick={() => setRotation((r) => (r + 90) % 360)}>
                <RotateCw className="mr-1.5 h-4 w-4" /> Girar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => inputRef.current?.click()}>
                <Upload className="mr-1.5 h-4 w-4" /> Reemplazar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-destructive"
                onClick={() => {
                  setSource(null);
                  setCheck(null);
                  setFaces(null);
                  onChange(null);
                }}
              >
                <Trash2 className="mr-1.5 h-4 w-4" /> Eliminar
              </Button>
            </div>
          </div>

          <div className="space-y-1 text-xs">
            <p className="flex items-center gap-1.5 text-success">
              <Check className="h-3.5 w-3.5" />
              {check ? `Resolución ${check.width}×${check.height}` : "Imagen lista"}
              {faces !== null && ` · ${faces} rostro(s) detectado(s)`}
            </p>
            {check?.warnings.map((w) => (
              <p key={w} className="flex items-center gap-1.5 text-warning">
                <TriangleAlert className="h-3.5 w-3.5" /> {w}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
