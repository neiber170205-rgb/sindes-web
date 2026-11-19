import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router';
import { colorFor, CvlacIcon, GithubImg, LinkedinImg, MailIcon, Portrait, RoundArrow, SocialPill, TechChip } from '@/components/site/bits';
import { useReducedMotion, useTicker } from '@/lib/hooks';
import type { Member } from '@/lib/types';
import { semesterLabel } from '@/lib/utils';

export function programLine(m: Member, long = true) {
  if (m.kind === 'docente') return `Docente del programa de ${m.program}${long ? ', FESC' : ''}`;
  const parts = [m.program, semesterLabel(m.semester)].filter(Boolean).join(', ');
  return m.joinedOn && long ? `${parts} · en SINDES desde ${m.joinedOn.toLowerCase()}` : parts;
}

export function memberColor(m: Member, index: number) {
  if (m.kind === 'docente') return '#000000';
  return colorFor(index + 1);
}

function Links({ m, dark = false }: { m: Member; dark?: boolean }) {
  return (
    <div className="flex flex-wrap items-center gap-x-[18px] gap-y-1.5 text-[15px] font-bold">
      {m.cvlacUrl && (
        <SocialPill href={m.cvlacUrl} icon={<CvlacIcon />}>
          CvLAC
        </SocialPill>
      )}
      {m.githubUrl && (
        <SocialPill href={m.githubUrl} icon={<GithubImg />}>
          GitHub
        </SocialPill>
      )}
      {m.linkedinUrl && (
        <SocialPill href={m.linkedinUrl} icon={<LinkedinImg />}>
          LinkedIn
        </SocialPill>
      )}
      {m.email && (
        <SocialPill href={`mailto:${m.email}`} icon={<MailIcon />} external={false}>
          {m.email}
        </SocialPill>
      )}
      <Link
        to={`/integrantes/${m.slug}`}
        className={
          dark
            ? 'bt btb inline-flex min-h-[50px] items-center rounded-full bg-white px-6 text-black no-underline hover:text-black'
            : 'bt btk inline-flex min-h-[50px] items-center rounded-full bg-black px-6 text-white no-underline hover:text-white'
        }
      >
        Ver perfil completo
      </Link>
    </div>
  );
}

function Featured({ m }: { m: Member }) {
  return (
    <div className="rv">
      <article className="s s-up d2 flex flex-wrap items-center gap-x-10 gap-y-7 rounded-[28px] border-l-[10px] border-rojo bg-black p-[clamp(20px,3vw,34px)] text-white">
        <Portrait name={m.fullName} url={m.photoUrl} bg="#1C1C1C" className="aspect-[4/5] flex-[0_0_240px] rounded-[20px] max-sm:flex-[1_1_100%] max-sm:max-w-[280px]" position="50% 20%" textClass="text-[90px]" />
        <div className="flex min-w-0 flex-[1_1_380px] flex-col gap-3.5">
          <span className="self-start rounded-full bg-rojo px-3.5 py-1.5 text-[15px] font-bold text-white">{m.roleTitle} del semillero</span>
          <h3 className="text-[clamp(30px,3.6vw,50px)] leading-[1.02] font-black tracking-[-0.015em] italic">{m.fullName}</h3>
          <p className="text-lg font-semibold text-cielo">{programLine(m)}</p>
          {m.bio && <p className="max-w-[38em] text-[17px] leading-[1.6] text-[#D9D9D9]">{m.bio}</p>}
          <Links m={m} dark />
        </div>
      </article>
    </div>
  );
}

