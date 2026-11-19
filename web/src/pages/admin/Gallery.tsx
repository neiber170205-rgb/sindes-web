import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Trash2 } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, errorText } from '@/lib/api';
import type { GalleryPhoto } from '@/lib/types';
import { Confirm, Empty, PageHeader, Spinner } from './ui';

export default function Gallery() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'gallery'], queryFn: () => api.get<GalleryPhoto[]>('/admin/gallery') });
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(0);
  const put = (list: GalleryPhoto[]) => {
    qc.setQueryData(['admin', 'gallery'], list);
    qc.invalidateQueries({ queryKey: ['site'] });
  };
  const run = async (fn: () => Promise<GalleryPhoto[]>) => {
    try {
      put(await fn());
    } catch (e) {
      toast.error(errorText(e));
    }
  };
  const upload = async (files: FileList | null) => {
    for (const f of Array.from(files ?? [])) {
      setBusy((n) => n + 1);
      const fd = new FormData();
      fd.append('file', f);
      await run(() => api.post<GalleryPhoto[]>('/admin/gallery', fd));
      setBusy((n) => n - 1);
    }
  };
  const photos = q.data ?? [];
  const move = (i: number, d: number) => {
    const ids = photos.map((p) => p.id);
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    run(() => api.post<GalleryPhoto[]>('/admin/gallery/reorder', { ids }));
  };

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Fotos del semillero"
        description="Rotan junto a «Un semillero es donde las ideas echan raíz». Funcionan mejor horizontales (3:2). El título sale sobre la foto."
        actions={
          <>
            <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" tabIndex={-1} onChange={(e) => upload(e.target.files).then(() => (e.target.value = ''))} />
            <Button onClick={() => input.current?.click()} disabled={busy > 0}>
              {busy ? <Loader2 className="animate-spin" /> : <ImagePlus />}
              {busy ? `Subiendo ${busy}…` : 'Subir fotos'}
            </Button>
          </>
        }
      />
      {q.isLoading ? (
        <Spinner />
      ) : !photos.length ? (
        <Empty title="Sin fotos. Sube la primera." />
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {photos.map((p, i) => (
            <figure key={p.id} className="m-0 flex flex-col overflow-hidden rounded-2xl border border-linea bg-white">
              <div className="relative aspect-[3/2] bg-black">
                <img src={p.url} alt={p.alt ?? ''} className="size-full object-cover" />
                <span className="absolute top-3 left-3 rounded-full bg-black px-2.5 py-1 text-xs font-bold text-white">{i + 1}</span>
              </div>
              <figcaption className="flex flex-col gap-2 p-4">
                <Input defaultValue={p.caption ?? ''} placeholder="Título: En Campus Party" aria-label="Título" onBlur={(e) => e.target.value !== (p.caption ?? '') && run(() => api.patch(`/admin/gallery/${p.id}`, { caption: e.target.value, alt: p.alt }))} />
                <Input defaultValue={p.alt ?? ''} placeholder="Qué se ve en la foto" aria-label="Descripción" onBlur={(e) => e.target.value !== (p.alt ?? '') && run(() => api.patch(`/admin/gallery/${p.id}`, { caption: p.caption, alt: e.target.value }))} />
                <div className="flex justify-end gap-1">
                  <Button variant="ghost" size="icon-sm" aria-label="Mover antes" disabled={i === 0} onClick={() => move(i, -1)}>
                    <ArrowUp />
                  </Button>
                  <Button variant="ghost" size="icon-sm" aria-label="Mover después" disabled={i === photos.length - 1} onClick={() => move(i, 1)}>
                    <ArrowDown />
                  </Button>
                  <Confirm
                    title="¿Quitar esta foto?"
                    description="Se borra del servidor."
                    action="Quitar"
                    onConfirm={() => run(() => api.del(`/admin/gallery/${p.id}`))}
                    trigger={
                      <Button variant="ghost" size="icon-sm" aria-label="Quitar" className="text-rojo-texto">
                        <Trash2 />
                      </Button>
                    }
                  />
                </div>
              </figcaption>
            </figure>
          ))}
        </div>
      )}
    </div>
  );
}
