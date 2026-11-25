import { Download, Eye, EyeOff, MoreHorizontal, Pencil, Plus, Search, Star, Trash2 } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Link, useNavigate, useOutletContext, useSearchParams } from 'react-router';
import { Portrait } from '@/components/site/bits';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api';
import type { AdminMember, MemberStatus, SessionUser } from '@/lib/types';
import { InviteButton, useAdminMembers } from './shared';
import { Confirm, Empty, fmtRelative, PageHeader, Spinner, StatusBadge, useAction } from './ui';

type Tab = 'todos' | MemberStatus;
const TABS: [Tab, string][] = [
  ['todos', 'Todos'],
  ['pending', 'Por revisar'],
  ['draft', 'Sin enviar'],
  ['published', 'Publicados'],
  ['hidden', 'Ocultos'],
];

function RowActions({ m }: { m: AdminMember }) {
  const nav = useNavigate();
  const me = useOutletContext<SessionUser>();
  const inv = [['admin', 'members'], ['admin', 'summary']];
  const status = useAction((s: MemberStatus) => api.post(`/admin/members/${m.id}/status`, { status: s }), {
    success: (r) => ((r as AdminMember).status === 'published' ? 'Perfil publicado' : 'Perfil oculto'),
    invalidate: inv,
  });
  const del = useAction(() => api.del(`/admin/members/${m.id}`), { success: 'Perfil eliminado', invalidate: inv });
  return (
    <div className="flex items-center justify-end gap-1">
      {m.status === 'pending' && (
        <Button size="sm" onClick={() => nav(`/admin/integrantes/${m.id}`)}>
          Revisar
        </Button>
      )}
      {m.status === 'draft' && <InviteButton member={m} />}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label={`Más acciones para ${m.fullName}`}>
            <MoreHorizontal />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onSelect={() => nav(`/admin/integrantes/${m.id}`)}>
            <Pencil /> Editar
          </DropdownMenuItem>
          {m.photoUrl && (
            <DropdownMenuItem asChild>
              <a href={`/api/admin/members/${m.id}/photo`} download>
                <Download /> Descargar foto
              </a>
            </DropdownMenuItem>
          )}
          {m.status !== 'published' ? (
            <DropdownMenuItem disabled={!m.photoUrl} onSelect={() => status.mutate('published')}>
              <Eye /> {m.photoUrl ? 'Publicar' : 'Publicar (falta foto)'}
            </DropdownMenuItem>
          ) : (
            <DropdownMenuItem onSelect={() => status.mutate('hidden')}>
              <EyeOff /> Ocultar de la página
            </DropdownMenuItem>
          )}
          {m.status === 'published' && (
            <DropdownMenuItem asChild>
              <a href={`/integrantes/${m.slug}`} target="_blank" rel="noreferrer">
                <Eye /> Ver en la página
              </a>
            </DropdownMenuItem>
          )}
          {me.role === 'admin' && (
            <>
          <DropdownMenuSeparator />
          <Confirm
            title={`¿Eliminar a ${m.fullName}?`}
            description="Se borra su perfil, su foto y su participación en los proyectos. No se puede deshacer. Si solo quieres quitarlo de la página, ocúltalo."
            onConfirm={() => del.mutate(undefined)}
            trigger={
              <DropdownMenuItem variant="destructive" onSelect={(e) => e.preventDefault()}>
                <Trash2 /> Eliminar
              </DropdownMenuItem>
            }
          />
            </>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

export default function Members() {
  const { data, isLoading } = useAdminMembers();
  const [params, setParams] = useSearchParams();
  const tab = (params.get('estado') as Tab) || 'todos';
  const [q, setQ] = useState('');
  const counts = useMemo(() => {
    const c: Record<string, number> = { todos: data?.length ?? 0 };
    for (const m of data ?? []) c[m.status] = (c[m.status] ?? 0) + 1;
    return c;
  }, [data]);
  const withPhoto = (data ?? []).filter((m) => (tab === 'todos' || m.status === tab) && m.photoUrl).length;
  const rows = (data ?? []).filter((m) => (tab === 'todos' || m.status === tab) && (!q.trim() || m.fullName.toLowerCase().includes(q.trim().toLowerCase())));

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Integrantes"
        description="Revisa lo que envía cada persona, publícalo u ocúltalo. También puedes crear un perfil tú mismo."
        actions={
          <>
            <Button asChild variant="outline">
              <Link to="/admin/invitar">Invitar con link</Link>
            </Button>
            <Button asChild>
              <Link to="/admin/integrantes/nuevo">
                <Plus /> Crear perfil
              </Link>
            </Button>
          </>
        }
      />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Tabs value={tab} onValueChange={(v) => setParams(v === 'todos' ? {} : { estado: v })}>
          <TabsList>
            {TABS.map(([k, label]) => (
              <TabsTrigger key={k} value={k}>
                {label}
                <span className="text-xs opacity-70 tabular-nums">{counts[k] ?? 0}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          {withPhoto > 0 && (
            <Button asChild variant="outline" size="sm" className="h-10">
              <a href={`/api/admin/members/photos.zip${tab === 'todos' ? '' : `?estado=${tab}`}`} download title="Todas las fotos de esta pestaña en un .zip, en JPG">
                <Download /> Descargar fotos <span className="tabular-nums opacity-70">{withPhoto}</span>
              </a>
            </Button>
          )}
          <div className="relative w-full sm:w-64">
            <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-gris-2" />
            <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por nombre" className="h-10 pl-9" aria-label="Buscar por nombre" />
          </div>
        </div>
      </div>

      {isLoading ? (
        <Spinner />
      ) : !rows.length ? (
        <Empty title={q ? 'Nadie con ese nombre.' : 'No hay perfiles en este grupo.'}>
          {!data?.length && (
            <Button asChild>
              <Link to="/admin/invitar">Invitar a los integrantes</Link>
            </Button>
          )}
        </Empty>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-linea bg-white">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="pl-5">Persona</TableHead>
                <TableHead className="max-md:hidden">Proyectos</TableHead>
                <TableHead>Estado</TableHead>
                <TableHead className="max-lg:hidden">Último cambio</TableHead>
                <TableHead className="pr-5 text-right">
                  <span className="sr-only">Acciones</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="pl-5">
                    <Link to={`/admin/integrantes/${m.id}`} className="flex items-center gap-3 text-black no-underline hover:text-black">
                      <Portrait name={m.fullName} url={m.photoUrl} bg={m.kind === 'docente' ? '#000' : '#1B4B9B'} className="size-11 shrink-0 rounded-full" textClass="text-sm not-italic" />
                      <span className="flex min-w-0 flex-col">
                        <span className="flex items-center gap-1.5 font-semibold">
                          {m.fullName}
                          {m.featured && <Star className="size-3.5 fill-rojo text-rojo" aria-label="Destacada" />}
                        </span>
                        <span className="text-xs text-gris-2">{m.roleTitle}</span>
                      </span>
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm text-gris max-md:hidden">{m.projects.map((p) => p.name).join(', ') || '—'}</TableCell>
                  <TableCell>
                    <StatusBadge status={m.status} />
                  </TableCell>
                  <TableCell className="text-sm text-gris-2 max-lg:hidden">{fmtRelative(m.updatedAt)}</TableCell>
                  <TableCell className="pr-5">
                    <RowActions m={m} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
