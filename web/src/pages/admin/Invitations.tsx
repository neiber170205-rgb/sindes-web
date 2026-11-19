import { Loader2, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { whatsappText } from './shared';
import { CopyButton, PageHeader, Panel, useAction } from './ui';

type Invite = { id: number; fullName: string; link: string };

export default function Invitations() {
  const [names, setNames] = useState('');
  const [days, setDays] = useState('21');
  const [made, setMade] = useState<Invite[]>([]);
  const list = names
    .split('\n')
    .map((n) => n.trim().replace(/\s+/g, ' '))
    .filter((n) => n.length >= 3);
  const create = useAction((body: { names: string[]; days: number }) => api.post<Invite[]>('/admin/members/invitations', body), {
    success: (r) => `${r.length} ${r.length === 1 ? 'link creado' : 'links creados'}`,
    invalidate: [['admin', 'members'], ['admin', 'summary']],
    onSuccess: (r) => {
      setMade((m) => [...r, ...m]);
      setNames('');
    },
  });
  const all = made.map((i) => `${i.fullName}: ${i.link}`).join('\n');

  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Invitar integrantes"
        description="Escribe un nombre por línea. Cada persona recibe un link solo suyo para llenar su perfil y subir su foto. Tú revisas antes de publicar."
      />
      <div className="grid items-start gap-6 lg:grid-cols-[1fr_1.1fr]">
        <Panel title="1. Nombres">
          <form
            className="flex flex-col gap-4"
            onSubmit={(e) => {
              e.preventDefault();
              create.mutate({ names: list, days: Number(days) || 21 });
            }}
          >
            <div className="flex flex-col gap-2">
              <Label htmlFor="names">Un nombre por línea</Label>
              <Textarea id="names" rows={10} value={names} onChange={(e) => setNames(e.target.value)} placeholder={'Valery Alarcón\nJuan Pérez Gómez\nMaría Fernanda López'} className="font-medium" />
              <span className="text-xs text-gris-2">{list.length} {list.length === 1 ? 'persona' : 'personas'}</span>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="days">El link vale por</Label>
              <div className="flex items-center gap-2">
                <Input id="days" type="number" min={1} max={90} value={days} onChange={(e) => setDays(e.target.value)} className="w-24" />
                <span className="text-sm text-gris-2">días</span>
              </div>
            </div>
            <Button type="submit" disabled={!list.length || create.isPending} className="self-start">
              {create.isPending && <Loader2 className="animate-spin" />}
              Crear {list.length > 1 ? `${list.length} links` : 'link'}
            </Button>
          </form>
        </Panel>

        <Panel
          title="2. Envía cada link"
          description="Cópialos ahora: por seguridad no se guardan. Si alguien pierde el suyo, genera uno nuevo desde Integrantes."
          actions={made.length > 1 ? <CopyButton text={all} label="Copiar todos" /> : undefined}
        >
          {!made.length ? (
            <p className="rounded-xl border border-dashed border-input px-4 py-10 text-center text-sm text-gris-2">Aquí aparecen los links cuando los crees.</p>
          ) : (
            <ul className="m-0 flex list-none flex-col gap-3 p-0">
              {made.map((i) => (
                <li key={i.id} className="flex flex-col gap-2.5 rounded-xl border border-linea p-3.5">
                  <span className="font-semibold">{i.fullName}</span>
                  <Input readOnly value={i.link} onFocus={(e) => e.currentTarget.select()} className="h-9 font-mono text-xs" />
                  <div className="flex flex-wrap gap-2">
                    <CopyButton text={i.link} label="Copiar link" />
                    <CopyButton text={whatsappText(i.fullName, i.link)} label="Copiar mensaje" copied="Mensaje copiado" />
                    <Button asChild size="sm" variant="ghost">
                      <a href={`https://wa.me/?text=${encodeURIComponent(whatsappText(i.fullName, i.link))}`} target="_blank" rel="noreferrer">
                        <MessageCircle /> WhatsApp
                      </a>
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  );
}
