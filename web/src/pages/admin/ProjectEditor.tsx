import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowDown, ArrowLeft, ArrowUp, ImagePlus, Loader2, Save, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { CountedTextarea, Field, RowsEditor, TechPicker } from '@/components/forms';
import { TechLogo } from '@/components/site/bits';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api, errorText } from '@/lib/api';
import type { Fact, Feature, Img, Layer, Milestone, Project, ProjectStatus, Stat } from '@/lib/types';
import { ProjectVideoPanel } from './ProjectVideo';
import { useAdminMembers, useTechnologies } from './shared';
import { Confirm, PageHeader, Panel, Spinner, StatusBadge, useAction } from './ui';

type Form = {
  name: string;
  slug: string;
  subtitle: string;
  summary: string;
  tag: string;
  intro: string;
  problem: string;
  solution: string;
  status: ProjectStatus;
  statusLabel: string;
  focus: string;
  demoUrl: string;
  published: boolean;
  sortOrder: string;
  featuresTitle: string;
  features: Feature[];
  layers: Layer[];
  stats: Stat[];
  milestones: Milestone[];
  facts: Fact[];
  documents: { value: string }[];
  extraTitle: string;
  extraBody: string;
  technologies: { technologyId: number; category: string }[];
  team: { memberId: number; role: string }[];
};

const EMPTY: Form = {
  name: '',
  slug: '',
  subtitle: '',
  summary: '',
  tag: '',
  intro: '',
  problem: '',
  solution: '',
  status: 'en_desarrollo',
  statusLabel: '',
  focus: '',
  demoUrl: '',
  published: false,
  sortOrder: '100',
  featuresTitle: 'Lo que hace',
  features: [],
  layers: [],
  stats: [],
  milestones: [],
  facts: [],
  documents: [],
  extraTitle: '',
  extraBody: '',
  technologies: [],
  team: [],
};

function fromProject(p: Project): Form {
  return {
    name: p.name,
    slug: p.slug,
    subtitle: p.subtitle ?? '',
    summary: p.summary ?? '',
    tag: p.tag ?? '',
    intro: p.intro ?? '',
    problem: p.problem ?? '',
    solution: p.solution ?? '',
    status: p.status,
    statusLabel: p.statusLabel === { en_desarrollo: 'En desarrollo', prototipo: 'Prototipo', finalizado: 'Finalizado' }[p.status] ? '' : p.statusLabel,
    focus: p.focus ?? '',
    demoUrl: p.demoUrl ?? '',
    published: p.published,
    sortOrder: String(p.sortOrder),
    featuresTitle: p.featuresTitle,
    features: p.features,
    layers: p.layers,
    stats: p.stats,
    milestones: p.milestones,
    facts: p.facts,
    documents: p.documents.map((value) => ({ value })),
    extraTitle: p.extraTitle ?? '',
    extraBody: p.extraBody ?? '',
    technologies: p.technologies.map((t) => ({ technologyId: t.id, category: t.category })),
    team: p.team.map((t) => ({ memberId: t.id, role: t.role ?? '' })),
  };
}

const clean = <T extends Record<string, unknown>>(rows: T[], key: keyof T) => rows.filter((r) => String(r[key] ?? '').trim());

function payload(f: Form) {
  return {
    ...f,
    slug: f.slug || undefined,
    sortOrder: Number(f.sortOrder) || 100,
    features: clean(f.features, 'title'),
    layers: clean(f.layers, 'title'),
    stats: clean(f.stats, 'value'),
    milestones: clean(f.milestones, 'title'),
    facts: clean(f.facts, 'label'),
    documents: f.documents.map((d) => d.value.trim()).filter(Boolean),
  };
}

