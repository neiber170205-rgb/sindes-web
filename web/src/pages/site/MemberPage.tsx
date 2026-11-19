import { Link, useParams } from 'react-router';
import { CvlacIcon, MailIcon, Portrait, TechTiles, TrophyIcon } from '@/components/site/bits';
import { ApiError } from '@/lib/api';
import { useDocumentTitle, useMember, useSite } from '@/lib/hooks';
import type { Member } from '@/lib/types';
import { githubUser, groupBy, linkedinUser, semesterLabel, shortName } from '@/lib/utils';
import { NotFound, PageError, PageLoading } from './States';

function LinkRow({ href, icon, label, value }: { href: string; icon: React.ReactNode; label: string; value: string }) {
  const external = !href.startsWith('mailto:');
  return (
    <a
      href={href}
      {...(external ? { target: '_blank', rel: 'noreferrer' } : {})}
      className="flex min-h-11 flex-wrap items-center justify-between gap-x-3 gap-y-1 rounded-[10px] border-[1.5px] border-[#C9C9CF] px-4 py-2 text-sm font-semibold text-black no-underline hover:border-black hover:text-black"
    >
      <span className="inline-flex items-center gap-2.5">
        {icon}
        {label}
      </span>
      <span className="font-mono text-xs font-normal [overflow-wrap:anywhere] text-gris-2">{value}</span>
    </a>
  );
}

function Panel({ title, children, className = '' }: { title: string; children: React.ReactNode; className?: string }) {
  return (
    <div className={`flex flex-col gap-3.5 rounded-[14px] border border-linea bg-white p-6 ${className}`}>
      <h2 className="text-xl font-semibold">{title}</h2>
      {children}
    </div>
  );
}

