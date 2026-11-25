import { useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Clapperboard, Loader2, Trash2, Upload, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, errorText } from '@/lib/api';
import type { Project } from '@/lib/types';
import { formatBytes, formatDuration } from '@/lib/utils';
import { Confirm, Panel } from './ui';

const MAX_BYTES = 2 * 1024 ** 3;

type Upload = { name: string; total: number; loaded: number; startedAt: number; xhr: XMLHttpRequest };

/** Sube con XMLHttpRequest para poder mostrar el avance (fetch no lo da al subir). */
function send(url: string, file: File, caption: string, onProgress: (loaded: number) => void, xhr: XMLHttpRequest) {
  return new Promise<Project>((resolve, reject) => {
    const fd = new FormData();
    fd.append('caption', caption);
    fd.append('file', file);
    xhr.open('POST', url);
    xhr.withCredentials = true;
    xhr.upload.onprogress = (e) => onProgress(e.loaded);
    xhr.onload = () => {
      let data: { message?: string | string[] } & Partial<Project> = {};
      try {
        data = JSON.parse(xhr.responseText);
      } catch {
        /* respuesta sin cuerpo */
      }
      if (xhr.status >= 200 && xhr.status < 300) resolve(data as Project);
      else if (xhr.status === 413) reject(new Error('El video pesa más de lo permitido (2 GB).'));
      else reject(new Error((Array.isArray(data.message) ? data.message.join(', ') : data.message) || 'No se pudo subir el video. Revisa tu conexión e intenta de nuevo.'));
    };
    xhr.onerror = () => reject(new Error('Se cortó la conexión mientras subía. Intenta de nuevo.'));
    xhr.onabort = () => reject(new Error('cancelado'));
    xhr.send(fd);
  });
}

function eta(u: Upload) {
  const secs = (Date.now() - u.startedAt) / 1000;
  if (secs < 2 || !u.loaded) return 'calculando…';
  const speed = u.loaded / secs;
  const left = (u.total - u.loaded) / speed;
  return `${formatBytes(speed)}/s · faltan ${left > 90 ? `${Math.ceil(left / 60)} min` : `${Math.ceil(left)} s`}`;
}

