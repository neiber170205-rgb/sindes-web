import { useQuery } from '@tanstack/react-query';
import { Link2, Loader2, MessageCircle } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { api } from '@/lib/api';
import { groupText, whatsappText } from './shared';
import { Confirm, CopyButton, fmtDate, PageHeader, Panel, Spinner, useAction } from './ui';

type Invite = { id: number; fullName: string; link: string };
type OpenLink = { active: boolean; link: string | null; expiresAt: string | null };

function DaysInput({ id, value, onChange }: { id: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-col gap-2">
      <Label htmlFor={id}>El link vale por</Label>
      <div className="flex items-center gap-2">
        <Input id={id} type="number" min={1} max={90} value={value} onChange={(e) => onChange(e.target.value)} className="w-24" />
        <span className="text-sm text-gris-2">días</span>
      </div>
    </div>
  );
}

/** Un solo link para todo el grupo: cada quien escribe su nombre y arma su perfil. */
function OpenLinkPanel() {
  const q = useQuery({ queryKey: ['admin', 'open-link'], queryFn: () => api.get<OpenLink>('/admin/open-link') });
  const [days, setDays] = useState('14');
  const key = [['admin', 'open-link']];
  const create = useAction(() => api.post<OpenLink>('/admin/open-link', { days: Number(days) || 14 }), { success: 'Link general listo', invalidate: key });
  const disable = useAction(() => api.del<OpenLink>('/admin/open-link'), { success: 'Link general desactivado', invalidate: key });
  const s = q.data;

  return (
    <Panel
      title="Link general"
      description="Uno solo para todo el grupo. Cada persona escribe su nombre y su correo @fesc.edu.co y arma su perfil; te llega a «Por revisar» como siempre y nada se publica sin que lo apruebes."
    >
      {q.isLoading ? (
        <Spinner />
      ) : s?.active && s.link ? (
        <div className="flex flex-col gap-3">
          <Input readOnly value={s.link} onFocus={(e) => e.currentTarget.select()} className="h-9 font-mono text-xs" aria-label="Link general" />
          <p className="text-sm text-gris-2">Vale hasta el {fmtDate(s.expiresAt)}.</p>
          <div className="flex flex-wrap gap-2">
            <CopyButton text={s.link} label="Copiar link" />
            <CopyButton text={groupText(s.link)} label="Copiar mensaje" copied="Mensaje copiado" />
            <Button asChild size="sm" variant="ghost">
              <a href={`https://wa.me/?text=${encodeURIComponent(groupText(s.link))}`} target="_blank" rel="noreferrer">
                <MessageCircle /> WhatsApp
              </a>
            </Button>
            <Confirm
              trigger={
                <Button size="sm" variant="ghost">
                  Cambiar link
                </Button>
              }
              title="¿Cambiar el link general?"
              description={`El link actual deja de servir y el nuevo vale ${Number(days) || 14} días. Quienes ya empezaron siguen con su link personal.`}
              action="Cambiar"
              onConfirm={() => create.mutate(undefined)}
            />
            <Confirm
              trigger={
                <Button size="sm" variant="ghost">
                  Desactivar
                </Button>
              }
              title="¿Desactivar el link general?"
              description="Nadie más podrá empezar un perfil con él. Quienes ya empezaron siguen con su link personal."
              action="Desactivar"
              onConfirm={() => disable.mutate(undefined)}
            />
          </div>
        </div>
      ) : (
        <form
          className="flex flex-wrap items-end gap-4"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate(undefined);
          }}
        >
          {s?.link && <p className="w-full text-sm text-gris-2">El link anterior venció el {fmtDate(s.expiresAt)}.</p>}
          <DaysInput id="open-days" value={days} onChange={setDays} />
          <Button type="submit" disabled={create.isPending}>
            {create.isPending ? <Loader2 className="animate-spin" /> : <Link2 />}
            Crear link general
          </Button>
        </form>
      )}
    </Panel>
  );
}

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
        description="Comparte el link general en el grupo, o crea un link solo para cada persona escribiendo su nombre. En los dos casos tú revisas antes de publicar."
      />
      <OpenLinkPanel />
      <h2 className="mt-2 text-lg font-bold">O un link para cada persona</h2>
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
            <DaysInput id="days" value={days} onChange={setDays} />
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