function Spotlight({ m, color, running, tick }: { m: Member; color: string; running: boolean; tick: number }) {
  return (
    <div key={`${m.id}-${tick}`} className="flex flex-wrap items-stretch gap-x-10 gap-y-7">
      <div className="sp-photo cut-tr-56 relative aspect-[4/5] max-w-[280px] min-w-[220px] flex-[0_1_280px] overflow-hidden" style={{ background: color }}>
        <Portrait name={m.fullName} url={m.photoUrl} bg={color} className="absolute inset-0" position="50% 25%" textClass="text-[clamp(80px,12vw,140px)]" />
        <span aria-hidden="true" className="absolute bottom-0 left-0 h-2 w-full bg-black/25" />
        <span aria-hidden="true" className="sp-bar absolute bottom-0 left-0 h-2 w-full origin-left bg-rojo" style={{ animationPlayState: running ? 'running' : 'paused' }} />
      </div>
      <div className="sp-info flex min-w-0 flex-[1_1_380px] flex-col justify-center gap-[18px]">
        <span className="self-start rounded-full px-3.5 py-1.5 text-[15px] font-bold text-white" style={{ background: m.kind === 'docente' ? '#E1251B' : '#1B4B9B' }}>
          {m.roleTitle}
        </span>
        <h3 className="text-[clamp(32px,4vw,56px)] leading-[1.02] font-black tracking-[-0.015em] italic">{m.fullName}</h3>
        <p className="text-lg text-gris">{programLine(m)}</p>
        {m.bio && <p className="line-clamp-4 max-w-[34em] text-lg leading-[1.55] text-tinta">{m.bio}</p>}
        {m.projects.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[15px] font-bold">Proyectos</span>
            <div className="flex flex-wrap gap-2">
              {m.projects.map((p) => (
                <Link key={p.id} to={`/proyectos/${p.slug}`} className="rounded-full bg-black px-[13px] py-1.5 text-sm font-semibold text-white no-underline hover:bg-marino hover:text-white">
                  {p.name}
                </Link>
              ))}
            </div>
          </div>
        )}
        {m.technologies.length > 0 && (
          <div className="flex flex-col gap-2">
            <span className="text-[15px] font-bold">Stack</span>
            <div className="flex flex-wrap gap-2">
              {m.technologies.slice(0, 10).map((t) => (
                <TechChip key={t.id} tech={t} variant="outline" />
              ))}
              {m.technologies.length > 10 && <span className="self-center text-sm font-semibold text-gris-2">y {m.technologies.length - 10} más</span>}
            </div>
          </div>
        )}
        <Links m={m} />
      </div>
    </div>
  );
}

