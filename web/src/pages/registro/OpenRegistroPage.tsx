import { useMutation, useQuery } from '@tanstack/react-query';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useNavigate, useParams } from 'react-router';
import { Field } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, ApiError, errorText } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import { Shell } from './Shell';

const FESC_EMAIL = /^[^\s@]+@fesc\.edu\.co$/i;

/**
 * Link general (uno para todo el grupo): la persona escribe su nombre y su correo,
 * se le crea su perfil y sigue en su link personal con el formulario de siempre.
 */
export default function OpenRegistroPage() {
  const { token = '' } = useParams();
  const navigate = useNavigate();
  useDocumentTitle('Tu perfil en SINDES');
  const check = useQuery({ queryKey: ['registro-abierto', token], queryFn: () => api.get<{ expiresAt: string }>(`/registro/abierto/${token}`), retry: false });
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');

  const start = useMutation({
    mutationFn: () => api.post<{ token: string }>(`/registro/abierto/${token}`, { fullName: fullName.trim().replace(/\s+/g, ' '), email: email.trim().toLowerCase() }),
    onSuccess: (r) => navigate(`/registro/${r.token}`, { replace: true, state: { nuevo: true } }),
  });

  if (check.isLoading) {
    return (
      <Shell>
        <div className="flex justify-center py-24" role="status" aria-label="Cargando">
          <Loader2 className="size-8 animate-spin" />
        </div>
      </Shell>
    );
  }
  if (check.error) {
    const msg = check.error instanceof ApiError ? check.error.message : 'No pudimos abrir el formulario.';
    return (
      <Shell>
        <div className="flex flex-col gap-4 rounded-2xl border-2 border-black bg-white p-8 shadow-[6px_6px_0_#E1251B]">
          <h1 className="text-3xl font-black italic">Este link no funciona.</h1>
          <p className="text-lg text-gris">{msg}</p>
          <p className="text-gris-2">Pide el link nuevo a quien administra la página del semillero.</p>
        </div>
      </Shell>
    );
  }

  const nameOk = fullName.trim().length >= 5;
  const emailOk = FESC_EMAIL.test(email.trim());

  return (
    <Shell>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <p className="font-semibold text-marino">Hola, integrante de SINDES.</p>
          <h1 className="text-[clamp(30px,5vw,46px)] leading-[1.02] font-black tracking-[-0.015em] italic">Arma tu perfil en la página.</h1>
          <p className="max-w-xl text-[17px] text-gris">
            Empieza con tu nombre y tu correo institucional. Después llenas el resto y subes tu foto; quien administra la página lo revisa antes de publicarlo.
          </p>
        </div>

        <form
          className="flex flex-col gap-5 rounded-2xl border-2 border-black bg-white p-6 shadow-[6px_6px_0_#3F95CB] sm:p-8"
          onSubmit={(e) => {
            e.preventDefault();
            if (nameOk && emailOk) start.mutate();
          }}
        >
          <Field label="Nombre completo" htmlFor="fullName" hint="Así aparece en la página.">
            <Input id="fullName" autoComplete="name" value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="Nombres y apellidos" maxLength={120} required />
          </Field>
          <Field label="Correo institucional" htmlFor="email" hint="Solo se aceptan correos @fesc.edu.co. Es el único dato de contacto que se muestra.">
            <Input
              id="email"
              type="email"
              autoComplete="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu_usuario@fesc.edu.co"
              aria-invalid={email.trim() !== '' && !emailOk}
              required
            />
          </Field>
          {start.error && (
            <p role="alert" className="rounded-xl border-2 border-black bg-[#FFF1D6] px-4 py-3 text-sm font-medium">
              {errorText(start.error)}
            </p>
          )}
          <Button type="submit" size="lg" disabled={!nameOk || !emailOk || start.isPending} className="self-start">
            {start.isPending ? <Loader2 className="animate-spin" /> : <ArrowRight />}
            Empezar
          </Button>
        </form>

        <p className="text-sm text-gris-2">¿Ya habías empezado? Entra con tu link personal (el que guardaste) para no crear tu perfil dos veces.</p>
      </div>
    </Shell>
  );
}
