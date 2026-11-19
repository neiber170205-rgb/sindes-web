import { ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { Link, useParams } from 'react-router';
import { colorFor, TechTiles } from '@/components/site/bits';
import { ApiError } from '@/lib/api';
import { useDocumentTitle, useProject } from '@/lib/hooks';
import type { Project } from '@/lib/types';
import { groupBy, initials, shortName } from '@/lib/utils';
import { NotFound, PageError, PageLoading } from './States';

const STAT_STYLE = [
  { bg: '#000000', fg: '#FFFFFF' },
  { bg: '#1B4B9B', fg: '#FFFFFF' },
  { bg: '#3F95CB', fg: '#000000' },
  { bg: '#E1251B', fg: '#FFFFFF' },
];
const FEATURE_BORDER = ['#000000', '#1B4B9B', '#3F95CB', '#E1251B'];

function Gallery({ p }: { p: Project }) {
  const [g, setG] = useState(0);
  if (!p.images.length) return null;
  const cur = p.images[g] ?? p.images[0];
  return (
    <section id="galeria" className="-mt-[84px] px-6">
      <div className="mx-auto flex max-w-[1200px] flex-col gap-3.5">
        <div className="relative aspect-[16/10] overflow-hidden rounded-[22px] bg-[#EEE] shadow-[0_18px_44px_rgba(0,0,0,0.18)]">
          <img key={cur.id} className="shot absolute inset-0 size-full object-cover object-top" src={cur.url} alt={cur.alt || cur.caption || p.name} />
          {cur.caption && <span className="absolute bottom-4 left-4 rounded-full bg-black px-[13px] py-[7px] text-sm font-bold text-white">{cur.caption}</span>}
        </div>
        {p.images.length > 1 && (
          <div role="group" aria-label="Capturas" className="flex gap-3 overflow-x-auto px-0.5 pt-1 pb-2">
            {p.images.map((im, k) => (
              <button
                key={im.id}
                type="button"
                className="tb h-[82px] w-[132px] flex-none cursor-pointer overflow-hidden rounded-xl border-[3px] bg-[#EEE] p-0"
                onClick={() => setG(k)}
                aria-pressed={k === g}
                aria-label={`Ver: ${im.caption || `captura ${k + 1}`}`}
                style={{ borderColor: k === g ? '#E1251B' : 'transparent' }}
              >
                <img src={im.url} alt="" className="block size-full object-cover object-top" loading="lazy" />
              </button>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

function Box({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-3.5 rounded-[18px] border-2 border-black p-[22px] ${className}`}>
      <h3 className="text-[19px] font-extrabold">{title}</h3>
      {children}
    </div>
  );
}

export default function ProjectPage() {
  const { slug = '' } = useParams();
  const { data: p, isLoading, error, refetch } = useProject(slug);
  useDocumentTitle(p ? `${p.name} · SINDES` : undefined);
  if (isLoading) return <PageLoading />;
  if (error instanceof ApiError && error.status === 404) return <NotFound what="Este proyecto" />;
  if (error || !p) return <PageError onRetry={() => refetch()} />;

  const facts = [{ label: 'Estado', value: p.statusLabel }, ...p.facts];
  const techGroups = groupBy(p.technologies, (t) => t.category);

  return (
    <div className="bg-white">
      <section
        className="bg-black px-6 pt-14"
        style={{ backgroundImage: 'radial-gradient(rgba(63,149,203,0.45) 1px, transparent 1px)', backgroundSize: '22px 22px', paddingBottom: p.images.length ? 120 : 64 }}
      >
        <div className="mx-auto flex max-w-[1200px] flex-col gap-5">
          <nav aria-label="Ruta" className="flex flex-wrap gap-2 text-sm text-[#D6D6DB]">
            <Link to="/" className="text-cielo hover:text-white">
              Inicio
            </Link>
            <span aria-hidden="true">/</span>
            <Link to="/#proyectos" className="text-cielo hover:text-white">
              Proyectos
            </Link>
            <span aria-hidden="true">/</span>
            <span>{p.name}</span>
          </nav>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-full bg-azul px-3 py-1.5 text-[13px] font-bold text-black">{p.statusLabel}</span>
            {p.focus && <span className="rounded-full bg-white px-3 py-1.5 text-[13px] font-bold text-black">Enfoque: {p.focus.toLowerCase()}</span>}
            {p.tag && <span className="rounded-full border-[1.5px] border-white/60 px-3 py-1.5 text-[13px] font-bold text-white">{p.tag}</span>}
          </div>
          <h1 className="text-[clamp(44px,6vw,84px)] leading-[0.98] font-black text-white italic">{p.name}</h1>
          {p.subtitle && <p className="text-[clamp(19px,2vw,24px)] font-semibold text-cielo">{p.subtitle}</p>}
          {p.intro && <p className="max-w-[720px] text-lg leading-[1.6] text-[#D6D6DB]">{p.intro}</p>}
          <div className="flex flex-wrap gap-3">
            {p.images.length > 0 && (
              <a href="#galeria" className="bt btb inline-flex min-h-[50px] items-center rounded-full bg-rojo px-6 text-base font-bold text-white no-underline hover:text-white">
                Ver capturas
              </a>
            )}
            {p.demoUrl && (
              <a
                href={p.demoUrl}
                target="_blank"
                rel="noreferrer"
                className="bt btr inline-flex min-h-[50px] items-center rounded-full bg-white px-6 text-base font-bold text-black no-underline hover:text-black"
              >
                Probar la app
              </a>
            )}
          </div>
        </div>
      </section>

      <Gallery p={p} />

      {p.stats.length > 0 && (
        <section className="px-6 pt-12">
          <div className="mx-auto grid max-w-[1200px] grid-cols-[repeat(auto-fit,minmax(min(200px,100%),1fr))] gap-3.5">
            {p.stats.map((s, k) => {
              const st = STAT_STYLE[k % STAT_STYLE.length];
              return (
                <div key={k} className="flex flex-col gap-1 rounded-2xl px-5 py-[18px]" style={{ background: st.bg, color: st.fg }}>
                  <span className="text-[clamp(30px,3vw,44px)] leading-none font-black italic">{s.value}</span>
                  <span className="text-[15px] font-medium">{s.label}</span>
                </div>
              );
            })}
          </div>
        </section>
      )}

      <section className="px-6 pt-14 pb-[88px]">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-start gap-14">
          <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-[52px]">
            {(p.problem || p.solution) && (
              <div className="grid grid-cols-[repeat(auto-fit,minmax(min(300px,100%),1fr))] gap-7">
                {p.problem && (
                  <div className="flex flex-col gap-3">
                    <h2 className="text-3xl font-black italic">El problema</h2>
                    <p className="text-[17px] leading-[1.65] text-[#2A2A30]">{p.problem}</p>
                  </div>
                )}
                {p.solution && (
                  <div className="flex flex-col gap-3">
                    <h2 className="text-3xl font-black italic">La solución</h2>
                    <p className="text-[17px] leading-[1.65] text-[#2A2A30]">{p.solution}</p>
                  </div>
                )}
              </div>
            )}

            {p.features.length > 0 && (
              <div className="flex flex-col gap-[18px]">
                <h2 className="text-3xl font-black italic">{p.featuresTitle}</h2>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(240px,100%),1fr))] gap-3.5">
                  {p.features.map((f, k) => (
                    <div key={k} className="flex flex-col gap-2 rounded-[18px] border-t-[5px] bg-[#F4F7FA] p-[22px]" style={{ borderTopColor: FEATURE_BORDER[k % 4] }}>
                      <h3 className="text-[19px] font-extrabold">{f.title}</h3>
                      <p className="text-[15px] leading-[1.55] text-gris">{f.description}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {p.layers.length > 0 && (
              <div className="flex flex-col gap-[18px]">
                <h2 className="text-3xl font-black italic">Cómo está construido</h2>
                <div className="grid grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-3.5">
                  {p.layers.map((l, k) => (
                    <div key={k} className="flex flex-col gap-1.5 rounded-2xl bg-black px-5 py-[18px] text-white">
                      <span className="text-[13px] font-semibold text-cielo">{l.label}</span>
                      <span className="text-lg font-extrabold">{l.title}</span>
                      <span className="text-sm leading-normal text-[#D9D9D9]">{l.description}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {p.extraTitle && p.extraBody && (
              <div className="flex flex-col gap-3.5 rounded-[22px] bg-black p-[26px] text-white">
                <h2 className="text-[26px] font-black italic">{p.extraTitle}</h2>
                {p.extraBody.split(/\n{2,}/).map((para, k) => (
                  <p key={k} className={k === 0 ? 'text-base leading-[1.6] text-[#D9D9D9]' : 'text-sm text-[#BDBDBD]'}>
                    {para}
                  </p>
                ))}
              </div>
            )}

            {p.milestones.length > 0 && (
              <div className="flex flex-col gap-2.5">
                <h2 className="text-3xl font-black italic">Avances</h2>
                <ol className="m-0 list-none border-b border-linea p-0">
                  {p.milestones.map((h, k) => (
                    <li key={k} className="flex gap-[18px] border-t border-linea py-4 max-sm:flex-col max-sm:gap-1">
                      <span className="flex-[0_0_120px] pt-0.5 text-sm font-bold" style={{ color: h.pending ? '#C41E15' : '#1B4B9B' }}>
                        {h.date}
                      </span>
                      <div className="flex flex-col gap-1">
                        <span className="text-[17px] font-bold">{h.title}</span>
                        {h.description && <span className="text-[15px] leading-normal text-[#45454D]">{h.description}</span>}
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            )}
          </div>

          <aside className="flex flex-[1_1_300px] flex-col gap-[18px]">
            <Box title="Ficha">
              <dl className="m-0 flex flex-col gap-3 text-[15px]">
                {facts.map((f, k) => (
                  <div key={k} className="flex justify-between gap-4">
                    <dt className="text-gris-2">{f.label}</dt>
                    <dd className="m-0 text-right font-bold">{f.value}</dd>
                  </div>
                ))}
              </dl>
            </Box>
            {techGroups.length > 0 && (
              <Box title="Tecnologías">
                <TechTiles groups={techGroups} />
              </Box>
            )}
            {p.team.length > 0 && (
              <div className="flex flex-col gap-1.5 rounded-[18px] border-2 border-black p-[22px]">
                <h3 className="pb-2 text-[19px] font-extrabold">Equipo</h3>
                {p.team.map((t, k) => (
                  <Link key={t.id} to={`/integrantes/${t.slug}`} className="mem -mx-2 flex min-h-16 items-center gap-3 rounded-[14px] px-2 py-1.5 text-black no-underline hover:text-black">
                    {t.photoUrl ? (
                      <img src={t.photoUrl} alt="" className="size-14 shrink-0 rounded-full border-[3px] object-cover object-[50%_20%]" style={{ borderColor: t.kind === 'docente' ? '#E1251B' : '#1B4B9B' }} />
                    ) : (
                      <span aria-hidden="true" className="flex size-14 shrink-0 items-center justify-center rounded-full text-[17px] font-extrabold text-white" style={{ background: t.kind === 'docente' ? '#000' : colorFor(k + 1) }}>
                        {initials(t.fullName)}
                      </span>
                    )}
                    <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                      <span className="text-[15px] font-bold">{shortName(t.fullName)}</span>
                      <span className="text-[13px] text-gris-2">{t.role || t.roleTitle}</span>
                    </span>
                    <ChevronRight className="size-[18px]" strokeWidth={2.6} aria-hidden="true" />
                  </Link>
                ))}
              </div>
            )}
            {p.documents.length > 0 && (
              <div className="flex flex-col gap-2.5 rounded-[18px] bg-hielo p-[22px]">
                <h3 className="text-[19px] font-extrabold">Documentos</h3>
                {p.documents.map((d, k) => (
                  <span key={k} className="flex min-h-10 items-center border-b border-[#D5DEE6] text-[15px] font-semibold">
                    {d}
                  </span>
                ))}
              </div>
            )}
          </aside>
        </div>
      </section>
    </div>
  );
}
