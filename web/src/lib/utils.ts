import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "Neiber Danilo Araque Pacheco" → "Neiber Araque" */
export function shortName(full: string) {
  const w = full.trim().split(/\s+/);
  if (w.length <= 2) return full.trim();
  if (w.length === 3) return `${w[0]} ${w[1]}`;
  return `${w[0]} ${w[2]}`;
}

/** Iniciales para cuando no hay foto */
export function initials(full: string) {
  const w = full.trim().split(/\s+/).filter(Boolean);
  if (!w.length) return '?';
  const pick = w.length >= 3 ? [w[0], w[2]] : [w[0], w[1] ?? ''];
  return pick.map((x) => x.charAt(0).toUpperCase()).join('');
}

export function githubUser(url?: string | null) {
  if (!url) return null;
  try {
    return new URL(url).pathname.split('/').filter(Boolean)[0] ?? null;
  } catch {
    return null;
  }
}

export function linkedinUser(url?: string | null) {
  if (!url) return null;
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    return parts[parts.length - 1] ?? null;
  } catch {
    return null;
  }
}

export function semesterLabel(n?: number | null) {
  return n ? `${n}.º semestre` : null;
}

export function groupBy<T>(items: T[], key: (t: T) => string) {
  const out: { key: string; items: T[] }[] = [];
  for (const it of items) {
    const k = key(it);
    let g = out.find((x) => x.key === k);
    if (!g) out.push((g = { key: k, items: [] }));
    g.items.push(it);
  }
  return out;
}

export const BRAND = { azul: '#3F95CB', marino: '#1B4B9B', rojo: '#E1251B', negro: '#000000' } as const;

/** 312 → "5:12" */
export function formatDuration(sec: number) {
  const s = Math.max(0, Math.round(sec));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = String(s % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${r}` : `${m}:${r}`;
}

export function formatBytes(n: number) {
  if (n >= 1024 ** 3) return `${(n / 1024 ** 3).toFixed(1).replace('.', ',')} GB`;
  if (n >= 1024 ** 2) return `${Math.round(n / 1024 ** 2)} MB`;
  return `${Math.max(1, Math.round(n / 1024))} KB`;
}
