import { ArrowUp, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn, initials } from '@/lib/utils';
import type { Tech } from '@/lib/types';

export function MailIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="M3 7l9 6 9-6" />
    </svg>
  );
}

export function CvlacIcon({ className }: { className?: string }) {
  return (
    <svg aria-hidden="true" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className={className}>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="9" cy="11" r="2.5" />
      <path d="M5.5 17c.6-1.8 2-2.8 3.5-2.8s2.9 1 3.5 2.8M15 9h3M15 13h3" />
    </svg>
  );
}

export function TrophyIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0z" />
      <path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3" />
    </svg>
  );
}

/** Logo de una tecnología, o sus iniciales si no tiene. */
export function TechLogo({ tech, size = 20 }: { tech: Tech; size?: number }) {
  if (tech.logoUrl) return <img src={tech.logoUrl} alt="" width={size} height={size} className="block shrink-0" style={{ width: size, height: size }} />;
  return (
    <span
      aria-hidden="true"
      className="flex shrink-0 items-center justify-center rounded-md bg-black font-bold text-white"
      style={{ width: size, height: size, fontSize: Math.max(9, size * 0.38) }}
    >
      {tech.name.slice(0, 2)}
    </span>
  );
}

/** Ficha pequeña: logo + nombre (tarjetas del inicio). */
export function TechChip({ tech, variant = 'light' }: { tech: Tech; variant?: 'light' | 'outline' }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-[7px] text-sm font-semibold',
        variant === 'light' && 'rounded-lg bg-white py-[5px] pr-[11px] pl-[7px] text-black',
        variant === 'outline' && 'tile rounded-[10px] border-[1.5px] border-black bg-white py-1.5 pr-3 pl-2',
      )}
    >
      <TechLogo tech={tech} size={variant === 'outline' ? 20 : 18} />
      {tech.name}
    </span>
  );
}

/** Baldosa grande: logo arriba, nombre abajo (fichas de proyecto y perfil). */
export function TechTiles({ groups }: { groups: { key: string; items: Tech[] }[] }) {
  return (
    <>
      {groups.map((g) => (
        <div key={g.key} className="flex flex-col gap-2">
          <span className="text-[13px] font-bold text-gris-2">{g.key}</span>
          <div className="grid grid-cols-[repeat(auto-fill,minmax(84px,1fr))] gap-2">
            {g.items.map((t) => (
              <div key={t.id} title={t.name} className="tile flex min-h-[84px] flex-col items-center justify-center gap-[7px] rounded-[14px] border-[1.5px] border-linea bg-white px-1.5 py-2.5 text-center">
                <TechLogo tech={t} size={30} />
                <span className="text-xs leading-tight font-semibold text-tinta">{t.name}</span>
              </div>
            ))}
          </div>
        </div>
      ))}
    </>
  );
}

export function SocialPill({ href, icon, children, external = true }: { href: string; icon: ReactNode; children: ReactNode; external?: boolean }) {
  return (
    <a
      className="soc inline-flex min-h-11 items-center gap-2 rounded-full border-[1.5px] border-black bg-white pr-4 pl-3 text-sm font-bold text-black no-underline hover:text-black"
      href={href}
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
    >
      {icon}
      {children}
    </a>
  );
}

export const GithubImg = () => <img src="/img/icons/github.svg" alt="" className="block size-5" />;
export const LinkedinImg = () => <img src="/img/icons/linkedin.svg" alt="" className="block size-5" />;

/** Foto 4:5 o iniciales sobre color. */
export function Portrait({ name, url, bg, className, textClass, position = '50% 30%' }: { name: string; url: string | null; bg: string; className?: string; textClass?: string; position?: string }) {
  return (
    <div className={cn('relative overflow-hidden', className)} style={{ background: bg }}>
      {url ? (
        <img src={url} alt={name} className="absolute inset-0 size-full object-cover" style={{ objectPosition: position }} loading="lazy" />
      ) : (
        <span aria-hidden="true" className={cn('absolute inset-0 flex items-center justify-center font-black text-white italic', textClass)}>
          {initials(name)}
        </span>
      )}
    </div>
  );
}

export function RoundArrow({ dir, onClick, label, size = 46 }: { dir: 'prev' | 'next'; onClick: () => void; label: string; size?: number }) {
  const Icon = dir === 'prev' ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="bt btk flex shrink-0 cursor-pointer items-center justify-center rounded-full border-none bg-black text-white"
      style={{ width: size, height: size }}
    >
      <Icon className="size-[22px]" strokeWidth={2.8} />
    </button>
  );
}

export function ArrowUpIcon() {
  return <ArrowUp className="size-[22px]" strokeWidth={2.8} aria-hidden="true" />;
}

export const PALETTE = ['#E1251B', '#1B4B9B', '#000000', '#2F6FA8'];
export const colorFor = (i: number) => PALETTE[i % PALETTE.length];
