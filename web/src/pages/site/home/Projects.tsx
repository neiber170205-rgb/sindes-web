import { useState } from 'react';
import { Link } from 'react-router';
import { TechChip } from '@/components/site/bits';
import type { Project } from '@/lib/types';
import { shortName } from '@/lib/utils';

type Filter = 'todos' | 'activos' | 'finalizados';

function Shots({ p }: { p: Project }) {
  const imgs = p.images.slice(0, 4);
  const [g, setG] = useState(0);
  if (!imgs.length) {
    return (
      <div
        role="img"
        aria-label="Este proyecto aún no tiene capturas"
        className="cut-tl-48 flex aspect-video items-center justify-center text-sm font-medium text-[#D9D9D9]"
        style={{ background: 'repeating-linear-gradient(135deg, #1C1C1C 0 14px, #2A2A2A 14px 28px)' }}
      >
        Pronto habrá capturas
      </div>
    );
  }
  const cur = imgs[g] ?? imgs[0];
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="cut-tl-48 relative aspect-[16/10] overflow-hidden bg-[#1C1C1C]">
        <img key={cur.id} className="shot absolute inset-0 size-full object-cover object-top" src={cur.url} alt={cur.alt || cur.caption || p.name} loading="lazy" />
      </div>
      {imgs.length > 1 && (
        <div role="group" aria-label="Capturas" className="flex flex-wrap gap-2.5">
          {imgs.map((im, k) => (
            <button
              key={im.id}
              type="button"
              onClick={() => setG(k)}
              aria-pressed={k === g}
              aria-label={`Ver captura ${k + 1}${im.caption ? `: ${im.caption}` : ''}`}
              className="h-[60px] w-24 cursor-pointer overflow-hidden rounded-[10px] border-[3px] bg-[#1C1C1C] p-0"
              style={{ borderColor: k === g ? '#E1251B' : 'transparent' }}
            >
              <img src={im.url} alt="" className="block size-full object-cover object-top" loading="lazy" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Row({ p, open, onToggle, delay }: { p: Project; open: boolean; onToggle: () => void; delay: number }) {
  const team = p.team.map((t) => shortName(t.fullName));
  return (
    <article className={`s s-wipe d${Math.min(delay, 6)} border-t-[1.5px] border-white/30`}>
      <button
        type="button"
        className="prh flex w-full cursor-pointer items-center justify-between gap-5 border-none bg-transparent py-[26px] text-left text-white"
        onClick={onToggle}
        aria-expanded={open}
      >
        <span className="prt flex min-w-0 flex-col gap-2">
          <span className="flex flex-wrap items-center gap-x-5 gap-y-2.5">
            <span className="text-[clamp(30px,4.2vw,58px)] leading-none font-black italic">{p.name}</span>
            <span className="rounded-full bg-azul px-[13px] py-1.5 text-sm font-bold text-black">{p.statusLabel}</span>
          </span>
          {p.subtitle && <span className="text-[clamp(16px,1.5vw,19px)] font-medium text-[#CFCFCF]">{p.subtitle}</span>}
        </span>
        <span
          className="plus flex size-[52px] shrink-0 items-center justify-center rounded-full border-2 border-white"
          aria-hidden="true"
          style={{ transform: `rotate(${open ? 45 : 0}deg)` }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round">
            <path d="M12 4v16M4 12h16" />
          </svg>
        </span>
      </button>
      <div className="grid transition-[grid-template-rows] duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]" style={{ gridTemplateRows: open ? '1fr' : '0fr' }}>
        <div className="min-h-0 overflow-hidden" inert={!open}>
          <div className="grid grid-cols-[repeat(auto-fit,minmax(min(380px,100%),1fr))] items-start gap-x-11 gap-y-7 pt-1.5 pb-10">
            <Shots p={p} />
            <div className="flex flex-col gap-4">
              {(p.summary || p.intro) && <p className="text-lg leading-[1.55] text-[#E6E6E6]">{p.summary || p.intro}</p>}
              {p.technologies.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {p.technologies.slice(0, 6).map((t) => (
                    <TechChip key={t.id} tech={t} />
                  ))}
                </div>
              )}
              {p.focus && <p className="text-[15px] text-[#BDBDBD]">Enfoque: {p.focus.toLowerCase()}</p>}
              {team.length > 0 && <p className="text-[15px] text-[#BDBDBD]">Equipo: {team.join(', ')}</p>}
              <div className="flex flex-wrap gap-2.5">
                <Link
                  to={`/proyectos/${p.slug}`}
                  className="bt btr inline-flex min-h-[50px] items-center rounded-full bg-white px-6 text-base font-bold text-black no-underline hover:text-black"
                >
                  Ver proyecto completo
                </Link>
                {p.demoUrl && (
                  <a
                    href={p.demoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="bt btr inline-flex min-h-[50px] items-center rounded-full border-2 border-white px-6 text-base font-bold text-white no-underline hover:text-white"
                  >
                    Probar la app
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </article>
  );
}

export function Projects({ projects }: { projects: Project[] }) {
  const [filter, setFilter] = useState<Filter>('todos');
  const [openId, setOpenId] = useState<number | null>(projects[0]?.id ?? null);
  const shown = projects.filter((p) => (filter === 'todos' ? true : filter === 'activos' ? p.status !== 'finalizado' : p.status === 'finalizado'));
  const pills: [Filter, string][] = [
    ['todos', 'Todos'],
    ['activos', 'En desarrollo'],
    ['finalizados', 'Finalizados'],
  ];

  return (
    <section id="proyectos" className="dk bg-black px-6 py-[clamp(64px,8vw,104px)]">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-10">
        <div className="rv flex flex-wrap items-end justify-between gap-6">
          <h2 className="s s-wipe pr-[0.12em] text-[clamp(32px,4.3vw,60px)] leading-[1.02] font-black tracking-[-0.015em] text-white italic">Lo que está creciendo.</h2>
          <div className="s s-up d2 flex flex-wrap gap-2" role="group" aria-label="Filtrar proyectos">
            {pills.map(([k, label]) => {
              const on = filter === k;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFilter(k)}
                  aria-pressed={on}
                  className="min-h-[46px] cursor-pointer rounded-full border-2 px-5 text-[15px] font-bold"
                  style={on ? { background: '#fff', color: '#000', borderColor: '#fff' } : { background: 'transparent', color: '#fff', borderColor: 'rgba(255,255,255,0.5)' }}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>

        <div className="rv border-b-[1.5px] border-white/30">
          {shown.map((p, k) => (
            <Row key={p.id} p={p} delay={k + 1} open={openId === p.id} onToggle={() => setOpenId(openId === p.id ? null : p.id)} />
          ))}
          {!shown.length && (
            <p className="border-t-[1.5px] border-white/30 py-10 text-lg text-[#CFCFCF]">
              {filter === 'finalizados' ? 'Todavía no hay proyectos finalizados. Los primeros están en camino.' : 'Pronto publicaremos los proyectos del semillero.'}
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
