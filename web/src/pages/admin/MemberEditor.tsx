import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Download, Eye, EyeOff, Loader2, Save } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { toast } from 'sonner';
import { CountedTextarea, Field, formatJoined, MONTHS, parseJoined, RowsEditor, TechPicker } from '@/components/forms';
import { PhotoPicker } from '@/components/PhotoCropper';
import { Portrait } from '@/components/site/bits';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { api, errorText } from '@/lib/api';
import type { Achievement, AdminMember, Education, MemberStatus } from '@/lib/types';
import { InviteButton, useAdminProjects, useTechnologies } from './shared';
import { fmtDate, fmtRelative, PageHeader, Panel, Spinner, StatusBadge, useAction } from './ui';

type Form = {
  fullName: string;
  slug: string;
  kind: 'docente' | 'estudiante';
  roleTitle: string;
  program: string;
  semester: string;
  joinedMonth: string;
  joinedYear: string;
  bio: string;
  interests: string;
  email: string;
  githubUrl: string;
  linkedinUrl: string;
  cvlacUrl: string;
  featured: boolean;
  sortOrder: string;
  achievements: Achievement[];
  education: Education[];
  technologyIds: number[];
  projects: { projectId: number; role: string }[];
};

const EMPTY: Form = {
  fullName: '',
  slug: '',
  kind: 'estudiante',
  roleTitle: 'Integrante',
  program: 'Ingeniería de Software',
  semester: '',
  joinedMonth: '',
  joinedYear: '',
  bio: '',
  interests: '',
  email: '',
  githubUrl: '',
  linkedinUrl: '',
  cvlacUrl: '',
  featured: false,
  sortOrder: '100',
  achievements: [],
  education: [],
  technologyIds: [],
  projects: [],
};

function fromMember(m: AdminMember): Form {
  const j = parseJoined(m.joinedOn);
  return {
    fullName: m.fullName,
    slug: m.slug,
    kind: m.kind,
    roleTitle: m.roleTitle,
    program: m.program,
    semester: m.semester ? String(m.semester) : '',
    joinedMonth: j.month,
    joinedYear: j.year,
    bio: m.bio ?? '',
    interests: m.interests ?? '',
    email: m.email ?? '',
    githubUrl: m.githubUrl ?? '',
    linkedinUrl: m.linkedinUrl ?? '',
    cvlacUrl: m.cvlacUrl ?? '',
    featured: m.featured,
    sortOrder: String(m.sortOrder),
    achievements: m.achievements,
    education: m.education,
    technologyIds: m.technologies.map((t) => t.id),
    projects: m.projects.map((p) => ({ projectId: p.id, role: p.role ?? '' })),
  };
}

function payload(f: Form) {
  return {
    ...f,
    slug: f.slug || undefined,
    semester: f.semester ? Number(f.semester) : null,
    joinedOn: formatJoined(f.joinedMonth, f.joinedYear) || null,
    sortOrder: Number(f.sortOrder) || 100,
    bio: f.bio || null,
    interests: f.interests || null,
    achievements: f.achievements.filter((a) => a.title?.trim()),
    education: f.education.filter((e) => e.title?.trim()),
    joinedMonth: undefined,
    joinedYear: undefined,
  };
}

