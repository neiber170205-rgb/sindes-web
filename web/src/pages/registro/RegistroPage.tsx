import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, ArrowRight, Check, Loader2, Send } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { useLocation, useParams } from 'react-router';
import { toast } from 'sonner';
import { CountedTextarea, Field, formatJoined, MONTHS, parseJoined, RowsEditor, TechPicker } from '@/components/forms';
import { PhotoPicker } from '@/components/PhotoCropper';
import { Portrait } from '@/components/site/bits';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { api, ApiError, errorText } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import type { Achievement, Education, Member, MemberStatus, Tech } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Shell } from './Shell';

type Load = {
  member: Member & { status: MemberStatus; consent: boolean; submittedAt: string | null };
  projects: { id: number; name: string; status: string }[];
  technologies: Tech[];
};

type Form = {
  fullName: string;
  roleTitle: string;
  semester: string;
  joinedMonth: string;
  joinedYear: string;
  bio: string;
  interests: string;
  email: string;
  githubUrl: string;
  linkedinUrl: string;
  technologyIds: number[];
  projects: { projectId: number; role: string }[];
  education: Education[];
  achievements: Achievement[];
  consent: boolean;
};

const STEPS = ['Tus datos', 'Tu foto', 'Proyectos', 'Stack', 'Trayectoria y envío'];

function toForm(m: Load['member']): Form {
  const j = parseJoined(m.joinedOn);
  return {
    fullName: m.fullName ?? '',
    roleTitle: m.roleTitle ?? 'Integrante',
    semester: m.semester ? String(m.semester) : '',
    joinedMonth: j.month,
    joinedYear: j.year,
    bio: m.bio ?? '',
    interests: m.interests ?? '',
    email: m.email ?? '',
    githubUrl: m.githubUrl ?? '',
    linkedinUrl: m.linkedinUrl ?? '',
    technologyIds: m.technologies.map((t) => t.id),
    projects: m.projects.map((p) => ({ projectId: p.id, role: p.role ?? '' })),
    education: m.education,
    achievements: m.achievements,
    consent: m.consent,
  };
}

function toPayload(f: Form) {
  return {
    fullName: f.fullName,
    roleTitle: f.roleTitle || undefined,
    semester: f.semester ? Number(f.semester) : null,
    joinedOn: formatJoined(f.joinedMonth, f.joinedYear) || null,
    bio: f.bio || null,
    interests: f.interests || null,
    email: f.email.trim().toLowerCase() || null,
    githubUrl: f.githubUrl.trim(),
    linkedinUrl: f.linkedinUrl.trim(),
    technologyIds: f.technologyIds,
    projects: f.projects,
    education: f.education.filter((e) => e.title?.trim()),
    achievements: f.achievements.filter((a) => a.title?.trim()),
    consent: f.consent,
  };
}

/** Aviso para quien acaba de llegar desde el link general: su link personal es la dirección actual. */
function SaveLinkNote() {
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      toast.success('Link copiado');
    } catch {
      toast.error('No se pudo copiar: copia la dirección de arriba');
    }
  };
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border-2 border-black bg-white px-4 py-3">
      <p className="text-sm font-medium">
        Este es <b>tu link personal</b>. Guárdalo en favoritos o cópialo: con él vuelves a tu perfil cuando quieras.
      </p>
      <Button size="sm" variant="outline" onClick={copy}>
        Copiar mi link
      </Button>
    </div>
  );
}

