import { useQueryClient } from '@tanstack/react-query';
import { Loader2, Plus, Trash2, Upload } from 'lucide-react';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { TechLogo } from '@/components/site/bits';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, errorText } from '@/lib/api';
import type { Tech } from '@/lib/types';
import { groupBy } from '@/lib/utils';
import { useTechnologies } from './shared';
import { Confirm, PageHeader, Panel, Spinner } from './ui';

function LogoButton({ tech, onSaved }: { tech: Tech; onSaved: (list: Tech[]) => void }) {
  const ref = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  return (
    <>
      <input
        ref={ref}
        type="file"
        accept="image/svg+xml,image/png,image/webp"
        className="sr-only"
        tabIndex={-1}
        onChange={async (e) => {
          const f = e.target.files?.[0];
          e.target.value = '';
          if (!f) return;
          setBusy(true);
          try {
            const fd = new FormData();
            fd.append('file', f);
            fd.append('name', tech.name);
            fd.append('category', tech.category);
            onSaved(await api.put<Tech[]>(`/admin/technologies/${tech.id}`, fd));
            toast.success(`Logo de ${tech.name} actualizado`);
          } catch (err) {
            toast.error(errorText(err));
          } finally {
            setBusy(false);
          }
        }}
      />
      <Button variant="ghost" size="icon-sm" aria-label={`Cambiar logo de ${tech.name}`} onClick={() => ref.current?.click()} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : <Upload />}
      </Button>
    </>
  );
}

export default function Technologies() {
  const qc = useQueryClient();
  const { data, isLoading } = useTechnologies();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const put = (list: Tech[]) => {
    qc.setQueryData(['admin', 'technologies'], list);
    qc.invalidateQueries({ queryKey: ['site'] });
  };
  const categories = [...new Set((data ?? []).map((t) => t.category))];

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const fd = new FormData();
      fd.append('name', name.trim());
      fd.append('category', category.trim() || 'Herramientas');
      if (file) fd.append('file', file);
      put(await api.post<Tech[]>('/admin/technologies', fd));
      toast.success(`${name.trim()} agregada`);
      setName('');
      setFile(null);
    } catch (err) {
      toast.error(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  if (isLoading || !data) return <Spinner />;
  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Tecnologías" description="La lista que eligen los integrantes en su perfil y que se usa en los proyectos. El logo puede ser SVG (recomendado) o PNG cuadrado." />
      <Panel title="Agregar">
        <form onSubmit={add} className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto_auto]">
          <div className="flex flex-col gap-2">
            <Label htmlFor="tn">Nombre</Label>
            <Input id="tn" value={name} onChange={(e) => setName(e.target.value)} placeholder="Figma" required />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="tc">Grupo</Label>
            <Input id="tc" value={category} onChange={(e) => setCategory(e.target.value)} placeholder="Herramientas" list="cats" />
            <datalist id="cats">
              {categories.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
          </div>
          <div>
            <input ref={fileRef} type="file" accept="image/svg+xml,image/png,image/webp" className="sr-only" tabIndex={-1} onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
            <Button type="button" variant="outline" onClick={() => fileRef.current?.click()} className="max-w-52">
              <Upload /> <span className="truncate">{file ? file.name : 'Logo (opcional)'}</span>
            </Button>
          </div>
          <Button type="submit" disabled={busy || !name.trim()}>
            {busy ? <Loader2 className="animate-spin" /> : <Plus />}
            Agregar
          </Button>
        </form>
        <p className="text-xs text-gris-2">
          Logos de marcas en SVG:{' '}
          <a href="https://simpleicons.org" target="_blank" rel="noreferrer" className="font-semibold text-marino">
            simpleicons.org
          </a>
          . Sin logo se muestran sus iniciales.
        </p>
      </Panel>

      {groupBy(data, (t) => t.category).map((g) => (
        <Panel key={g.key} title={g.key} description={`${g.items.length} ${g.items.length === 1 ? 'tecnología' : 'tecnologías'}`}>
          <ul className="m-0 grid list-none gap-2 p-0 sm:grid-cols-2 lg:grid-cols-3">
            {g.items.map((t) => (
              <li key={t.id} className="flex items-center gap-3 rounded-xl border border-linea py-2 pr-2 pl-3">
                <TechLogo tech={t} size={26} />
                <span className="flex-1 truncate font-semibold">{t.name}</span>
                <LogoButton tech={t} onSaved={put} />
                <Confirm
                  title={`¿Quitar ${t.name}?`}
                  description="Desaparece de los perfiles y proyectos que la usan."
                  action="Quitar"
                  onConfirm={async () => {
                    try {
                      put(await api.del<Tech[]>(`/admin/technologies/${t.id}`));
                    } catch (e) {
                      toast.error(errorText(e));
                    }
                  }}
                  trigger={
                    <Button variant="ghost" size="icon-sm" aria-label={`Quitar ${t.name}`} className="text-rojo-texto">
                      <Trash2 />
                    </Button>
                  }
                />
              </li>
            ))}
          </ul>
        </Panel>
      ))}
    </div>
  );
}
