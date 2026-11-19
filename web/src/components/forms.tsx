import { Check, Plus, Search, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { TechLogo } from '@/components/site/bits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import type { Tech } from '@/lib/types';
import { cn, groupBy } from '@/lib/utils';

export function Field({ label, hint, htmlFor, children, className }: { label: string; hint?: React.ReactNode; htmlFor?: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
      {hint && <p className="text-[13px] leading-snug text-gris-2">{hint}</p>}
    </div>
  );
}

export function CountedTextarea({ value, onChange, max, ...rest }: { value: string; onChange: (v: string) => void; max: number } & Omit<React.ComponentProps<'textarea'>, 'value' | 'onChange'>) {
  return (
    <div className="flex flex-col gap-1">
      <Textarea value={value} maxLength={max} onChange={(e) => onChange(e.target.value)} {...rest} />
      <span className={cn('self-end text-xs tabular-nums', value.length > max * 0.9 ? 'text-rojo-texto' : 'text-gris-2')}>
        {value.length} / {max}
      </span>
    </div>
  );
}

/** Selector de tecnologías por categoría, con logo y búsqueda. */
export function TechPicker({ all, selected, onChange }: { all: Tech[]; selected: number[]; onChange: (ids: number[]) => void }) {
  const [q, setQ] = useState('');
  const set = new Set(selected);
  const groups = useMemo(() => {
    const term = q.trim().toLowerCase();
    return groupBy(
      all.filter((t) => !term || t.name.toLowerCase().includes(term)),
      (t) => t.category,
    );
  }, [all, q]);
  const toggle = (id: number) => onChange(set.has(id) ? selected.filter((x) => x !== id) : [...selected, id]);

  return (
    <div className="flex flex-col gap-5">
      <div className="relative">
        <Search className="pointer-events-none absolute top-1/2 left-3.5 size-4 -translate-y-1/2 text-gris-2" />
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar: React, Python, Docker…" className="pl-10" aria-label="Buscar tecnología" />
      </div>
      {groups.map((g) => (
        <fieldset key={g.key} className="flex flex-col gap-2.5">
          <legend className="pb-2.5 text-[13px] font-bold text-gris-2">{g.key}</legend>
          <div className="flex flex-wrap gap-2">
            {g.items.map((t) => {
              const on = set.has(t.id);
              return (
                <button
                  key={t.id}
                  type="button"
                  aria-pressed={on}
                  onClick={() => toggle(t.id)}
                  className={cn(
                    'inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-[10px] border-[1.5px] py-1.5 pr-3 pl-2 text-sm font-semibold transition-[background-color,border-color,box-shadow]',
                    on ? 'border-black bg-black text-white shadow-[3px_3px_0_#E1251B]' : 'border-linea bg-white hover:border-black',
                  )}
                >
                  <span className={cn('flex size-6 items-center justify-center rounded-md', on && 'bg-white')}>
                    <TechLogo tech={t} size={18} />
                  </span>
                  {t.name}
                  {on && <Check className="size-4" strokeWidth={3} />}
                </button>
              );
            })}
          </div>
        </fieldset>
      ))}
      {!groups.length && <p className="text-sm text-gris-2">No hay ninguna con ese nombre. Si usas otra herramienta, cuéntale a quien administra la página para agregarla.</p>}
    </div>
  );
}

type Col<T> = { key: keyof T & string; label: string; placeholder?: string; width?: string; multiline?: boolean };

/** Lista editable de filas cortas (formación, logros, módulos, avances…). */
export function RowsEditor<T extends Record<string, unknown>>({
  rows,
  onChange,
  columns,
  empty,
  addLabel,
  blank,
  max = 20,
  extra,
}: {
  rows: T[];
  onChange: (rows: T[]) => void;
  columns: Col<T>[];
  empty: string;
  addLabel: string;
  blank: T;
  max?: number;
  extra?: (row: T, set: (patch: Partial<T>) => void) => React.ReactNode;
}) {
  const set = (i: number, patch: Partial<T>) => onChange(rows.map((r, k) => (k === i ? { ...r, ...patch } : r)));
  return (
    <div className="flex flex-col gap-3">
      {!rows.length && <p className="rounded-xl border border-dashed border-input px-4 py-5 text-center text-sm text-gris-2">{empty}</p>}
      {rows.map((r, i) => (
        <div key={i} className="flex flex-col gap-2.5 rounded-xl border border-linea bg-white p-3.5 sm:flex-row sm:items-start">
          <div className="grid flex-1 gap-2.5 sm:grid-cols-[var(--cols)]" style={{ ['--cols' as string]: columns.map((c) => c.width ?? '1fr').join(' ') }}>
            {columns.map((c) =>
              c.multiline ? (
                <Textarea
                  key={c.key}
                  aria-label={c.label}
                  placeholder={c.placeholder ?? c.label}
                  value={(r[c.key] as string) ?? ''}
                  onChange={(e) => set(i, { [c.key]: e.target.value } as Partial<T>)}
                  className="min-h-11 sm:col-span-full"
                />
              ) : (
                <Input key={c.key} aria-label={c.label} placeholder={c.placeholder ?? c.label} value={(r[c.key] as string) ?? ''} onChange={(e) => set(i, { [c.key]: e.target.value } as Partial<T>)} />
              ),
            )}
            {extra?.(r, (p) => set(i, p))}
          </div>
          <Button type="button" variant="ghost" size="icon" className="self-end text-rojo-texto sm:self-start" aria-label="Quitar" onClick={() => onChange(rows.filter((_, k) => k !== i))}>
            <Trash2 />
          </Button>
        </div>
      ))}
      {rows.length < max && (
        <Button type="button" variant="outline" size="sm" className="self-start" onClick={() => onChange([...rows, { ...blank }])}>
          <Plus /> {addLabel}
        </Button>
      )}
    </div>
  );
}

export const MONTHS = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

/** "Agosto de 2026" ↔ { month, year } */
export function parseJoined(v?: string | null) {
  const m = v?.match(/^(\p{L}+) de (\d{4})$/u);
  if (!m) return { month: '', year: '' };
  const month = MONTHS.find((x) => x.toLowerCase() === m[1].toLowerCase()) ?? '';
  return { month, year: m[2] };
}
export const formatJoined = (month: string, year: string) => (month && year ? `${month} de ${year}` : '');