export default function RegistroPage() {
  const { token = '' } = useParams();
  const fromOpenLink = (useLocation().state as { nuevo?: boolean } | null)?.nuevo === true;
  const qc = useQueryClient();
  useDocumentTitle('Tu perfil en SINDES');
  const q = useQuery({ queryKey: ['registro', token], queryFn: () => api.get<Load>(`/registro/${token}`), retry: false });
  const [form, setForm] = useState<Form | null>(null);
  const [step, setStep] = useState(0);
  const [done, setDone] = useState<null | 'pending' | 'published'>(null);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (q.data && !form) setForm(toForm(q.data.member));
  }, [q.data, form]);

  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const save = useMutation({
    mutationFn: (f: Form) => api.put<Load>(`/registro/${token}`, toPayload(f)),
    onSuccess: (data) => {
      qc.setQueryData(['registro', token], data);
      setDirty(false);
    },
  });

  const photo = useMutation({
    mutationFn: (blob: Blob) => {
      const fd = new FormData();
      fd.append('file', blob, 'foto.jpg');
      return api.post<{ photoUrl: string }>(`/registro/${token}/photo`, fd);
    },
    onSuccess: () => {
      toast.success('Foto guardada');
      qc.invalidateQueries({ queryKey: ['registro', token] });
    },
  });

  const submit = useMutation({
    mutationFn: async (f: Form) => {
      await api.put(`/registro/${token}`, toPayload(f));
      return api.post<{ ok: true; status: 'pending' | 'published' }>(`/registro/${token}/submit`);
    },
    onSuccess: (r) => {
      setDirty(false);
      setDone(r.status);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    },
  });

  const set = (patch: Partial<Form>) => {
    setForm((f) => (f ? { ...f, ...patch } : f));
    setDirty(true);
  };

  const years = useMemo(() => {
    const y = new Date().getFullYear();
    return Array.from({ length: 8 }, (_, i) => String(y - i));
  }, []);

  if (q.isLoading) {
    return (
      <Shell>
        <div className="flex justify-center py-24" role="status" aria-label="Cargando">
          <Loader2 className="size-8 animate-spin" />
        </div>
      </Shell>
    );
  }
  if (q.error || !q.data || !form) {
    const msg = q.error instanceof ApiError ? q.error.message : 'No pudimos abrir tu formulario.';
    return (
      <Shell>
        <div className="flex flex-col gap-4 rounded-2xl border-2 border-black bg-white p-8 shadow-[6px_6px_0_#E1251B]">
          <h1 className="text-3xl font-black italic">Este link no funciona.</h1>
          <p className="text-lg text-gris">{msg}</p>
          <p className="text-gris-2">Pide un link nuevo a quien administra la página del semillero.</p>
        </div>
      </Shell>
    );
  }

  const m = q.data.member;
  const isDocente = m.kind === 'docente';

  if (done) {
    return (
      <Shell>
        <div className="flex flex-col items-start gap-5 rounded-2xl border-2 border-black bg-white p-8 shadow-[6px_6px_0_#3F95CB]">
          <span className="flex size-14 items-center justify-center rounded-full bg-black text-white">
            <Check className="size-7" strokeWidth={3} />
          </span>
          <h1 className="text-[clamp(28px,4vw,40px)] leading-tight font-black italic">
            {done === 'published' ? 'Tus cambios ya están en la página.' : '¡Listo! Tu perfil quedó en revisión.'}
          </h1>
          <p className="text-lg text-gris">
            {done === 'published'
              ? 'Gracias por mantener tu perfil al día.'
              : 'Quien administra la página lo revisa y lo publica. Mientras tanto puedes volver a este mismo link para corregir algo.'}
          </p>
          <div className="flex flex-wrap gap-3">
            <Button variant="outline" onClick={() => setDone(null)}>
              Volver a mi formulario
            </Button>
            {done === 'published' && (
              <Button asChild>
                <a href={`/integrantes/${m.slug}`}>Ver mi perfil</a>
              </Button>
            )}
          </div>
        </div>
      </Shell>
    );
  }

  const go = async (to: number) => {
    if (to > step && step === 0 && form.fullName.trim().length < 5) {
      toast.error('Escribe tu nombre completo');
      return;
    }
    if (dirty) {
      try {
        await save.mutateAsync(form);
      } catch (e) {
        toast.error(errorText(e));
        return;
      }
    }
    setStep(to);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const missing = [!form.fullName.trim() && 'nombre', !m.photoUrl && 'foto', !form.email.trim() && 'correo institucional', !form.consent && 'autorización'].filter(Boolean) as string[];

  return (
    <Shell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="font-semibold text-marino">Hola, {form.fullName.split(' ')[0] || 'integrante'}.</p>
          <h1 className="text-[clamp(30px,5vw,46px)] leading-[1.02] font-black tracking-[-0.015em] italic">Arma tu perfil en SINDES.</h1>
          <p className="max-w-xl text-[17px] text-gris">Lo que escribas aquí sale en la página del semillero. Se guarda cada vez que pasas de paso y puedes volver a este link cuando quieras.</p>
        </div>

        {fromOpenLink && <SaveLinkNote />}

        {m.status === 'pending' && (
          <p className="rounded-xl border-2 border-black bg-[#FFF1D6] px-4 py-3 text-sm font-medium">Ya enviaste tu perfil y está en revisión. Si cambias algo, vuelve a enviarlo al final.</p>
        )}
        {m.status === 'published' && (
          <p className="rounded-xl border-2 border-black bg-[#DDF3E4] px-4 py-3 text-sm font-medium">Tu perfil ya está publicado. Lo que guardes se verá enseguida en la página.</p>
        )}

        <nav aria-label="Pasos" className="grid grid-cols-5 gap-1.5">
          {STEPS.map((s, i) => (
            <button
              key={s}
              type="button"
              onClick={() => go(i)}
              aria-current={i === step ? 'step' : undefined}
              className="group flex cursor-pointer flex-col gap-2 border-none bg-transparent p-0 text-left"
            >
              <span className={cn('h-1.5 rounded-full transition-colors', i < step ? 'bg-black' : i === step ? 'bg-rojo' : 'bg-[#D5DEE6] group-hover:bg-[#B5CBE0]')} />
              <span className={cn('hidden text-xs font-semibold sm:block', i === step ? 'text-black' : 'text-gris-2')}>{s}</span>
            </button>
          ))}
        </nav>

        <section className="flex flex-col gap-6 rounded-2xl border-2 border-black bg-white p-5 shadow-[6px_6px_0_#000] sm:p-8">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="text-2xl font-extrabold">{STEPS[step]}</h2>
            <span className="text-sm font-semibold whitespace-nowrap text-gris-2 tabular-nums">
              Paso {step + 1} de {STEPS.length}
            </span>
          </div>

          {step === 0 && (
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label="Nombre completo" htmlFor="fullName" className="sm:col-span-2" hint="Como quieres que aparezca: nombres y apellidos.">
                <Input id="fullName" value={form.fullName} onChange={(e) => set({ fullName: e.target.value })} autoComplete="name" />
              </Field>
              {!isDocente && (
                <Field label="Semestre" htmlFor="semester">
                  <Select value={form.semester} onValueChange={(v) => set({ semester: v })}>
                    <SelectTrigger id="semester">
                      <SelectValue placeholder="Elige tu semestre" />
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
              <Field label="Rol en el semillero" htmlFor="roleTitle" hint="Si no tienes uno especial, deja «Integrante».">
                <Input id="roleTitle" value={form.roleTitle} onChange={(e) => set({ roleTitle: e.target.value })} maxLength={60} />
              </Field>
              <Field label={isDocente ? 'Diriges SINDES desde' : 'Entraste a SINDES en'} className="sm:col-span-2">
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
              <Field label="Preséntate en pocas líneas" htmlFor="bio" className="sm:col-span-2" hint="Qué estudias, qué te gusta construir y qué aportas al semillero.">
                <CountedTextarea id="bio" value={form.bio} onChange={(v) => set({ bio: v })} max={600} rows={4} />
              </Field>
              <Field label="Intereses de investigación" htmlFor="interests" className="sm:col-span-2" hint="Por ejemplo: automatización con n8n, visión por computador, IA en empresas.">
                <CountedTextarea id="interests" value={form.interests} onChange={(v) => set({ interests: v })} max={300} rows={2} />
              </Field>
            </div>
          )}

          {step === 1 && (
            <div className="flex flex-col items-start gap-6 sm:flex-row">
              <Portrait name={form.fullName || '?'} url={m.photoUrl} bg="#1B4B9B" className="cut-tr-56 aspect-[4/5] w-full max-w-[220px] shrink-0" position="50% 30%" textClass="text-7xl" />
              <div className="flex flex-col gap-4">
                <p className="text-[17px] leading-relaxed text-gris">Una foto tuya de frente, con buena luz y fondo sencillo. Después de elegirla la puedes acomodar.</p>
                <ul className="flex list-disc flex-col gap-1 pl-5 text-sm text-gris-2">
                  <li>Que se vea tu cara completa.</li>
                  <li>Sin gafas oscuras ni filtros.</li>
                  <li>JPG, PNG o WebP.</li>
                </ul>
                <PhotoPicker label={m.photoUrl ? 'Cambiar foto' : 'Subir foto'} busy={photo.isPending} onCropped={(b) => photo.mutateAsync(b).then(() => undefined)} />
                {photo.error && <p className="text-sm font-medium text-rojo-texto">{errorText(photo.error)}</p>}
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="flex flex-col gap-4">
              <p className="text-gris">Marca los proyectos en los que trabajas y cuenta qué haces en cada uno.</p>
              {q.data.projects.map((p) => {
                const sel = form.projects.find((x) => x.projectId === p.id);
                return (
                  <div key={p.id} className={cn('flex flex-col gap-3 rounded-xl border-2 p-4 transition-colors', sel ? 'border-black bg-hielo' : 'border-linea')}>
                    <label className="flex cursor-pointer items-center gap-3 text-lg font-bold">
                      <Checkbox
                        checked={!!sel}
                        onCheckedChange={(c) => set({ projects: c ? [...form.projects, { projectId: p.id, role: '' }] : form.projects.filter((x) => x.projectId !== p.id) })}
                      />
                      {p.name}
                    </label>
                    {sel && (
                      <Input
                        aria-label={`Tu rol en ${p.name}`}
                        placeholder="Tu rol: por ejemplo, Responsable del módulo de Calidad"
                        value={sel.role}
                        maxLength={80}
                        onChange={(e) => set({ projects: form.projects.map((x) => (x.projectId === p.id ? { ...x, role: e.target.value } : x)) })}
                      />
                    )}
                  </div>
                );
              })}
              {!q.data.projects.length && <p className="text-gris-2">Todavía no hay proyectos cargados. Puedes seguir con el siguiente paso.</p>}
            </div>
          )}

          {step === 3 && (
            <div className="flex flex-col gap-4">
              <p className="text-gris">
                Elige las tecnologías que manejas. <span className="font-semibold text-black">{form.technologyIds.length} elegidas.</span>
              </p>
              <TechPicker all={q.data.technologies} selected={form.technologyIds} onChange={(ids) => set({ technologyIds: ids })} />
            </div>
          )}

          {step === 4 && (
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-3">
                <h3 className="text-lg font-bold">Formación</h3>
                <RowsEditor<Education>
                  rows={form.education}
                  onChange={(education) => set({ education })}
                  columns={[
                    { key: 'title', label: 'Título o carrera', placeholder: 'Ingeniería de Software', width: '1.4fr' },
                    { key: 'institution', label: 'Institución', placeholder: 'FESC' },
                    { key: 'period', label: 'Periodo', placeholder: '2023 – en curso', width: '0.9fr' },
                  ]}
                  blank={{ title: '', institution: '', period: '' }}
                  empty="Agrega tu carrera y, si tienes, otros estudios (técnico, tecnólogo…)."
                  addLabel="Agregar estudio"
                  max={6}
                />
              </div>
              <div className="flex flex-col gap-3">
                <h3 className="text-lg font-bold">Participaciones y logros</h3>
                <RowsEditor<Achievement>
                  rows={form.achievements}
                  onChange={(achievements) => set({ achievements })}
                  columns={[
                    { key: 'title', label: 'Qué lograste', placeholder: '2.º puesto en la competencia de PPA', width: '1.6fr' },
                    { key: 'detail', label: 'Detalle', placeholder: 'Con el proyecto SICAF' },
                    { key: 'date', label: 'Año', placeholder: '2026', width: '0.6fr' },
                  ]}
                  blank={{ title: '', detail: '', date: '' }}
                  empty="Ponencias, ferias, concursos, certificados… Si aún no tienes, déjalo vacío."
                  addLabel="Agregar logro"
                  max={10}
                />
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                <Field label="Correo institucional" htmlFor="email" className="sm:col-span-2" hint="Es el único correo que se muestra. Debe terminar en @fesc.edu.co.">
                  <Input id="email" type="email" inputMode="email" value={form.email} onChange={(e) => set({ email: e.target.value })} placeholder="est_ab_apellido@fesc.edu.co" autoComplete="email" />
                </Field>
                <Field label="GitHub (opcional)" htmlFor="gh">
                  <Input id="gh" value={form.githubUrl} onChange={(e) => set({ githubUrl: e.target.value })} placeholder="https://github.com/tu-usuario" inputMode="url" />
                </Field>
                <Field label="LinkedIn (opcional)" htmlFor="li">
                  <Input id="li" value={form.linkedinUrl} onChange={(e) => set({ linkedinUrl: e.target.value })} placeholder="https://linkedin.com/in/tu-usuario" inputMode="url" />
                </Field>
              </div>
              <label className="flex cursor-pointer items-start gap-3 rounded-xl border-2 border-black bg-hielo p-4">
                <Checkbox checked={form.consent} onCheckedChange={(c) => set({ consent: c === true })} className="mt-0.5" />
                <span className="text-sm leading-relaxed">
                  Autorizo a SINDES a publicar en su página mi nombre, foto, correo institucional, redes y la información de este formulario, para dar a conocer el semillero. Sé que puedo pedir que la
                  cambien o la quiten cuando quiera (Ley 1581 de 2012).
                </span>
              </label>
              {missing.length > 0 && <p className="text-sm font-medium text-rojo-texto">Para enviar te falta: {missing.join(', ')}.</p>}
              {submit.error && <p className="text-sm font-medium text-rojo-texto">{errorText(submit.error)}</p>}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-linea pt-5">
            <Button type="button" variant="ghost" onClick={() => go(step - 1)} disabled={step === 0 || save.isPending}>
              <ArrowLeft /> Atrás
            </Button>
            <span className="order-last w-full text-center text-xs text-gris-2 sm:order-none sm:w-auto" aria-live="polite">
              {save.isPending ? 'Guardando…' : dirty ? 'Cambios sin guardar' : 'Todo guardado'}
            </span>
            {step < STEPS.length - 1 ? (
              <Button type="button" onClick={() => go(step + 1)} disabled={save.isPending}>
                {save.isPending && <Loader2 className="animate-spin" />}
                Guardar y seguir <ArrowRight />
              </Button>
            ) : (
              <Button type="button" variant="brand" size="lg" onClick={() => submit.mutate(form)} disabled={submit.isPending || missing.length > 0}>
                {submit.isPending ? <Loader2 className="animate-spin" /> : <Send />}
                {m.status === 'published' ? 'Guardar cambios' : 'Enviar a revisión'}
              </Button>
            )}
          </div>
        </section>
      </div>
    </Shell>
  );
}
