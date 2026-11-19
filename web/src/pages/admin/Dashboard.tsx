import { ArrowRight, FolderKanban, Link2, PenLine } from 'lucide-react';
import { Link, useOutletContext } from 'react-router';
import { Portrait } from '@/components/site/bits';
import { Button } from '@/components/ui/button';
import type { SessionUser } from '@/lib/types';
import { useSummary } from './AdminApp';
import { InviteButton, useAdminMembers, useAdminProjects } from './shared';
import { fmtDate, fmtRelative, Panel, PageHeader, Spinner } from './ui';

export default function Dashboard() {
  const user = useOutletContext<SessionUser>();
  const { data: s } = useSummary();
  const { data: members, isLoading, refetch } = useAdminMembers();
  const { data: projects } = useAdminProjects();
  if (isLoading || !s) return <Spinner />;

  const pending = members?.filter((m) => m.status === 'pending') ?? [];
  const drafts = members?.filter((m) => m.status === 'draft') ?? [];
  const pct = s.total ? Math.round((s.published / s.total) * 100) : 0;
  const tiles = [
    { label: 'Por revisar', value: s.pending, cls: 'bg-rojo text-white' },
    { label: 'Sin enviar', value: s.draft, cls: 'bg-white border border-linea' },
    { label: 'Publicados', value: s.published, cls: 'bg-black text-white' },
    { label: 'Proyectos publicados', value: projects?.filter((p) => p.published).length ?? 0, cls: 'bg-azul text-black' },
  ];

  return (
    <div className="flex flex-col gap-8">
      <PageHeader title={`Hola, ${user.name.split(' ')[0]}.`} description="Así va la página del semillero." />

      <section className="flex flex-col gap-4 rounded-2xl bg-white p-6 shadow-[6px_6px_0_#000] ring-2 ring-black">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm font-semibold text-gris-2">Perfiles publicados</p>
            <p className="text-4xl font-black italic">
              {s.published} <span className="text-xl font-bold text-gris-2 not-italic">de {s.total}</span>
            </p>
          </div>
          <Button asChild>
            <Link to="/admin/invitar">
              <Link2 /> Invitar integrantes
            </Link>
          </Button>
        </div>
        <div className="h-3 overflow-hidden rounded-full bg-[#D5DEE6]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Avance de perfiles publicados">
          <div className="h-full rounded-full bg-rojo transition-[width] duration-700" style={{ width: `${pct}%` }} />
        </div>
      </section>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {tiles.map((t) => (
          <div key={t.label} className={`flex flex-col gap-1 rounded-2xl px-5 py-4 ${t.cls}`}>
            <span className="text-4xl leading-none font-black italic">{t.value}</span>
            <span className="text-sm font-semibold">{t.label}</span>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Por revisar" description="Perfiles que ya enviaron su formulario.">
          {!pending.length && <p className="text-sm text-gris-2">Nada pendiente. Cuando alguien envíe su perfil aparecerá aquí.</p>}
          <ul className="m-0 flex list-none flex-col p-0">
            {pending.map((m, k) => (
              <li key={m.id} className={`flex items-center gap-3 py-3 ${k ? 'border-t border-linea' : ''}`}>
                <Portrait name={m.fullName} url={m.photoUrl} bg="#1B4B9B" className="size-12 shrink-0 rounded-full" textClass="text-base not-italic" />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate font-semibold">{m.fullName}</span>
                  <span className="text-xs text-gris-2">Enviado {fmtRelative(m.submittedAt)}</span>
                </div>
                <Button asChild size="sm">
                  <Link to={`/admin/integrantes/${m.id}`}>Revisar</Link>
                </Button>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="Sin enviar" description="Tienen link pero no han terminado.">
          {!drafts.length && <p className="text-sm text-gris-2">Todos los invitados ya enviaron su perfil.</p>}
          <ul className="m-0 flex list-none flex-col p-0">
            {drafts.slice(0, 8).map((m, k) => {
              const expired = m.inviteExpiresAt && new Date(m.inviteExpiresAt) < new Date();
              return (
                <li key={m.id} className={`flex flex-wrap items-center gap-3 py-3 ${k ? 'border-t border-linea' : ''}`}>
                  <div className="flex min-w-0 flex-1 flex-col">
                    <span className="truncate font-semibold">{m.fullName}</span>
                    <span className={`text-xs ${expired || !m.hasInvite ? 'text-rojo-texto' : 'text-gris-2'}`}>
                      {!m.hasInvite ? 'Sin link' : expired ? 'El link venció' : `Link vigente hasta ${fmtDate(m.inviteExpiresAt)}`}
                    </span>
                  </div>
                  <InviteButton member={m} onDone={() => refetch()} />
                </li>
              );
            })}
          </ul>
          {drafts.length > 8 && (
            <Link to="/admin/integrantes?estado=draft" className="text-sm font-semibold text-marino">
              Ver los {drafts.length}
            </Link>
          )}
        </Panel>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        {[
          { to: '/admin/proyectos', icon: FolderKanban, label: 'Proyectos', text: 'Capturas, equipo y avances.' },
          { to: '/admin/contenido', icon: PenLine, label: 'Textos de la página', text: 'Inicio, misión, reunión y más.' },
          { to: '/admin/integrantes', icon: Link2, label: 'Integrantes', text: 'Editar, publicar u ocultar.' },
        ].map((a) => (
          <Link key={a.to} to={a.to} className="group flex items-center gap-4 rounded-2xl border border-linea bg-white p-5 text-black no-underline hover:border-black hover:text-black">
            <a.icon className="size-6 shrink-0" />
            <span className="flex flex-1 flex-col">
              <span className="font-bold">{a.label}</span>
              <span className="text-sm text-gris-2">{a.text}</span>
            </span>
            <ArrowRight className="size-5 transition-transform group-hover:translate-x-1" />
          </Link>
        ))}
      </div>
    </div>
  );
}
