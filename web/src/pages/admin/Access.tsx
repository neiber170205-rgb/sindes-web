import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router';
import { Field } from '@/components/forms';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { api, ApiError, errorText } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import type { SessionUser } from '@/lib/types';
import { Spinner } from './ui';

type Info = { name: string; email: string; role: 'admin' | 'editor'; firstTime: boolean };

/** Página del link de acceso: la persona elige su contraseña y queda adentro del panel. */
export default function Access() {
  const { token = '' } = useParams();
  useDocumentTitle('Acceso al panel · SINDES');
  const qc = useQueryClient();
  const nav = useNavigate();
  const info = useQuery({ queryKey: ['access', token], queryFn: () => api.get<Info>(`/auth/access/${token}`), retry: false });
  const [password, setPassword] = useState('');
  const [again, setAgain] = useState('');
  const [show, setShow] = useState(false);
  const save = useMutation({
    mutationFn: () => api.post<SessionUser>(`/auth/access/${token}`, { password }),
    onSuccess: (u) => {
      qc.setQueryData(['me'], u);
      nav('/admin', { replace: true });
    },
  });
  const mismatch = again.length > 0 && password !== again;

  return (
    <div className="flex min-h-screen items-center justify-center bg-azul px-5 py-12">
      <div className="flex w-full max-w-md flex-col gap-6 rounded-2xl border-2 border-black bg-white p-7 shadow-[8px_8px_0_#000] sm:p-9">
        <img src="/img/logo-sindes.png" alt="SINDES" className="h-16 w-auto self-start rounded-xl bg-azul p-2" />
        {info.isLoading ? (
          <Spinner />
        ) : info.error || !info.data ? (
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-black italic">Este link no funciona.</h1>
            <p className="text-gris">{info.error instanceof ApiError ? info.error.message : 'No pudimos abrirlo.'}</p>
            <p className="text-sm text-gris-2">Pide un link nuevo a quien administra el panel. Si ya tienes contraseña, entra normal.</p>
            <Button asChild variant="outline" className="self-start">
              <Link to="/admin/login">Ir a entrar</Link>
            </Button>
          </div>
        ) : (
          <form
            className="flex flex-col gap-5"
            onSubmit={(e) => {
              e.preventDefault();
              save.mutate();
            }}
          >
            <div className="flex flex-col gap-2">
              <h1 className="text-[clamp(28px,4vw,36px)] leading-tight font-black italic">
                {info.data.firstTime ? `Hola, ${info.data.name.split(' ')[0]}.` : 'Nueva contraseña'}
              </h1>
              <p className="text-gris">
                {info.data.firstTime
                  ? `Te dieron acceso al panel de la página de SINDES${info.data.role === 'admin' ? ' como administración' : ''}. Elige tu contraseña para entrar.`
                  : 'Elige una contraseña nueva. Al guardarla se cierran las sesiones abiertas en otros equipos.'}
              </p>
            </div>
            <Field label="Correo para entrar">
              <Input value={info.data.email} readOnly autoComplete="username" className="bg-muted" />
            </Field>
            <Field label="Contraseña" htmlFor="pw" hint="Mínimo 10 caracteres. Una frase corta funciona bien.">
              <div className="relative">
                <Input id="pw" type={show ? 'text' : 'password'} autoComplete="new-password" minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-12" autoFocus />
                <button
                  type="button"
                  onClick={() => setShow((s) => !s)}
                  className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-gris-2 hover:bg-hielo hover:text-black"
                  aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                >
                  {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </Field>
            <Field label="Repítela" htmlFor="pw2" hint={mismatch ? <span className="text-rojo-texto">No coinciden.</span> : undefined}>
              <Input id="pw2" type={show ? 'text' : 'password'} autoComplete="new-password" value={again} onChange={(e) => setAgain(e.target.value)} required aria-invalid={mismatch} />
            </Field>
            {save.error && (
              <p role="alert" className="rounded-lg border-l-4 border-rojo bg-[#FBE3E1] px-3 py-2.5 text-sm font-medium text-rojo-texto">
                {errorText(save.error)}
              </p>
            )}
            <Button type="submit" size="lg" disabled={save.isPending || mismatch || password.length < 10 || password !== again}>
              {save.isPending && <Loader2 className="animate-spin" />}
              Guardar y entrar
            </Button>
          </form>
        )}
      </div>
    </div>
  );
}