export default function MemberEditor() {
  const { id } = useParams();
  const isNew = !id;
  const nav = useNavigate();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['admin', 'member', id], queryFn: () => api.get<AdminMember>(`/admin/members/${id}`), enabled: !isNew });
  const { data: projects } = useAdminProjects();
  const { data: techs } = useTechnologies();
  const [form, setForm] = useState<Form | null>(isNew ? EMPTY : null);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (q.data && !dirty) setForm(fromMember(q.data));
  }, [q.data, dirty]);

  const refresh = (m?: AdminMember) => {
    if (m) qc.setQueryData(['admin', 'member', id], m);
    qc.invalidateQueries({ queryKey: ['admin', 'members'] });
    qc.invalidateQueries({ queryKey: ['admin', 'summary'] });
    qc.invalidateQueries({ queryKey: ['site'] });
  };

  const status = useAction((s: MemberStatus) => api.post<AdminMember>(`/admin/members/${id}/status`, { status: s }), {
    success: (m) => (m.status === 'published' ? 'Publicado en la página' : m.status === 'hidden' ? 'Oculto de la página' : 'Estado actualizado'),
    onSuccess: (m) => refresh(m),
  });
  const photo = useAction(
    (blob: Blob) => {
      const fd = new FormData();
      fd.append('file', blob, 'foto.jpg');
      return api.post<AdminMember>(`/admin/members/${id}/photo`, fd);
    },
    { success: 'Foto actualizada', onSuccess: (m) => refresh(m) },
  );

  if (!form || (!isNew && q.isLoading)) return <Spinner />;
  if (!isNew && q.error) return <p className="text-rojo-texto">{errorText(q.error)}</p>;
  const m = q.data;

  const set = (patch: Partial<Form>) => {
    setForm({ ...form, ...patch });
    setDirty(true);
  };

  const save = async () => {
    setSaving(true);
    try {
      const body = payload(form);
      if (isNew) {
        const created = await api.post<AdminMember>('/admin/members', body);
        toast.success('Perfil creado. Ahora súbele una foto.');
        refresh();
        setDirty(false);
        nav(`/admin/integrantes/${created.id}`, { replace: true });
      } else {
        const updated = await api.put<AdminMember>(`/admin/members/${id}`, body);
        refresh(updated);
        setDirty(false);
        setForm(fromMember(updated));
        toast.success('Cambios guardados');
      }
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setSaving(false);
    }
  };

  const years = Array.from({ length: 12 }, (_, i) => String(new Date().getFullYear() - i));

  return (
    <div className="flex flex-col gap-6 pb-24">
      <Link to="/admin/integrantes" className="inline-flex items-center gap-1.5 self-start text-sm font-semibold text-marino">
        <ArrowLeft className="size-4" /> Integrantes
      </Link>
      <PageHeader
        title={isNew ? 'Nuevo perfil' : form.fullName || 'Perfil'}
        description={isNew ? 'Llena lo que sepas. La persona puede completar el resto con su link.' : m?.submittedAt ? `Enviado por la persona ${fmtRelative(m.submittedAt)}.` : undefined}
        actions={m && <StatusBadge status={m.status} />}
      />

      <div className="grid items-start gap-6 lg:grid-cols-[1fr_320px]">
        <div className="flex flex-col gap-6">
          <Panel title="Datos">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Nombre completo" htmlFor="fullName" className="sm:col-span-2">
                <Input id="fullName" value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} />
              </Field>
              <Field label="Tipo">
                <Select value={form.kind} onValueChange={(v) => set({ kind: v as Form['kind'] })}>
                  <SelectTrigger aria-label="Tipo">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="estudiante">Estudiante</SelectItem>
                    <SelectItem value="docente">Docente</SelectItem>
                  </SelectContent>
                </Select>
              </Field>
              <Field label="Rol en el semillero" htmlFor="roleTitle">
                <Input id="roleTitle" value={form.roleTitle} onChange={(e) => set({ roleTitle: e.target.value })} placeholder="Integrante" />
              </Field>
              <Field label="Programa" htmlFor="program">
                <Input id="program" value={form.program} onChange={(e) => set({ program: e.target.value })} />
              </Field>
              {form.kind === 'estudiante' && (
                <Field label="Semestre">
                  <Select value={form.semester} onValueChange={(v) => set({ semester: v })}>
                    <SelectTrigger aria-label="Semestre">
                      <SelectValue placeholder="Sin dato" />
                    </SelectTrigger>
                    <SelectContent>
                      {Array.from({ length: 10 }, (_, i) => (
                        <SelectItem key={i} value={String(i + 1)}>
                          {i + 1}.º semestre
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              )}
              <Field label={form.kind === 'docente' ? 'Dirige SINDES desde' : 'En SINDES desde'} className={form.kind === 'docente' ? '' : 'sm:col-span-2'}>
                <div className="grid grid-cols-2 gap-3">
                  <Select value={form.joinedMonth} onValueChange={(v) => set({ joinedMonth: v })}>
                    <SelectTrigger aria-label="Mes">
                      <SelectValue placeholder="Mes" />
                    </SelectTrigger>
                    <SelectContent>
                      {MONTHS.map((mo) => (
                        <SelectItem key={mo} value={mo}>
                          {mo}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select value={form.joinedYear} onValueChange={(v) => set({ joinedYear: v })}>
                    <SelectTrigger aria-label="Año">
                      <SelectValue placeholder="Año" />
                    </SelectTrigger>
                    <SelectContent>
                      {years.map((y) => (
                        <SelectItem key={y} value={y}>
                          {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </Field>
              <Field label="Presentación" htmlFor="bio" className="sm:col-span-2">
                <CountedTextarea id="bio" value={form.bio} onChange={(v) => set({ bio: v })} max={1200} rows={4} />
              </Field>
              <Field label="Intereses de investigación" htmlFor="interests" className="sm:col-span-2">
                <CountedTextarea id="interests" value={form.interests} onChange={(v) => set({ interests: v })} max={400} rows={2} />
              </Field>
            </div>
          </Panel>

          <Panel title="Contacto y redes" description="Solo se muestra el correo institucional.">
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Correo institucional" htmlFor="email" className="sm:col-span-2">
                <Input id="email" type="email" value={form.email} onChange={(e) => set({ email: e.target.value })} placeholder="nombre@fesc.edu.co" />
              </Field>
              <Field label="GitHub" htmlFor="gh">
                <Input id="gh" value={form.githubUrl} onChange={(e) => set({ githubUrl: e.target.value })} placeholder="https://github.com/usuario" />
              </Field>
              <Field label="LinkedIn" htmlFor="li">
                <Input id="li" value={form.linkedinUrl} onChange={(e) => set({ linkedinUrl: e.target.value })} placeholder="https://linkedin.com/in/usuario" />
              </Field>
              <Field label="CvLAC (docentes)" htmlFor="cv" className="sm:col-span-2">
                <Input id="cv" value={form.cvlacUrl} onChange={(e) => set({ cvlacUrl: e.target.value })} placeholder="https://scienti.minciencias.gov.co/cvlac/…" />
              </Field>
            </div>
          </Panel>

          <Panel title="Proyectos y rol">
            <div className="flex flex-col gap-3">
              {(projects ?? []).map((p) => {
                const sel = form.projects.find((x) => x.projectId === p.id);
                return (
                  <div key={p.id} className="flex flex-col gap-2.5 rounded-xl border border-linea p-3.5 sm:flex-row sm:items-center">
                    <label className="flex min-w-40 cursor-pointer items-center gap-3 font-semibold">
                      <Checkbox
                        checked={!!sel}
                        onCheckedChange={(c) => set({ projects: c ? [...form.projects, { projectId: p.id, role: '' }] : form.projects.filter((x) => x.projectId !== p.id) })}
                      />
                      {p.name}
                    </label>
                    {sel && (
                      <Input
                        aria-label={`Rol en ${p.name}`}
                        value={sel.role}
                        onChange={(e) => set({ projects: form.projects.map((x) => (x.projectId === p.id ? { ...x, role: e.target.value } : x)) })}
                        placeholder="Rol en el proyecto"
                        className="h-10 flex-1"
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </Panel>

          <Panel title="Stack" description={`${form.technologyIds.length} elegidas`}>
            {techs ? <TechPicker all={techs} selected={form.technologyIds} onChange={(ids) => set({ technologyIds: ids })} /> : <Spinner />}
          </Panel>

          <Panel title="Formación">
            <RowsEditor<Education>
              rows={form.education}
              onChange={(education) => set({ education })}
              columns={[
                { key: 'title', label: 'Título', width: '1.4fr' },
                { key: 'institution', label: 'Institución' },
                { key: 'period', label: 'Periodo', width: '0.9fr' },
              ]}
              blank={{ title: '', institution: '', period: '' }}
              empty="Sin estudios cargados."
              addLabel="Agregar estudio"
            />
          </Panel>

          <Panel title="Participaciones y logros">
            <RowsEditor<Achievement>
              rows={form.achievements}
              onChange={(achievements) => set({ achievements })}
              columns={[
                { key: 'title', label: 'Logro', width: '1.6fr' },
                { key: 'detail', label: 'Detalle' },
                { key: 'date', label: 'Año', width: '0.6fr' },
              ]}
              blank={{ title: '', detail: '', date: '' }}
              empty="Sin logros cargados."
              addLabel="Agregar logro"
            />
          </Panel>
        </div>

        <div className="flex flex-col gap-6 lg:sticky lg:top-6">
          <Panel title="Foto">
            <Portrait name={form.fullName || '?'} url={m?.photoUrl ?? null} bg="#1B4B9B" className="cut-tr-56 aspect-[4/5] w-full max-w-[240px]" textClass="text-6xl" />
            {isNew ? (
              <p className="text-sm text-gris-2">Guarda el perfil para poder subir la foto.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                <PhotoPicker variant="outline" label={m?.photoUrl ? 'Cambiar foto' : 'Subir foto'} busy={photo.isPending} onCropped={(b) => photo.mutateAsync(b).then(() => undefined)} />
                {m?.photoUrl && (
                  <Button asChild variant="ghost">
                    {/* La API la entrega en JPG con el nombre de la persona */}
                    <a href={`/api/admin/members/${m.id}/photo?v=${encodeURIComponent(m.photoUrl)}`} download>
                      <Download /> Descargar
                    </a>
                  </Button>
                )}
              </div>
            )}
          </Panel>

          {m && (
            <Panel title="En la página">
              <div className="flex flex-col gap-2 text-sm">
                <p className="flex items-center justify-between gap-2">
                  Estado <StatusBadge status={m.status} />
                </p>
                <p className="flex items-center justify-between gap-2">
                  Autorizó sus datos <span className="font-semibold">{m.consent ? 'Sí' : 'Todavía no'}</span>
                </p>
              </div>
              {m.status !== 'published' ? (
                <Button onClick={() => status.mutate('published')} disabled={!m.photoUrl || status.isPending || dirty}>
                  {status.isPending ? <Loader2 className="animate-spin" /> : <Eye />}
                  Publicar
                </Button>
              ) : (
                <>
                  <Button asChild variant="outline">
                    <a href={`/integrantes/${m.slug}`} target="_blank" rel="noreferrer">
                      <Eye /> Ver en la página
                    </a>
                  </Button>
                  <Button variant="ghost" onClick={() => status.mutate('hidden')} disabled={status.isPending}>
                    <EyeOff /> Ocultar
                  </Button>
                </>
              )}
              {!m.photoUrl && m.status !== 'published' && <p className="text-xs text-rojo-texto">Para publicar necesita foto.</p>}
              {dirty && m.status !== 'published' && <p className="text-xs text-gris-2">Guarda los cambios antes de publicar.</p>}
              {!m.consent && <p className="text-xs text-gris-2">Si lo publicas sin su autorización, asegúrate de tenerla por otro medio.</p>}
            </Panel>
          )}

          {m && (
            <Panel title="Link personal" description={m.hasInvite ? `Activo hasta el ${fmtDate(m.inviteExpiresAt)}.` : 'No tiene un link activo.'}>
              <InviteButton member={m} onDone={() => qc.invalidateQueries({ queryKey: ['admin', 'member', id] })} />
              <p className="text-xs text-gris-2">Sirve para que la persona complete o corrija su perfil. Al generar uno nuevo, el anterior deja de funcionar.</p>
            </Panel>
          )}

          <Panel title="Orden y destacado">
            <label className="flex cursor-pointer items-center justify-between gap-3 text-sm font-semibold">
              Directora del semillero
              <Switch checked={form.featured} onCheckedChange={(c) => set({ featured: c })} />
            </label>
            <p className="-mt-3 text-xs text-gris-2">Sale primero en el bloque de docentes, con la etiqueta roja. Solo puede haber una. Los demás docentes rotan después según su posición.</p>
            <Field label="Posición" htmlFor="order" hint="Número más bajo, aparece antes.">
              <Input id="order" type="number" value={form.sortOrder} onChange={(e) => set({ sortOrder: e.target.value })} className="w-28" />
            </Field>
            {!isNew && (
              <Field label="Dirección del perfil" htmlFor="slug" hint={`/integrantes/${form.slug}`}>
                <Input id="slug" value={form.slug} onChange={(e) => set({ slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} />
              </Field>
            )}
          </Panel>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-linea bg-white/95 backdrop-blur lg:left-[264px]">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3 px-4 py-3 sm:px-8">
          <span className="text-sm text-gris-2" aria-live="polite">
            {dirty ? 'Tienes cambios sin guardar' : isNew ? 'Perfil nuevo' : 'Todo guardado'}
          </span>
          <Button onClick={save} disabled={saving || (!dirty && !isNew) || form.fullName.trim().length < 3}>
            {saving ? <Loader2 className="animate-spin" /> : <Save />}
            {isNew ? 'Crear perfil' : 'Guardar cambios'}
          </Button>
        </div>
      </div>
    </div>
  );
}