export default function MemberPage() {
  const { slug = '' } = useParams();
  const { data: m, isLoading, error, refetch } = useMember(slug);
  const { data: site } = useSite();
  useDocumentTitle(m ? `${shortName(m.fullName)} · SINDES` : undefined);
  if (isLoading) return <PageLoading />;
  if (error instanceof ApiError && error.status === 404) return <NotFound what="Este perfil" />;
  if (error || !m) return <PageError onRetry={() => refetch()} />;

  const docente = m.kind === 'docente';
  const research = site?.content.line.title?.replace(/\.$/, '');
  const data: [string, string | null][] = [
    ['Programa', `${m.program} · FESC`],
    [docente ? 'Rol' : 'Semestre', docente ? `${m.roleTitle} del semillero` : semesterLabel(m.semester)],
    ['Línea de investigación', research ?? null],
    [docente ? 'Dirige SINDES desde' : 'En SINDES desde', m.joinedOn],
  ];
  const techGroups = groupBy(m.technologies, (t) => t.category);

  return (
    <div className="bg-[#F4F4F5]">
      <div className="h-[150px]" style={{ background: 'linear-gradient(115deg, #E1251B 0 50%, #1B4B9B 50% 100%)' }} />
      <section className="-mt-[110px] px-6 pb-[88px]">
        <div className="mx-auto flex max-w-[1200px] flex-col gap-6">
          <div className="flex flex-wrap items-center gap-7 rounded-[18px] border border-linea bg-white p-[clamp(22px,3vw,36px)] shadow-[0_12px_32px_rgba(0,0,0,0.10)]">
            <Portrait
              name={m.fullName}
              url={m.photoUrl}
              bg={docente ? '#000' : '#1B4B9B'}
              className="size-[168px] shrink-0 rounded-full border-4 border-white shadow-[0_0_0_3px_#000]"
              position="50% 22%"
              textClass="text-6xl"
            />
            <div className="flex flex-[1_1_420px] flex-col gap-3">
              <nav aria-label="Ruta" className="flex flex-wrap gap-2 text-sm text-gris-2">
                <Link to="/#integrantes" className="text-marino hover:text-black">
                  Integrantes
                </Link>
                <span aria-hidden="true">/</span>
                <span>{shortName(m.fullName)}</span>
              </nav>
              <h1 className="text-[clamp(30px,3.4vw,44px)] leading-[1.08] font-extrabold">{m.fullName}</h1>
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full px-3 py-1.5 text-[13px] font-semibold text-white" style={{ background: docente ? '#E1251B' : '#1B4B9B' }}>
                  {m.roleTitle} de SINDES
                </span>
                <span className="rounded-full bg-[#DCEAF6] px-3 py-1.5 text-[13px] font-semibold text-black">
                  {docente ? `Programa de ${m.program} · FESC` : [m.program, semesterLabel(m.semester)].filter(Boolean).join(' · ')}
                </span>
              </div>
              {m.bio && <p className="max-w-[640px] text-base leading-[1.6] text-[#45454D]">{m.bio}</p>}
            </div>
            {(m.githubUrl || m.linkedinUrl || m.email || m.cvlacUrl) && (
              <div className="flex flex-[0_1_300px] flex-col gap-2">
                {m.cvlacUrl && <LinkRow href={m.cvlacUrl} icon={<CvlacIcon />} label="CvLAC" value="Minciencias" />}
                {m.githubUrl && <LinkRow href={m.githubUrl} icon={<img src="/img/icons/github.svg" alt="" className="size-5" />} label="GitHub" value={githubUser(m.githubUrl) ?? 'Perfil'} />}
                {m.linkedinUrl && <LinkRow href={m.linkedinUrl} icon={<img src="/img/icons/linkedin.svg" alt="" className="size-5" />} label="LinkedIn" value={linkedinUser(m.linkedinUrl) ?? 'Perfil'} />}
                {m.email && <LinkRow href={`mailto:${m.email}`} icon={<MailIcon />} label="Correo" value={m.email} />}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-start gap-6">
            <aside className="flex flex-[1_1_320px] flex-col gap-6">
              <Panel title={docente ? 'Datos docentes' : 'Datos académicos'}>
                <dl className="m-0 flex flex-col gap-3 text-sm">
                  {data
                    .filter(([, v]) => v)
                    .map(([k, v]) => (
                      <div key={k} className="flex flex-col gap-0.5">
                        <dt className="text-gris-2">{k}</dt>
                        <dd className="m-0 font-semibold">{v}</dd>
                      </div>
                    ))}
                </dl>
              </Panel>
              {techGroups.length > 0 && (
                <Panel title={docente ? 'Áreas y herramientas' : 'Stack'}>
                  <TechTiles groups={techGroups} />
                </Panel>
              )}
              {m.education.length > 0 && (
                <Panel title="Formación">
                  {m.education.map((e, k) => (
                    <div key={k} className={`flex flex-col gap-1 ${k ? 'border-t border-[#E9E9EC] pt-3.5' : ''}`}>
                      <span className="text-[15px] font-semibold">{e.title}</span>
                      {(e.institution || e.period) && <span className="text-sm text-gris-2">{[e.institution, e.period].filter(Boolean).join(' · ')}</span>}
                    </div>
                  ))}
                </Panel>
              )}
            </aside>

            <div className="flex min-w-0 flex-[999_1_560px] flex-col gap-6">
              {m.projects.length > 0 && <ProjectsPanel m={m} />}
              {m.achievements.length > 0 && (
                <div className="flex flex-col gap-1.5 rounded-[14px] border border-linea bg-white p-6">
                  <h2 className="pb-2 text-xl font-semibold">Participaciones y logros</h2>
                  {m.achievements.map((a, k) => {
                    const related = m.projects.find((p) => a.detail?.includes(p.name) || a.title.includes(p.name));
                    return (
                      <div key={k} className="flex items-start gap-4 border-t border-[#E9E9EC] py-4">
                        <span aria-hidden="true" className="flex size-12 shrink-0 items-center justify-center rounded-full text-white" style={{ background: k % 2 ? '#1B4B9B' : '#E1251B' }}>
                          <TrophyIcon />
                        </span>
                        <div className="flex flex-col gap-1">
                          <span className="text-base font-bold">{a.title}</span>
                          {(a.detail || a.date) && <span className="text-sm text-gris-2">{[a.detail, a.date].filter(Boolean).join(' · ')}</span>}
                          {related && (
                            <Link to={`/proyectos/${related.slug}`} className="inline-flex min-h-10 items-center self-start text-sm font-semibold text-marino">
                              Ver {related.name}
                            </Link>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
              {m.interests && (
                <Panel title="Intereses de investigación" className="gap-3">
                  <p className="text-[15px] leading-[1.6] text-[#45454D]">{m.interests}</p>
                </Panel>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function ProjectsPanel({ m }: { m: Member }) {
  return (
    <div className="flex flex-col gap-[18px] rounded-[14px] border border-linea bg-white p-6">
      <h2 className="text-xl font-semibold">Proyectos en el semillero</h2>
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(280px,100%),1fr))] gap-4">
        {m.projects.map((p) => (
          <Link key={p.id} to={`/proyectos/${p.slug}`} className="flex flex-col gap-2.5 rounded-xl border border-linea p-[18px] text-black no-underline transition-colors hover:border-black hover:text-black">
            <span className="self-start rounded-full bg-[#DCEAF6] px-2.5 py-1 text-xs font-semibold">{p.statusLabel}</span>
            <span className="text-[19px] font-semibold">{p.name}</span>
            {p.role && <span className="text-sm leading-normal text-[#45454D]">Rol: {p.role}</span>}
            <span className="text-sm font-semibold text-marino">Ver proyecto</span>
          </Link>
        ))}
      </div>
    </div>
  );
}
