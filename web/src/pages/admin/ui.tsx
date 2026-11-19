import { useMutation, useQueryClient, type QueryKey } from '@tanstack/react-query';
import { Check, Copy, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { errorText } from '@/lib/api';
import type { MemberStatus } from '@/lib/types';
import { cn } from '@/lib/utils';

export function PageHeader({ title, description, actions }: { title: string; description?: React.ReactNode; actions?: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-[clamp(26px,3vw,36px)] leading-tight font-black tracking-[-0.01em] italic">{title}</h1>
        {description && <p className="max-w-2xl text-[15px] text-gris-2">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

export const STATUS_TEXT: Record<MemberStatus, string> = {
  draft: 'Sin enviar',
  pending: 'Por revisar',
  published: 'Publicado',
  hidden: 'Oculto',
};

export function StatusBadge({ status }: { status: MemberStatus }) {
  return <Badge variant={status}>{STATUS_TEXT[status]}</Badge>;
}

export function Panel({ title, description, children, className, actions }: { title?: string; description?: React.ReactNode; children: React.ReactNode; className?: string; actions?: React.ReactNode }) {
  return (
    <section className={cn('flex flex-col gap-5 rounded-2xl border border-linea bg-white p-5 sm:p-6', className)}>
      {(title || actions) && (
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex flex-col gap-1">
            {title && <h2 className="text-lg font-bold">{title}</h2>}
            {description && <p className="text-sm text-gris-2">{description}</p>}
          </div>
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function Empty({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-input bg-white px-6 py-12 text-center">
      <p className="text-lg font-bold">{title}</p>
      {children}
    </div>
  );
}

export function Spinner({ label = 'Cargando' }: { label?: string }) {
  return (
    <div className="flex justify-center py-16" role="status" aria-label={label}>
      <Loader2 className="size-7 animate-spin text-gris-2" />
    </div>
  );
}

export function CopyButton({ text, label = 'Copiar', copied = 'Copiado', size = 'sm', variant = 'outline' }: { text: string; label?: string; copied?: string; size?: 'sm' | 'default'; variant?: 'outline' | 'default' }) {
  const [ok, setOk] = useState(false);
  return (
    <Button
      type="button"
      size={size}
      variant={variant}
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(text);
        } catch {
          const t = document.createElement('textarea');
          t.value = text;
          document.body.appendChild(t);
          t.select();
          document.execCommand('copy');
          t.remove();
        }
        setOk(true);
        setTimeout(() => setOk(false), 1800);
      }}
    >
      {ok ? <Check /> : <Copy />}
      {ok ? copied : label}
    </Button>
  );
}

export function Confirm({
  trigger,
  title,
  description,
  action = 'Eliminar',
  onConfirm,
}: {
  trigger: React.ReactNode;
  title: string;
  description: React.ReactNode;
  action?: string;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancelar</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>{action}</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

/** Mutación con aviso de éxito/error e invalidación de consultas. */
export function useAction<TVars, TRes = unknown>(fn: (v: TVars) => Promise<TRes>, opts: { success?: string | ((r: TRes) => string); invalidate?: QueryKey[]; onSuccess?: (r: TRes) => void } = {}) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: fn,
    onSuccess: (r) => {
      for (const k of opts.invalidate ?? []) qc.invalidateQueries({ queryKey: k });
      qc.invalidateQueries({ queryKey: ['site'] });
      const msg = typeof opts.success === 'function' ? opts.success(r) : opts.success;
      if (msg) toast.success(msg);
      opts.onSuccess?.(r);
    },
    onError: (e) => toast.error(errorText(e)),
  });
}

export function fmtDate(v?: string | null) {
  if (!v) return '';
  return new Intl.DateTimeFormat('es-CO', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(v));
}

export function fmtRelative(v?: string | null) {
  if (!v) return '';
  const diff = (Date.now() - new Date(v).getTime()) / 1000;
  const rtf = new Intl.RelativeTimeFormat('es', { numeric: 'auto' });
  if (diff < 3600) return rtf.format(-Math.max(1, Math.round(diff / 60)), 'minute');
  if (diff < 86400) return rtf.format(-Math.round(diff / 3600), 'hour');
  return rtf.format(-Math.round(diff / 86400), 'day');
}
