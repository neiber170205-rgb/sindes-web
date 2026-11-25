import { useQuery } from '@tanstack/react-query';
import { Link2, Loader2, MessageCircle, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useOutletContext } from 'react-router';
import { Field } from '@/components/forms';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import type { SessionUser } from '@/lib/types';
import { Confirm, CopyButton, fmtDate, fmtRelative, PageHeader, Panel, useAction } from './ui';

function Password() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [again, setAgain] = useState('');
  const change = useAction(() => api.post('/auth/password', { current, next }), {
    success: 'Contraseña cambiada',
    onSuccess: () => {
      setCurrent('');
      setNext('');
      setAgain('');
    },
  });
  const mismatch = again.length > 0 && next !== again;
  return (
    <Panel title="Cambiar contraseña" description="Mínimo 10 caracteres. Una frase corta funciona bien.">
      <form
        className="grid max-w-md gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          change.mutate(undefined);
        }}
      >
        <Field label="Contraseña actual" htmlFor="cur">
          <Input id="cur" type="password" autoComplete="current-password" value={current} onChange={(e) => setCurrent(e.target.value)} required />
        </Field>
        <Field label="Nueva contraseña" htmlFor="new">
          <Input id="new" type="password" autoComplete="new-password" minLength={10} value={next} onChange={(e) => setNext(e.target.value)} required />
        </Field>
        <Field label="Repítela" htmlFor="again" hint={mismatch ? <span className="text-rojo-texto">No coinciden.</span> : undefined}>
          <Input id="again" type="password" autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} required aria-invalid={mismatch} />
        </Field>
        <Button type="submit" className="self-start" disabled={change.isPending || mismatch || next.length < 10}>
          {change.isPending && <Loader2 className="animate-spin" />}
          Cambiar contraseña
        </Button>
      </form>
    </Panel>
  );
}

type AdminUser = {
  id: number;
  email: string;
  name: string;
  role: 'admin' | 'editor';
  lastLoginAt: string | null;
  accessPending: boolean;
  accessExpiresAt: string | null;
};
type AccessLink = { link: string; expiresAt: string };

export const ROLE_TEXT = { admin: 'Administración', editor: 'Edición' } as const;

function accessMessage(name: string, link: string) {
  return `Hola ${name.split(' ')[0]}, te di acceso al panel de la página de SINDES. Entra a este link y elige tu contraseña: ${link}\nVale por 7 días y sirve una sola vez.`;
}

