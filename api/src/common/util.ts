import { createHash, randomBytes } from 'node:crypto';

export function slugify(text: string): string {
  return text
    // Sin esto C, C# y C++ quedarían los tres como «c»
    .replace(/#/g, ' sharp ')
    .replace(/\+/g, ' plus ')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'item';
}

export function newToken(): { token: string; hash: string } {
  const token = randomBytes(24).toString('base64url');
  return { token, hash: hashToken(token) };
}

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function publicUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `/uploads/${path.replace(/^\/+/, '')}`;
}

export function siteUrl(): string {
  return (process.env.PUBLIC_SITE_URL ?? 'http://localhost:5173').replace(/\/+$/, '');
}

export const optionalUrl = (v: unknown) => (typeof v === 'string' && v.trim() === '' ? null : v);
