import { useQuery } from '@tanstack/react-query';
import { Loader2, Trash2, UserPlus } from 'lucide-react';
import { useState } from 'react';
import { useOutletContext } from 'react-router';
import { Field } from '@/components/forms';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api } from '@/lib/api';
import type { SessionUser } from '@/lib/types';
import { Confirm, PageHeader, Panel, useAction } from './ui';

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

type AdminUser = { id: number; email: string; name: string; role: 'admin' | 'editor' };

function Users({ me }: { me: SessionUser }) {
  const q = useQuery({ queryKey: ['admin', 'users'], queryFn: () => api.get<AdminUser[]>('/auth/users') });
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'editor' as 'admin' | 'editor' });
  const add = useAction(() => api.post('/auth/users', form), {
    success: 'Cuenta creada. Pásale la contraseña en persona.',
    invalidate: [['admin', 'users']],
    onSuccess: () => setForm({ name: '', email: '', password: '', role: 'editor' }),
  });
  const del = useAction((id: number) => api.del(`/auth/users/${id}`), { success: 'Cuenta eliminada', invalidate: [['admin', 'users']] });

  return (
    <Panel title="Cuentas del panel" description="Administración puede todo. Edición puede cambiar contenido e integrantes, pero no crear cuentas.">
      <ul className="m-0 flex list-none flex-col p-0">
        {(q.data ?? []).map((u, k) => (
          <li key={u.id} className={`flex items-center gap-3 py-3 ${k ? 'border-t border-linea' : ''}`}>
            <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-azul font-bold">{u.name.charAt(0)}</span>
            <span className="flex min-w-0 flex-1 flex-col">
              <span className="font-semibold">
                {u.name} {u.id === me.id && <span className="text-sm font-normal text-gris-2">(tú)</span>}
              </span>
              <span className="truncate text-sm text-gris-2">{u.email}</span>
            </span>
            <Badge variant={u.role === 'admin' ? 'default' : 'secondary'}>{u.role === 'admin' ? 'Administración' : 'Edición'}</Badge>
            {u.id !== me.id && (
              <Confirm
                title={`¿Quitar la cuenta de ${u.name}?`}
                description="Ya no podrá entrar al panel."
                action="Quitar"
                onConfirm={() => del.mutate(u.id)}
                trigger={
                  <Button variant="ghost" size="icon-sm" aria-label={`Quitar a ${u.name}`} className="text-rojo-texto">
                    <Trash2 />
                  </Button>
                }
              />
            )}
          </li>
        ))}
      </ul>
      <form
        className="grid gap-4 rounded-xl border border-dashed border-input p-4 sm:grid-cols-2"
        onSubmit={(e) => {
          e.preventDefault();
          add.mutate(undefined);
        }}
      >
        <p className="font-semibold sm:col-span-2">Nueva cuenta</p>
        <Field label="Nombre" htmlFor="un">
          <Input id="un" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required placeholder="Jenny Zabaleta" />
        </Field>
        <Field label="Correo" htmlFor="ue">
          <Input id="ue" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} required placeholder="nombre@fesc.edu.co" />
        </Field>
        <Field label="Contraseña inicial" htmlFor="up" hint="Que la cambie al entrar.">
          <Input id="up" type="text" minLength={10} value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} required autoComplete="off" />
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
        <Button type="submit" className="self-start sm:col-span-2 sm:justify-self-start" disabled={add.isPending}>
          {add.isPending ? <Loader2 className="animate-spin" /> : <UserPlus />}
          Crear cuenta
        </Button>
      </form>
    </Panel>
  );
}

export default function Account() {
  const me = useOutletContext<SessionUser>();
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Mi cuenta" description={`${me.name} · ${me.email}`} />
      <Password />
      {me.role === 'admin' && <Users me={me} />}
    </div>
  );
}
