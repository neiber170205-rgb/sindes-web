import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { CountedTextarea, Field, RowsEditor } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, errorText } from '@/lib/api';
import type { SiteContent } from '@/lib/types';
import { PageHeader, Panel, Spinner } from './ui';

const FOCUS_NAMES = { innovacion: 'Innovación', optimizacion: 'Optimización', automatizacion: 'Automatización', ia: 'Implementación de IA' } as const;

/** Lista de palabras separadas por coma ↔ arreglo */
function WordsInput({ id, value, onChange, placeholder }: { id: string; value: string[]; onChange: (v: string[]) => void; placeholder?: string }) {
  const [text, setText] = useState(value.join(', '));
  useEffect(() => setText(value.join(', ')), [value]);
  return (
    <Input
      id={id}
      value={text}
      placeholder={placeholder}
      onChange={(e) => setText(e.target.value)}
      onBlur={() =>
        onChange(
          text
            .split(',')
            .map((w) => w.trim())
            .filter(Boolean),
        )
      }
    />
  );
}

export default function Content() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'content'], queryFn: () => api.get<SiteContent>('/admin/content') });
  const [c, setC] = useState<SiteContent | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  useEffect(() => {
    if (q.data && !dirty) setC(q.data);
  }, [q.data, dirty]);
  if (!c) return <Spinner />;

  function upd<K extends keyof SiteContent>(k: K, patch: Partial<SiteContent[K]>) {
    setC((prev) => (prev ? { ...prev, [k]: Array.isArray(prev[k]) ? patch : { ...(prev[k] as object), ...patch } } : prev));
    setDirty(true);
  }

  const save = async () => {
    setSaving(true);
    try {
      const r = await api.put<SiteContent>('/admin/content', c);
      qc.setQueryData(['admin', 'content'], r);
      qc.invalidateQueries({ queryKey: ['site'] });
      setDirty(false);
      toast.success('Textos guardados. Ya se ven en la página.');
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="flex flex-col gap-6 pb-24">
      <PageHeader title="Textos de la página" description="Lo que dice el inicio del sitio, sección por sección. Un campo vacío oculta ese bloque (por ejemplo, misión o requisitos)." />

      <Panel title="Inicio" description="El bloque azul con el que abre la página.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Primera línea" htmlFor="l1">
            <Input id="l1" value={c.hero.line1} onChange={(e) => upd('hero', { line1: e.target.value })} />
          </Field>
          <Field label="Segunda línea" htmlFor="l2">
            <Input id="l2" value={c.hero.line2} onChange={(e) => upd('hero', { line2: e.target.value })} />
          </Field>
          <Field label="Palabras que rotan en la píldora" htmlFor="rw" className="sm:col-span-2" hint="Separadas por coma. Ej.: software., prototipos., soluciones.">
            <WordsInput id="rw" value={c.hero.rotatingWords} onChange={(rotatingWords) => upd('hero', { rotatingWords })} />
          </Field>
          <Field label="Presentación" htmlFor="intro" className="sm:col-span-2">
            <CountedTextarea id="intro" value={c.hero.intro} onChange={(intro) => upd('hero', { intro })} max={400} rows={3} />
          </Field>
        </div>
      </Panel>

      <Panel title="Cintas" description="Las dos franjas inclinadas que se mueven bajo el inicio.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Cinta negra" htmlFor="t1" hint="Separadas por coma.">
            <WordsInput id="t1" value={c.tapes.top} onChange={(top) => upd('tapes', { top })} />
          </Field>
          <Field label="Cinta roja" htmlFor="t2" hint="Separadas por coma.">
            <WordsInput id="t2" value={c.tapes.bottom} onChange={(bottom) => upd('tapes', { bottom })} />
          </Field>
        </div>
      </Panel>

      <Panel title="El semillero">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Título" htmlFor="st" className="sm:col-span-2">
            <Input id="st" value={c.semillero.title} onChange={(e) => upd('semillero', { title: e.target.value })} />
          </Field>
          <Field label="Texto" htmlFor="sb" className="sm:col-span-2">
            <CountedTextarea id="sb" value={c.semillero.body} onChange={(body) => upd('semillero', { body })} max={1200} rows={4} />
          </Field>
          <Field label="Misión" htmlFor="mi">
            <CountedTextarea id="mi" value={c.semillero.mission} onChange={(mission) => upd('semillero', { mission })} max={600} rows={3} placeholder="Vacío: no se muestra" />
          </Field>
          <Field label="Visión" htmlFor="vi">
            <CountedTextarea id="vi" value={c.semillero.vision} onChange={(vision) => upd('semillero', { vision })} max={600} rows={3} placeholder="Vacío: no se muestra" />
          </Field>
        </div>
        <Field label="«Así crece un proyecto aquí»" hint="Los pasos, en orden. El último sale en rojo.">
          <RowsEditor rows={c.steps} onChange={(steps) => upd('steps', steps)} columns={[{ key: 'title', label: 'Paso', width: '0.6fr' }, { key: 'body', label: 'Explicación' }]} blank={{ title: '', body: '' }} empty="Sin pasos." addLabel="Agregar paso" max={6} />
        </Field>
      </Panel>

      <Panel title="Línea de investigación y enfoques">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Texto pequeño" htmlFor="lk">
            <Input id="lk" value={c.line.kicker} onChange={(e) => upd('line', { kicker: e.target.value })} />
          </Field>
          <Field label="Texto bajo el título" htmlFor="li">
            <Input id="li" value={c.line.intro} onChange={(e) => upd('line', { intro: e.target.value })} />
          </Field>
          <Field label="Nombre de la línea" htmlFor="lt" className="sm:col-span-2">
            <Input id="lt" value={c.line.title} onChange={(e) => upd('line', { title: e.target.value })} />
          </Field>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          {c.focuses.map((f, i) => (
            <div key={f.key} className="flex flex-col gap-3 rounded-xl border border-linea p-4">
              <span className="text-xs font-bold text-gris-2">Ilustración: {FOCUS_NAMES[f.key]}</span>
              <Input aria-label="Título" value={f.title} onChange={(e) => upd('focuses', c.focuses.map((x, k) => (k === i ? { ...x, title: e.target.value } : x)))} />
              <CountedTextarea aria-label="Descripción" value={f.body} onChange={(body) => upd('focuses', c.focuses.map((x, k) => (k === i ? { ...x, body } : x)))} max={300} rows={2} />
            </div>
          ))}
        </div>
      </Panel>

      <Panel title="Únete" description="La tarjeta roja con la reunión semanal.">
        <div className="grid gap-5 sm:grid-cols-2">
          <Field label="Título" htmlFor="jt" className="sm:col-span-2">
            <Input id="jt" value={c.join.title} onChange={(e) => upd('join', { title: e.target.value })} />
          </Field>
          <Field label="Requisitos para entrar" htmlFor="rq" className="sm:col-span-2">
            <CountedTextarea id="rq" value={c.meeting.requirements} onChange={(requirements) => upd('meeting', { requirements })} max={400} rows={2} placeholder="Vacío: no se muestra" />
          </Field>
          <Field label="Día" htmlFor="md">
            <Input id="md" value={c.meeting.day} onChange={(e) => upd('meeting', { day: e.target.value })} placeholder="Miércoles" />
          </Field>
          <Field label="Hora" htmlFor="mt">
            <Input id="mt" value={c.meeting.time} onChange={(e) => upd('meeting', { time: e.target.value })} placeholder="2:00 a 4:00 p. m." />
          </Field>
          <Field label="Salón" htmlFor="mr">
            <Input id="mr" value={c.meeting.room} onChange={(e) => upd('meeting', { room: e.target.value })} />
          </Field>
          <Field label="Lugar" htmlFor="mp">
            <Input id="mp" value={c.meeting.place} onChange={(e) => upd('meeting', { place: e.target.value })} />
          </Field>
          <Field label="Link del botón «Quiero unirme»" htmlFor="ju" className="sm:col-span-2" hint="Un formulario o un correo (mailto:…). Vacío: el botón no aparece.">
            <Input id="ju" value={c.meeting.joinUrl} onChange={(e) => upd('meeting', { joinUrl: e.target.value })} placeholder="https://forms.gle/…" />
          </Field>
        </div>
      </Panel>

      <Panel title="Pie de página">
        <Field label="Texto junto al ©" htmlFor="ft" hint="El año se pone solo.">
          <Input id="ft" value={c.footer.text} onChange={(e) => upd('footer', { text: e.target.value })} />
        </Field>
      </Panel>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-linea bg-white/95 backdrop-blur lg:left-[264px]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <span className="text-sm text-gris-2" aria-live="polite">
            {dirty ? 'Tienes cambios sin guardar' : 'Todo guardado'}
          </span>
          <Button onClick={save} disabled={saving || !dirty}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            Guardar textos
          </Button>
        </div>
      </div>
    </div>
  );
}
