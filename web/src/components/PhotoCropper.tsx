import { ImagePlus, Loader2, ZoomIn } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import Cropper, { type Area } from 'react-easy-crop';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const MAX_BYTES = 8 * 1024 * 1024;

async function cropToBlob(src: string, area: Area): Promise<Blob> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = reject;
    i.src = src;
  });
  const canvas = document.createElement('canvas');
  canvas.width = 900;
  canvas.height = 1125;
  const ctx = canvas.getContext('2d')!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, area.x, area.y, area.width, area.height, 0, 0, 900, 1125);
  return new Promise((resolve, reject) => canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('No se pudo recortar'))), 'image/jpeg', 0.9));
}

/**
 * Elige una foto, la recorta en 4:5 y entrega el resultado listo para subir.
 * El recorte se hace en el navegador; el servidor solo la reduce y la guarda.
 */
export function PhotoPicker({
  onCropped,
  busy,
  label = 'Elegir foto',
  variant = 'default',
}: {
  onCropped: (blob: Blob) => Promise<void> | void;
  busy?: boolean;
  label?: string;
  variant?: 'default' | 'outline';
}) {
  const input = useRef<HTMLInputElement>(null);
  const [src, setSrc] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [area, setArea] = useState<Area | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [working, setWorking] = useState(false);

  const onFile = (f?: File) => {
    setError(null);
    if (!f) return;
    if (!/^image\/(jpeg|png|webp|avif|gif|heic|heif)$/.test(f.type)) return setError('Usa una foto en JPG, PNG o WebP.');
    if (f.size > MAX_BYTES * 2) return setError('La foto pesa más de 16 MB. Elige una más liviana.');
    const reader = new FileReader();
    reader.onload = () => {
      setSrc(reader.result as string);
      setZoom(1);
      setCrop({ x: 0, y: 0 });
    };
    reader.readAsDataURL(f);
  };

  const onComplete = useCallback((_: Area, px: Area) => setArea(px), []);

  const save = async () => {
    if (!src || !area) return;
    setWorking(true);
    try {
      const blob = await cropToBlob(src, area);
      await onCropped(blob);
      setSrc(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'No se pudo guardar la foto');
    } finally {
      setWorking(false);
    }
  };

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/avif"
        className="sr-only"
        tabIndex={-1}
        onChange={(e) => {
          onFile(e.target.files?.[0]);
          e.target.value = '';
        }}
      />
      <Button type="button" variant={variant} onClick={() => input.current?.click()} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />}
        {label}
      </Button>
      {error && !src && <p className="text-sm font-medium text-rojo-texto">{error}</p>}

      <Dialog open={!!src} onOpenChange={(o) => !o && !working && setSrc(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Ajusta tu foto</DialogTitle>
            <DialogDescription>Arrastra para centrar tu cara y usa el control para acercar.</DialogDescription>
          </DialogHeader>
          <div className="relative mx-auto aspect-[4/5] w-full max-w-[320px] overflow-hidden rounded-xl bg-black">
            {src && <Cropper image={src} crop={crop} zoom={zoom} aspect={4 / 5} onCropChange={setCrop} onZoomChange={setZoom} onCropComplete={onComplete} objectFit="cover" />}
          </div>
          <label className="flex items-center gap-3 text-sm font-semibold">
            <ZoomIn className="size-4 shrink-0" />
            <span className="sr-only">Acercar</span>
            <input type="range" min={1} max={3} step={0.01} value={zoom} onChange={(e) => setZoom(Number(e.target.value))} className="w-full accent-black" />
          </label>
          {error && <p className="text-sm font-medium text-rojo-texto">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setSrc(null)} disabled={working}>
              Cancelar
            </Button>
            <Button type="button" onClick={save} disabled={working || !area}>
              {working && <Loader2 className="animate-spin" />}
              Usar esta foto
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
