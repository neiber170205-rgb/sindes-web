import { ExternalLink, Images, Pencil, Plus, Trash2, Users } from 'lucide-react';
import { Link, useOutletContext } from 'react-router';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { api } from '@/lib/api';
import type { Project, SessionUser } from '@/lib/types';
import { useAdminProjects } from './shared';
import { Confirm, Empty, PageHeader, Spinner, useAction } from './ui';

function Card({ p }: { p: Project }) {
  const me = useOutletContext<SessionUser>();
  const inv = [['admin', 'projects']];
  const pub = useAction((published: boolean) => api.patch(`/admin/projects/${p.id}/published`, { published }), {
    success: (r) => ((r as Project).published ? `${p.name} ya se ve en la página` : `${p.name} quedó oculto`),
    invalidate: inv,
  });
  const del = useAction(() => api.del(`/admin/projects/${p.id}`), { success: 'Proyecto eliminado', invalidate: inv });
  const cover = p.images[0];
  return (
    <article className="flex flex-col overflow-hidden rounded-2xl border border-linea bg-white">
      <Link to={`/admin/proyectos/${p.id}`} className="relative block aspect-[16/9] bg-[#1C1C1C]">
        {cover ? (
          <img src={cover.url} alt="" className="size-full object-cover object-top" />
        ) : (
          <span className="flex size-full items-center justify-center text-sm text-white/70">Sin capturas</span>
        )}
        <Badge variant="azul" className="absolute top-3 left-3">
          {p.statusLabel}
        </Badge>
      </Link>
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-col gap-1">
          <h2 className="text-2xl font-black italic">{p.name}</h2>
          {p.subtitle && <p className="text-sm text-gris">{p.subtitle}</p>}
        </div>
        <div className="flex flex-wrap gap-4 text-sm text-gris-2">
          <span className="inline-flex items-center gap-1.5">
            <Images className="size-4" /> {p.images.length} capturas
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Users className="size-4" /> {p.team.length} en el equipo
          </span>
        </div>
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 border-t border-linea pt-4">
          <label className="flex cursor-pointer items-center gap-2.5 text-sm font-semibold">
            <Switch checked={p.published} onCheckedChange={(c) => pub.mutate(c)} disabled={pub.isPending} />
            {p.published ? 'Publicado' : 'Oculto'}
          </label>
          <div className="flex gap-1">
            {p.published && (
              <Button asChild variant="ghost" size="icon-sm" aria-label="Ver en la página">
                <a href={`/proyectos/${p.slug}`} target="_blank" rel="noreferrer">
                  <ExternalLink />
                </a>
              </Button>
            )}
            {me.role === 'admin' && (
            <Confirm
              title={`¿Eliminar ${p.name}?`}
              description="Se borran sus capturas y la relación con el equipo. Los perfiles de las personas no se tocan. No se puede deshacer."
              onConfirm={() => del.mutate(undefined)}
              trigger={
                <Button variant="ghost" size="icon-sm" aria-label={`Eliminar ${p.name}`} className="text-rojo-texto">
                  <Trash2 />
                </Button>
              }
            />
            )}
            <Button asChild size="sm">
              <Link to={`/admin/proyectos/${p.id}`}>
                <Pencil /> Editar
              </Link>
            </Button>
          </div>
        </div>
      </div>
    </article>
  );
}

export default function Projects() {
  const { data, isLoading } = useAdminProjects();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Proyectos"
        description="Lo que aparece en «Lo que está creciendo» y en la página de cada proyecto. Un proyecto oculto no se ve en la página."
        actions={
          <Button asChild>
            <Link to="/admin/proyectos/nuevo">
              <Plus /> Nuevo proyecto
            </Link>
          </Button>
        }
      />
      {isLoading ? (
        <Spinner />
      ) : !data?.length ? (
        <Empty title="Todavía no hay proyectos.">
          <Button asChild>
            <Link to="/admin/proyectos/nuevo">Crear el primero</Link>
          </Button>
        </Empty>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {data.map((p) => (
            <Card key={p.id} p={p} />
          ))}
        </div>
      )}
    </div>
  );
}