function Images({ project, onChange }: { project: Project; onChange: (p: Project) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const upload = async (files: FileList | null) => {
    if (!files?.length) return;
    for (const f of Array.from(files)) {
      setUploading((n) => n + 1);
      try {
        const fd = new FormData();
        fd.append('file', f);
        fd.append('caption', f.name.replace(/\.[^.]+$/, '').replace(/[-_]+/g, ' '));
        onChange(await api.post<Project>(`/admin/projects/${project.id}/images`, fd));
      } catch (e) {
        toast.error(`${f.name}: ${errorText(e)}`);
      } finally {
        setUploading((n) => n - 1);
      }
    }
  };
  const edit = async (im: Img, patch: { caption?: string; alt?: string }) => {
    try {
      onChange(await api.patch<Project>(`/admin/projects/${project.id}/images/${im.id}`, { caption: patch.caption ?? im.caption, alt: patch.alt ?? im.alt }));
    } catch (e) {
      toast.error(errorText(e));
    }
  };
  const move = async (i: number, d: number) => {
    const ids = project.images.map((x) => x.id);
    [ids[i], ids[i + d]] = [ids[i + d], ids[i]];
    onChange(await api.post<Project>(`/admin/projects/${project.id}/images/reorder`, { ids }));
  };
  const remove = async (im: Img) => onChange(await api.del<Project>(`/admin/projects/${project.id}/images/${im.id}`));

  return (
    <Panel
      title="Capturas"
      description="La primera es la portada. Usa capturas anchas (16:10) en JPG, PNG o WebP de hasta 8 MB."
      actions={
        <>
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple className="sr-only" tabIndex={-1} onChange={(e) => upload(e.target.files).then(() => (e.target.value = ''))} />
          <Button onClick={() => input.current?.click()} disabled={uploading > 0}>
            {uploading ? <Loader2 className="animate-spin" /> : <ImagePlus />}
            {uploading ? `Subiendo ${uploading}…` : 'Subir capturas'}
          </Button>
        </>
      }
    >
      {!project.images.length && <p className="rounded-xl border border-dashed border-input px-4 py-10 text-center text-sm text-gris-2">Sin capturas todavía.</p>}
      <ul className="m-0 flex list-none flex-col gap-3 p-0">
        {project.images.map((im, i) => (
          <li key={im.id} className="flex flex-col gap-3 rounded-xl border border-linea p-3 sm:flex-row sm:items-center">
            <img src={im.url} alt="" className="aspect-[16/10] w-full shrink-0 rounded-lg bg-[#1C1C1C] object-cover object-top sm:w-44" />
            <div className="grid flex-1 gap-2">
              <Input defaultValue={im.caption ?? ''} placeholder="Título corto (se ve sobre la captura)" aria-label="Título" onBlur={(e) => e.target.value !== (im.caption ?? '') && edit(im, { caption: e.target.value })} />
              <Input defaultValue={im.alt ?? ''} placeholder="Qué se ve (para lectores de pantalla)" aria-label="Descripción" onBlur={(e) => e.target.value !== (im.alt ?? '') && edit(im, { alt: e.target.value })} />
            </div>
            <div className="flex gap-1 self-end sm:self-center">
              <Button variant="ghost" size="icon-sm" aria-label="Subir" disabled={i === 0} onClick={() => move(i, -1)}>
                <ArrowUp />
              </Button>
              <Button variant="ghost" size="icon-sm" aria-label="Bajar" disabled={i === project.images.length - 1} onClick={() => move(i, 1)}>
                <ArrowDown />
              </Button>
              <Confirm
                title="¿Quitar esta captura?"
                description="Se borra del servidor."
                action="Quitar"
                onConfirm={() => remove(im)}
                trigger={
                  <Button variant="ghost" size="icon-sm" aria-label="Quitar" className="text-rojo-texto">
                    <Trash2 />
                  </Button>
                }
              />
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}

export default function ProjectEditor() {
  const { id } = useParams();
  const isNew = !id;
  const nav = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({
    queryKey: ['admin', 'project', id],
    queryFn: () => api.get<Project>(`/admin/projects/${id}`),
    enabled: !isNew,
    // Mientras el video se procesa, se pregunta el avance cada 2,5 s
    refetchInterval: (query) => (query.state.data?.videoJob?.status === 'processing' ? 2500 : false),
  });
  const { data: members } = useAdminMembers();
  const { data: techs } = useTechnologies();
  const [form, setForm] = useState<Form | null>(isNew ? EMPTY : null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [tab, setTab] = useState('general');

  useEffect(() => {
    if (q.data && !dirty) setForm(fromProject(q.data));
  }, [q.data, dirty]);

  const pub = useAction((published: boolean) => api.patch<Project>(`/admin/projects/${id}/published`, { published }), {
    success: (p) => (p.published ? 'Publicado en la página' : 'Oculto de la página'),
    invalidate: [['admin', 'projects'], ['admin', 'project', id]],
  });

  if (!form || (!isNew && q.isLoading)) return <Spinner />;
  if (!isNew && q.error) return <p className="text-rojo-texto">{errorText(q.error)}</p>;
  const p = q.data;
  const set = (patch: Partial<Form>) => {
    setForm({ ...form, ...patch });
    setDirty(true);
  };
  const txt = (k: keyof Form) => ({ value: form[k] as string, onChange: (e: React.ChangeEvent<HTMLInputElement>) => set({ [k]: e.target.value } as Partial<Form>) });

  const save = async () => {
    setSaving(true);
    try {
      if (isNew) {
        const created = await api.post<Project>('/admin/projects', payload(form));
        toast.success('Proyecto creado. Ahora súbele capturas.');
        qc.invalidateQueries({ queryKey: ['admin', 'projects'] });
        setDirty(false);
        nav(`/admin/proyectos/${created.id}`, { replace: true });
      } else {
        const updated = await api.put<Project>(`/admin/projects/${id}`, payload(form));
        qc.setQueryData(['admin', 'project', id], updated);
        qc.invalidateQueries({ queryKey: ['admin', 'projects'] });
        qc.invalidateQueries({ queryKey: ['site'] });
        setDirty(false);
        setForm(fromProject(updated));
        toast.success('Cambios guardados');
      }
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setSaving(false);
    }
  };

  const techById = new Map((techs ?? []).map((t) => [t.id, t]));
  const memberList = (members ?? []).filter((m) => m.status !== 'hidden' || form.team.some((t) => t.memberId === m.id));

  return (
    <div className="flex flex-col gap-6 pb-24">
      <Link to="/admin/proyectos" className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-marino">
        <ArrowLeft className="size-4" /> Proyectos
      </Link>
      <PageHeader
        title={isNew ? 'Nuevo proyecto' : form.name || 'Proyecto'}
        actions={
          p && (
            <label className="flex cursor-pointer items-center gap-2.5 rounded-full border border-linea bg-white px-4 py-2 text-sm font-semibold">
              <Switch checked={p.published} onCheckedChange={(c) => pub.mutate(c)} disabled={pub.isPending || dirty} />
              {p.published ? 'Se ve en la página' : 'Oculto'}
            </label>
          )
        }
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="pagina">Página del proyecto</TabsTrigger>
          <TabsTrigger value="equipo">Equipo y tecnologías</TabsTrigger>
          <TabsTrigger value="capturas" disabled={isNew}>
            Capturas {p ? <span className="text-xs opacity-70">{p.images.length}</span> : null}
          </TabsTrigger>
          <TabsTrigger value="video" disabled={isNew}>
            Video {p?.videoJob?.status === 'processing' ? <Loader2 className="size-3.5 animate-spin" /> : p?.video ? <span className="size-2 rounded-full bg-[#16a34a]" aria-label="tiene video" /> : null}
          </TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="flex flex-col gap-6">
          <Panel title="Lo básico">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Nombre" htmlFor="name">
                <Input id="name" {...txt('name')} />
              </Field>
              <Field label="Etiqueta (opcional)" htmlFor="tag" hint="Sale junto al estado: «Proyecto integrador FESC».">
                <Input id="tag" {...txt('tag')} />
              </Field>
              <Field label="Subtítulo" htmlFor="subtitle" className="sm:col-span-2" hint="Una línea: qué es y para quién.">
                <Input id="subtitle" {...txt('subtitle')} />
              </Field>
              <Field label="Resumen para el inicio" htmlFor="summary" className="sm:col-span-2" hint="Se ve al abrir el proyecto en la página principal.">
                <CountedTextarea id="summary" value={form.summary} onChange={(v) => set({ summary: v })} max={400} rows={3} />
              </Field>
              <Field label="Estado">
                <Select value={form.status} onValueChange={(v) => set({ status: v as ProjectStatus })}>
                  <SelectTrigger aria-label="Estado">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en_desarrollo">En desarrollo</SelectItem>
                    <SelectItem value="prototipo">Prototipo</SelectItem>
                    <SelectItem value="finalizado">Finalizado</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Texto del estado (opcional)" htmlFor="statusLabel" hint="Ej.: «Prototipo · fase 1». Vacío usa el estado.">
                <Input id="statusLabel" {...txt('statusLabel')} />
              </Field>
              <Field label="Enfoque" htmlFor="focus" hint="Innovación, optimización, automatización o IA.">
                <Input id="focus" {...txt('focus')} />
              </Field>
              <Field label="Link para probarlo (opcional)" htmlFor="demo" hint="Sin links a código: solo la app publicada.">
                <Input id="demo" {...txt('demoUrl')} placeholder="https://…" />
              </Field>
              <Field label="Posición" htmlFor="order" hint="Número más bajo, aparece antes.">
                <Input id="order" type="number" {...txt('sortOrder')} className="w-28" />
              </Field>
              {!isNew && (
                <Field label="Dirección" htmlFor="slug" hint={`/proyectos/${form.slug}`}>
                  <Input id="slug" value={form.slug} onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} />
                </Field>
              )}
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="pagina" className="flex flex-col gap-6">
          <Panel title="Encabezado y problema">
            <div className="grid gap-5">
              <Field label="Presentación" htmlFor="intro">
                <CountedTextarea id="intro" value={form.intro} onChange={(v) => set({ intro: v })} max={1500} rows={3} />
              </Field>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="El problema" htmlFor="problem">
                  <CountedTextarea id="problem" value={form.problem} onChange={(v) => set({ problem: v })} max={1500} rows={5} />
                </Field>
                <Field label="La solución" htmlFor="solution">
                  <CountedTextarea id="solution" value={form.solution} onChange={(v) => set({ solution: v })} max={1500} rows={5} />
                </Field>
              </div>
            </div>
          </Panel>
          <Panel title="Cifras" description="Hasta 4 se ven en franjas de color bajo las capturas.">
            <RowsEditor<Stat> rows={form.stats} onChange={(stats) => set({ stats })} columns={[{ key: 'value', label: 'Cifra', placeholder: '9', width: '0.6fr' }, { key: 'label', label: 'Qué significa', placeholder: 'módulos en una sola app' }]} blank={{ value: '', label: '' }} empty="Sin cifras." addLabel="Agregar cifra" max={6} />
          </Panel>
          <Panel title="Funciones o módulos">
            <Field label="Título de la sección" htmlFor="ft">
              <Input id="ft" {...txt('featuresTitle')} className="max-w-xs" />
            </Field>
            <RowsEditor<Feature> rows={form.features} onChange={(features) => set({ features })} columns={[{ key: 'title', label: 'Nombre', width: '0.7fr' }, { key: 'description', label: 'Qué hace' }]} blank={{ title: '', description: '' }} empty="Sin funciones." addLabel="Agregar función" max={12} />
          </Panel>
          <Panel title="Cómo está construido">
            <RowsEditor<Layer> rows={form.layers} onChange={(layers) => set({ layers })} columns={[{ key: 'label', label: 'Capa', placeholder: 'Pantalla', width: '0.5fr' }, { key: 'title', label: 'Con qué', placeholder: 'React + TypeScript', width: '0.8fr' }, { key: 'description', label: 'Explicación' }]} blank={{ label: '', title: '', description: '' }} empty="Sin capas." addLabel="Agregar capa" max={8} />
          </Panel>
          <Panel title="Avances">
            <RowsEditor<Milestone>
              rows={form.milestones}
              onChange={(milestones) => set({ milestones })}
              columns={[{ key: 'date', label: 'Fecha', placeholder: '11 nov 2026', width: '0.5fr' }, { key: 'title', label: 'Qué pasó', width: '0.8fr' }, { key: 'description', label: 'Detalle' }]}
              blank={{ date: '', title: '', description: '' }}
              empty="Sin avances."
              addLabel="Agregar avance"
              extra={(r, s) => (
                <label className="flex cursor-pointer items-center gap-2 text-sm font-medium sm:col-span-full">
                  <Checkbox checked={!!r.pending} onCheckedChange={(c) => s({ pending: c === true })} /> Está pendiente (se marca en rojo)
                </label>
              )}
            />
          </Panel>
          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Ficha" description="El estado se agrega solo.">
              <RowsEditor<Fact> rows={form.facts} onChange={(facts) => set({ facts })} columns={[{ key: 'label', label: 'Dato', placeholder: 'Sector' }, { key: 'value', label: 'Valor', placeholder: 'Calzado' }]} blank={{ label: '', value: '' }} empty="Sin datos." addLabel="Agregar dato" max={10} />
            </Panel>
            <Panel title="Documentos" description="Solo los nombres; no se enlazan.">
              <RowsEditor<{ value: string }> rows={form.documents} onChange={(documents) => set({ documents })} columns={[{ key: 'value', label: 'Documento', placeholder: 'Manual de usuario' }]} blank={{ value: '' }} empty="Sin documentos." addLabel="Agregar documento" max={10} />
            </Panel>
          </div>
          <Panel title="Bloque extra (opcional)" description="Un recuadro negro para algo propio del proyecto. Deja una línea en blanco para separar párrafos.">
            <div className="grid gap-4">
              <Field label="Título" htmlFor="et">
                <Input id="et" {...txt('extraTitle')} placeholder="Los lugares" />
              </Field>
              <Field label="Texto" htmlFor="eb">
                <CountedTextarea id="eb" value={form.extraBody} onChange={(v) => set({ extraBody: v })} max={2000} rows={4} />
              </Field>
            </div>
          </Panel>
        </TabsContent>

        <TabsContent value="equipo" className="flex flex-col gap-6">
          <Panel title="Equipo" description="Solo los perfiles publicados se ven en la página.">
            <div className="flex flex-col gap-2">
              {memberList.map((m) => {
                const sel = form.team.find((t) => t.memberId === m.id);
                return (
                  <div key={m.id} className="flex flex-col gap-2 rounded-xl border border-linea p-3 sm:flex-row sm:items-center">
                    <label className="flex min-w-60 cursor-pointer items-center gap-3 font-semibold">
                      <Checkbox checked={!!sel} onCheckedChange={(c) => set({ team: c ? [...form.team, { memberId: m.id, role: '' }] : form.team.filter((t) => t.memberId !== m.id) })} />
                      <span className="flex flex-col">
                        {m.fullName}
                        <span className="w-fit">
                          <StatusBadge status={m.status} />
                        </span>
                      </span>
                    </label>
                    {sel && (
                      <Input
                        aria-label={`Rol de ${m.fullName}`}
                        value={sel.role}
                        onChange={(e) => set({ team: form.team.map((t) => (t.memberId === m.id ? { ...t, role: e.target.value } : t)) })}
                        placeholder="Rol en el proyecto"
                        className="h-10 flex-1"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>
          <Panel title="Tecnologías" description="Elige y, si quieres, cambia el grupo con el que se muestra cada una en la ficha.">
            {techs ? (
              <TechPicker
                all={techs}
                selected={form.technologies.map((t) => t.technologyId)}
                onChange={(ids) =>
                  set({ technologies: ids.map((tid) => form.technologies.find((t) => t.technologyId === tid) ?? { technologyId: tid, category: techById.get(tid)?.category ?? 'Herramientas' }) })
                }
              />
            ) : (
              <Spinner />
            )}
            {form.technologies.length > 0 && (
              <div className="flex flex-col gap-2 border-t border-linea pt-5">
                <span className="text-sm font-bold">Grupo en la ficha del proyecto</span>
                {form.technologies.map((t) => {
                  const tech = techById.get(t.technologyId);
                  if (!tech) return null;
                  return (
                    <div key={t.technologyId} className="flex items-center gap-3">
                      <TechLogo tech={tech} size={22} />
                      <span className="w-36 truncate text-sm font-semibold">{tech.name}</span>
                      <Input
                        aria-label={`Grupo de ${tech.name}`}
                        value={t.category}
                        onChange={(e) => set({ technologies: form.technologies.map((x) => (x.technologyId === t.technologyId ? { ...x, category: e.target.value } : x)) })}
                        className="h-9 max-w-56"
                      />
                    </div>
                  );
                })}
              </div>
            )}
          </Panel>
        </TabsContent>

        <TabsContent value="video">
          {p && (
            <ProjectVideoPanel
              project={p}
              onChange={(np) => {
                qc.setQueryData(['admin', 'project', id], np);
                qc.invalidateQueries({ queryKey: ['admin', 'projects'] });
              }}
            />
          )}
        </TabsContent>

        <TabsContent value="capturas">{p && <Images project={p} onChange={(np) => (qc.setQueryData(['admin', 'project', id], np), qc.invalidateQueries({ queryKey: ['admin', 'projects'] }))} />}</TabsContent>
      </Tabs>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-linea bg-white/95 backdrop-blur lg:left-[264px]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <span className="text-sm text-gris-2" aria-live="polite">
            {dirty ? 'Tienes cambios sin guardar' : isNew ? 'Proyecto nuevo' : 'Todo guardado'}
          </span>
          <Button onClick={save} disabled={saving || (!dirty && !isNew) || form.name.trim().length < 2}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            {isNew ? 'Crear proyecto' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </div>
  );
}