export function Members({ members }: { members: Member[] }) {
  const reduce = useReducedMotion();
  const featured = members.find((m) => m.featured) ?? members.find((m) => m.kind === 'docente');
  const colors = useMemo(() => new Map(members.map((m, i) => [m.id, memberColor(m, i)])), [members]);

  const chips = useMemo(() => {
    const out: { key: string; label: string; ids: Set<number> }[] = [{ key: 'todos', label: 'Todos', ids: new Set(members.map((m) => m.id)) }];
    const docentes = members.filter((m) => m.kind === 'docente');
    if (docentes.length) out.push({ key: 'docentes', label: docentes.length === 1 ? 'Dirección' : 'Docentes', ids: new Set(docentes.map((m) => m.id)) });
    const byProject = new Map<string, Set<number>>();
    for (const m of members) for (const p of m.projects) byProject.set(p.name, (byProject.get(p.name) ?? new Set()).add(m.id));
    for (const [name, ids] of byProject) out.push({ key: name, label: name, ids });
    return out;
  }, [members]);

  const [chip, setChip] = useState('todos');
  const [ti, setTi] = useState(0);
  const [tick, setTick] = useState(0);
  const [autoOff, setAutoOff] = useState(false);
  const [hover, setHover] = useState(false);
  // La persona destacada ya aparece arriba: en «Todos» el carrusel arranca con el resto del equipo.
  const inChip = members.filter((m) => chips.find((c) => c.key === chip)?.ids.has(m.id));
  const list = chip === 'todos' && featured && inChip.length > 1 ? inChip.filter((m) => m.id !== featured.id) : inChip;
  const n = Math.max(list.length, 1);
  const idx = ti % n;
  const cur = list[idx];
  const auto = !autoOff && !reduce;
  const running = auto && !hover;

  const step = (d: number) => {
    setTi((i) => (((i + d) % n) + n) % n);
    setTick((t) => t + 1);
  };
  useTicker(() => step(1), 6000, running && list.length > 1);

  // La miniatura elegida queda al centro de la tira.
  const strip = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = strip.current?.querySelector<HTMLElement>('[data-sel="si"]');
    const box = el?.parentElement;
    if (!strip.current || !box) return;
    strip.current.scrollTo({ left: box.offsetLeft - strip.current.offsetLeft - (strip.current.clientWidth - box.offsetWidth) / 2, behavior: reduce ? 'auto' : 'smooth' });
  }, [idx, chip, reduce]);

  if (!members.length) return null;

  return (
    <section id="integrantes" className="overflow-hidden bg-hielo px-6 py-[clamp(64px,8vw,104px)]">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-9">
        <div className="rv flex flex-wrap items-end justify-between gap-x-8 gap-y-5">
          <div className="flex flex-col gap-3">
            <h2 className="s s-wipe pr-[0.12em] text-[clamp(32px,4.3vw,60px)] leading-[1.02] font-black tracking-[-0.015em] italic">Quiénes hacemos SINDES.</h2>
            <p className="s s-up d2 text-[19px] leading-normal text-tinta">
              Somos {members.length} {members.length === 1 ? 'persona' : 'personas'}. Toca una cara para conocerla.
            </p>
          </div>
          {chips.length > 2 && (
            <div className="s s-up d3 flex flex-wrap gap-2" role="group" aria-label="Filtrar por proyecto">
              {chips.map((c) => {
                const on = chip === c.key;
                return (
                  <button
                    key={c.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => {
                      setChip(c.key);
                      setTi(0);
                      setTick((t) => t + 1);
                    }}
                    className="min-h-[46px] cursor-pointer rounded-full border-2 border-black px-[18px] text-[15px] font-bold"
                    style={{ background: on ? '#000' : '#fff', color: on ? '#fff' : '#000' }}
                  >
                    {c.label} <span className="font-medium opacity-75">{c.ids.size}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {featured && <Featured m={featured} />}

        {cur && (
          <div className="rv">
            <div className="s s-up d2" aria-live="polite" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
              <Spotlight m={cur} color={colors.get(cur.id) ?? '#1B4B9B'} running={running} tick={tick} />
            </div>
          </div>
        )}

        {list.length > 1 && (
          <div className="rv flex flex-col gap-3.5">
            <div className="s s-up d3 flex items-center gap-3">
              <RoundArrow dir="prev" label="Integrante anterior" size={52} onClick={() => step(-1)} />
              <div ref={strip} role="list" aria-label="Integrantes" className="flex min-w-0 flex-1 snap-x snap-mandatory gap-2.5 overflow-x-auto px-1 pt-2 pb-3 [scrollbar-width:thin]">
                {list.map((m, i) => {
                  const on = i === idx;
                  return (
                    <div role="listitem" key={m.id} className="flex-none snap-center">
                      <button
                        type="button"
                        className="thumb relative block h-[104px] w-[84px] cursor-pointer overflow-hidden rounded-[14px] border-[3px] p-0"
                        data-sel={on ? 'si' : 'no'}
                        aria-pressed={on}
                        aria-label={m.fullName}
                        onClick={() => {
                          setTi(i);
                          setTick((t) => t + 1);
                          setAutoOff(true);
                        }}
                        style={{ background: colors.get(m.id), borderColor: on ? '#E1251B' : 'transparent', transform: `translateY(${on ? -8 : 0}px)`, opacity: on ? 1 : 0.62 }}
                      >
                        <Portrait name={m.fullName} url={m.photoUrl} bg={colors.get(m.id) ?? '#000'} className="absolute inset-0" position="50% 25%" textClass="text-[26px]" />
                      </button>
                    </div>
                  );
                })}
              </div>
              <RoundArrow dir="next" label="Siguiente integrante" size={52} onClick={() => step(1)} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-x-5 gap-y-2.5">
              <span className="text-base font-bold">
                {idx + 1} de {list.length}
              </span>
              {!reduce && (
                <button
                  type="button"
                  onClick={() => setAutoOff((o) => !o)}
                  aria-pressed={auto}
                  className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border-2 border-black bg-white px-4 text-sm font-bold text-black"
                >
                  {auto ? 'Pausar rotación' : 'Rotar sola'}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