/** Muestra el link de acceso recién creado para copiarlo o mandarlo por WhatsApp. */
function AccessDialog({ data, onClose }: { data: { name: string; link: AccessLink } | null; onClose: () => void }) {
  return (
    <Dialog open={!!data} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Link de acceso para {data?.name.split(' ')[0]}</DialogTitle>
          <DialogDescription>
            Con este link elige su contraseña y entra. Sirve una vez y vence el {fmtDate(data?.link.expiresAt)}. Cópialo ahora: por seguridad no se vuelve a mostrar.
          </DialogDescription>
        </DialogHeader>
        <Input readOnly value={data?.link.link ?? ''} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
        <DialogFooter className="flex-wrap">
          <Button asChild variant="ghost" size="sm">
            <a href={`https://wa.me/?text=${encodeURIComponent(accessMessage(data?.name ?? '', data?.link.link ?? ''))}`} target="_blank" rel="noreferrer">
              <MessageCircle /> WhatsApp
            </a>
          </Button>
          <CopyButton text={accessMessage(data?.name ?? '', data?.link.link ?? '')} label="Copiar mensaje" copied="Mensaje copiado" />
          <CopyButton text={data?.link.link ?? ''} label="Copiar link" variant="default" />
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function UserStatus({ u }: { u: AdminUser }) {
  if (u.accessPending && !u.lastLoginAt) return <span className="text-[#7A4B00]">Falta que active su cuenta · el link vence el {fmtDate(u.accessExpiresAt)}</span>;
  if (!u.lastLoginAt) return <span className="text-rojo-texto">Nunca ha entrado · genérale un link</span>;
  return (
    <span>
      Último ingreso {fmtRelative(u.lastLoginAt)}
      {u.accessPending && ` · tiene un link de acceso hasta el ${fmtDate(u.accessExpiresAt)}`}
    </span>
  );
}

function Users({ me }: { me: SessionUser }) {
  const q = useQuery({ queryKey: ['admin', 'users'], queryFn: () => api.get<AdminUser[]>('/auth/users') });
  const [form, setForm] = useState({ name: '', email: '', role: 'editor' as 'admin' | 'editor' });
  const [shown, setShown] = useState<{ name: string; link: AccessLink } | null>(null);
  const inv = [['admin', 'users']];
  const add = useAction(() => api.post<{ user: AdminUser } & AccessLink>('/auth/users', form), {
    success: 'Cuenta creada',
    invalidate: inv,
    onSuccess: (r) => {
      setShown({ name: r.user.name, link: { link: r.link, expiresAt: r.expiresAt } });
      setForm({ name: '', email: '', role: 'editor' });
    },
  });
  const access = useAction((u: AdminUser) => api.post<AccessLink>(`/auth/users/${u.id}/access`).then((link) => ({ u, link })), {
    invalidate: inv,
    onSuccess: ({ u, link }) => setShown({ name: u.name, link }),
  });
  const role = useAction((v: { id: number; role: 'admin' | 'editor' }) => api.patch(`/auth/users/${v.id}`, { role: v.role }), { success: 'Permisos cambiados', invalidate: inv });
  const del = useAction((id: number) => api.del(`/auth/users/${id}`), { success: 'Cuenta eliminada', invalidate: inv });

  return (
    <Panel title="Cuentas del panel" description="Para docentes y estudiantes que ayudan con la página. Nadie escribe la contraseña de otro: cada persona elige la suya con su link de acceso.">
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-black p-4 text-white">
          <p className="font-bold">Administración</p>
          <p className="text-sm text-white/75">Todo, incluido crear cuentas, cambiar permisos y eliminar perfiles, proyectos o tecnologías.</p>
        </div>
        <div className="rounded-xl bg-hielo p-4">
          <p className="font-bold">Edición</p>
          <p className="text-sm text-gris">Invitar, revisar y publicar integrantes; editar proyectos, textos, fotos y tecnologías. No elimina ni maneja cuentas.</p>
        </div>
      </div>

      <ul className="m-0 flex list-none flex-col p-0">
        {(q.data ?? []).map((u, k) => {
          const self = u.id === me.id;
          return (
            <li key={u.id} className={`flex flex-wrap items-center gap-3 py-3.5 ${k ? 'border-t border-linea' : ''}`}>
              <span className={`flex size-10 shrink-0 items-center justify-center rounded-full font-bold ${u.role === 'admin' ? 'bg-black text-white' : 'bg-azul text-black'}`}>{u.name.charAt(0).toUpperCase()}</span>
              <span className="flex min-w-48 flex-1 flex-col">
                <span className="font-semibold">
                  {u.name} {self && <span className="text-sm font-normal text-gris-2">(tú)</span>}
                </span>
                <span className="truncate text-sm text-gris-2">{u.email}</span>
                <span className="text-xs text-gris-2">
                  <UserStatus u={u} />
                </span>
              </span>
              <div className="flex items-center gap-1.5">
                {self ? (
                  <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>{ROLE_TEXT[u.role]}</Badge>
                ) : (
                  <Select value={u.role} onValueChange={(v) => role.mutate({ id: u.id, role: v as 'admin' | 'editor' })}>
                    <SelectTrigger aria-label={`Permisos de ${u.name}`} className="h-9 w-40 text-sm">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="editor">Edición</SelectItem>
                      <SelectItem value="admin">Administración</SelectItem>
                    </SelectContent>
                  </Select>
                )}
                {!self && (
                  <Button variant="outline" size="sm" onClick={() => access.mutate(u)} disabled={access.isPending}>
                    <Link2 /> Link de acceso
                  </Button>
                )}
                {!self && (
                  <Confirm
                    title={`¿Quitar la cuenta de ${u.name}?`}
                    description="Ya no podrá entrar al panel. Su perfil en la página, si tiene, no se toca."
                    action="Quitar"
                    onConfirm={() => del.mutate(u.id)}
                    trigger={
                      <Button variant="ghost" size="icon-sm" aria-label={`Quitar a ${u.name}`} className="text-rojo-texto">
                        <Trash2 />
                      </Button>
                    }
                  />
                )}
              </div>
            </li>
          );
        })}
      </ul>

      <form
        className="grid gap-4 rounded-xl border border-dashed border-input p-4 sm:grid-cols-[1fr_1fr_180px]"
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate(undefined);
        }}
      >
        <div className="flex flex-col gap-1 sm:col-span-3">
          <p className="font-semibold">Dar acceso a alguien</p>
          <p className="text-sm text-gris-2">Se crea la cuenta y te damos un link para mandarle. Con ese link elige su contraseña.</p>
        </div>
        <Field label="Nombre" htmlFor="un">
          <Input id="un" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Jenny Zabaleta" />
        </Field>
        <Field label="Correo con el que entrará" htmlFor="ue">
          <Input id="ue" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="nombre@fesc.edu.co" />
        </Field>
        <Field label="Permisos">
          <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as 'admin' | 'editor' })}>
            <SelectTrigger aria-label="Permisos">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="editor">Edición</SelectItem>
              <SelectItem value="admin">Administración</SelectItem>
            </SelectContent>
          </Select>
        </Field>
        <Button type="submit" className="self-start sm:col-span-3 sm:justify-self-start" disabled={add.isPending || form.name.trim().length < 2 || !form.email.includes('@')}>
          {add.isPending ? <Loader2 className="animate-spin" /> : <UserPlus />}
          Crear cuenta y link
        </Button>
      </form>
      <AccessDialog data={shown} onClose={() => setShown(null)} />
    </Panel>
  );
}

export default function Account() {
  const me = useOutletContext<SessionUser>();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title={me.role === 'admin' ? 'Cuentas y acceso' : 'Mi cuenta'} description={`${me.name} · ${me.email}`} />
      {me.role === 'admin' && <Users me={me} />}
      <Password />
    </div>
  );
}