export function ProjectVideoPanel({ project, onChange }: { project: Project; onChange: (p: Project) => void }) {
  const qc = useQueryClient();
  const input = useRef<HTMLInputElement>(null);
  const [up, setUp] = useState<Upload | null>(null);
  const [caption, setCaption] = useState(project.video?.caption ?? '');
  const v = project.video;
  const job = project.videoJob;

  useEffect(() => setCaption(project.video?.caption ?? ''), [project.video?.id, project.video?.caption]);

  // Mientras sube, salir de la página corta la subida
  useEffect(() => {
    if (!up) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [up]);

  const pick = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('video/')) return toast.error('Ese archivo no es un video. Usa MP4, MOV o WebM.');
    if (file.size > MAX_BYTES) return toast.error(`El video pesa ${formatBytes(file.size)}. El máximo es 2 GB.`);
    const xhr = new XMLHttpRequest();
    const u: Upload = { name: file.name, total: file.size, loaded: 0, startedAt: Date.now(), xhr };
    setUp(u);
    try {
      const p = await send(`/api/admin/projects/${project.id}/video`, file, caption, (loaded) => setUp((cur) => (cur ? { ...cur, loaded } : cur)), xhr);
      onChange(p);
      toast.success('Video subido. Ahora se está preparando para la página.');
    } catch (e) {
      if (errorText(e) !== 'cancelado') toast.error(errorText(e));
    } finally {
      setUp(null);
    }
  };

  const saveCaption = async () => {
    if (!v || caption === (v.caption ?? '')) return;
    try {
      onChange(await api.patch<Project>(`/admin/projects/${project.id}/video`, { caption }));
      toast.success('Texto del video guardado');
    } catch (e) {
      toast.error(errorText(e));
    }
  };

  const remove = async () => {
    try {
      onChange(await api.del<Project>(`/admin/projects/${project.id}/video`));
      qc.invalidateQueries({ queryKey: ['site'] });
      toast.success('Video quitado');
    } catch (e) {
      toast.error(errorText(e));
    }
  };

  const vertical = v ? v.height > v.width : true;
  const pct = up ? Math.round((up.loaded / up.total) * 100) : 0;

  return (
    <Panel
      title="Video del proyecto"
      description="Un video tipo reel que se ve en la página del proyecto. Vertical (9:16) se ve mejor. MP4 o MOV, hasta 2 GB y 30 minutos; se convierte a una versión liviana."
      actions={
        !up && (
          <>
            <input ref={input} type="file" accept="video/mp4,video/quicktime,video/webm,video/*" className="sr-only" tabIndex={-1} onChange={(e) => pick(e.target.files?.[0]).then(() => (e.target.value = ''))} />
            <Button onClick={() => input.current?.click()} variant={v ? 'outline' : 'default'}>
              <Upload /> {v || job ? 'Subir otro video' : 'Subir video'}
            </Button>
          </>
        )
      }
    >
      {up && (
        <div className="flex flex-col gap-3 rounded-xl border-2 border-black bg-hielo p-4" role="status" aria-live="polite">
          <div className="flex items-center justify-between gap-3">
            <span className="min-w-0 truncate font-semibold">Subiendo {up.name}</span>
            <Button variant="ghost" size="sm" onClick={() => up.xhr.abort()}>
              <X /> Cancelar
            </Button>
          </div>
          <div className="h-3 overflow-hidden rounded-full bg-[#D5DEE6]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Avance de la subida">
            <div className="h-full rounded-full bg-rojo transition-[width] duration-300" style={{ width: `${pct}%` }} />
          </div>
          <p className="text-sm text-gris">
            {pct}% · {formatBytes(up.loaded)} de {formatBytes(up.total)} · {eta(up)}
          </p>
          <p className="text-xs text-gris-2">No cierres esta pestaña hasta que termine.</p>
        </div>
      )}

      {!up && job?.status === 'processing' && (
        <div className="flex flex-col gap-3 rounded-xl border border-linea bg-white p-4" role="status" aria-live="polite">
          <span className="flex items-center gap-2 font-semibold">
            <Loader2 className="size-4 animate-spin" />
            {job.waiting > 1 ? `En fila para procesar (${job.waiting - 1} antes)` : job.percent ? `Preparando el video · ${job.percent}%` : 'Preparando el video…'}
          </span>
          <div className="h-2 overflow-hidden rounded-full bg-[#D5DEE6]">
            <div className="h-full rounded-full bg-black transition-[width] duration-700" style={{ width: `${Math.max(3, job.percent)}%` }} />
          </div>
          <p className="text-sm text-gris-2">
            {job.originalName && <span className="font-medium">{job.originalName}. </span>}
            Un video de 5 minutos tarda unos minutos. Puedes seguir trabajando o salir; {v ? 'el video anterior sigue en la página hasta que este quede listo.' : 'aparecerá solo en la página cuando termine.'}
          </p>
        </div>
      )}

      {!up && job?.status === 'error' && (
        <div className="flex items-start gap-3 rounded-xl border-l-4 border-rojo bg-[#FBE3E1] p-4">
          <AlertTriangle className="mt-0.5 size-5 shrink-0 text-rojo-texto" />
          <div className="flex flex-col gap-1">
            <span className="font-semibold text-rojo-texto">No se pudo preparar {job.originalName ?? 'el video'}.</span>
            <span className="text-sm">{job.error}</span>
          </div>
        </div>
      )}

      {v ? (
        <div className="flex flex-wrap items-start gap-6">
          <video
            key={v.id}
            controls
            playsInline
            preload="metadata"
            poster={v.posterUrl ?? undefined}
            className="rounded-xl bg-black"
            style={{ aspectRatio: `${v.width} / ${v.height}`, width: vertical ? 'min(100%, 280px)' : 'min(100%, 560px)' }}
          >
            <source src={v.url} type="video/mp4" />
          </video>
          <div className="flex min-w-60 flex-1 flex-col gap-4">
            <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-gris-2">
              <span>Duración {formatDuration(v.durationSec)}</span>
              <span>
                {v.width}×{v.height}
              </span>
              <span className="font-semibold text-[#14532D]">Se ve en la página</span>
            </div>
            <div className="flex flex-col gap-2">
              <label htmlFor="vcap" className="text-sm font-semibold">
                Texto junto al video (opcional)
              </label>
              <Input id="vcap" value={caption} maxLength={160} onChange={(e) => setCaption(e.target.value)} onBlur={saveCaption} placeholder="Ej.: Recorrido por los 9 módulos de SICAF" />
            </div>
            <Confirm
              title="¿Quitar el video?"
              description="Se borra del servidor y deja de verse en la página del proyecto."
              action="Quitar"
              onConfirm={remove}
              trigger={
                <Button variant="ghost" className="self-start text-rojo-texto">
                  <Trash2 /> Quitar video
                </Button>
              }
            />
          </div>
        </div>
      ) : (
        !up &&
        !job && (
          <button
            type="button"
            onClick={() => input.current?.click()}
            className="flex cursor-pointer flex-col items-center gap-3 rounded-xl border-2 border-dashed border-input bg-white px-6 py-12 text-center hover:border-black"
          >
            <Clapperboard className="size-8 text-gris-2" />
            <span className="font-semibold">Este proyecto todavía no tiene video</span>
            <span className="text-sm text-gris-2">Toca para elegir el archivo</span>
          </button>
        )
      )}
    </Panel>
  );
}
