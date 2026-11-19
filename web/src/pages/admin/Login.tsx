import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { api, errorText } from '@/lib/api';
import { useDocumentTitle } from '@/lib/hooks';
import type { SessionUser } from '@/lib/types';

export default function Login() {
  useDocumentTitle('Entrar · Panel SINDES');
  const qc = useQueryClient();
  const nav = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from ?? '/admin';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [show, setShow] = useState(false);
  const login = useMutation({
    mutationFn: () => api.post<SessionUser>('/auth/login', { email, password }),
    onSuccess: (u) => {
      qc.setQueryData(['me'], u);
      nav(from.startsWith('/admin/login') ? '/admin' : from, { replace: true });
    },
  });

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <div className="relative hidden overflow-hidden bg-azul lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="flex items-center gap-4">
          <img src="/img/logo-fesc.webp" alt="FESC" className="h-11 w-auto" />
          <span aria-hidden="true" className="h-9 w-px bg-white/55" />
          <img src="/img/logo-ingenieria-software.svg" alt="Ingeniería de Software" className="h-12 w-auto" />
        </div>
        <div className="flex flex-col gap-6">
          <img src="/img/logo-sindes.png" alt="SINDES" className="h-36 w-auto self-start" />
          <p className="max-w-md text-[clamp(28px,2.6vw,40px)] leading-[1.05] font-black text-white italic">El panel donde se cuida la página del semillero.</p>
        </div>
        <div aria-hidden="true" className="absolute -right-16 -bottom-16 size-72 rotate-12 rounded-[48px] bg-rojo" />
        <div aria-hidden="true" className="absolute right-24 -bottom-24 size-56 -rotate-6 rounded-[40px] bg-black" />
      </div>

      <div className="flex items-center justify-center bg-white px-6 py-12">
        <form
          className="flex w-full max-w-sm flex-col gap-6"
          onSubmit={(e) => {
            e.preventDefault();
            login.mutate();
          }}
        >
          <img src="/img/logo-sindes.png" alt="SINDES" className="h-20 w-auto self-start rounded-xl bg-azul p-2 lg:hidden" />
          <div className="flex flex-col gap-2">
            <h1 className="text-4xl font-black italic">Entrar al panel</h1>
            <p className="text-gris-2">Solo para quienes administran la página.</p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="email">Correo</Label>
            <Input id="email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="password">Contraseña</Label>
            <div className="relative">
              <Input id="password" type={show ? 'text' : 'password'} autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required className="pr-12" />
              <button
                type="button"
                onClick={() => setShow((s) => !s)}
                className="absolute top-1/2 right-1.5 flex size-8 -translate-y-1/2 cursor-pointer items-center justify-center rounded-md text-gris-2 hover:bg-hielo hover:text-black"
                aria-label={show ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </div>
          </div>
          {login.error && (
            <p role="alert" className="rounded-lg border-l-4 border-rojo bg-[#FBE3E1] px-3 py-2.5 text-sm font-medium text-rojo-texto">
              {errorText(login.error)}
            </p>
          )}
          <Button type="submit" size="lg" disabled={login.isPending}>
            {login.isPending && <Loader2 className="animate-spin" />}
            Entrar
          </Button>
          <a href="/" className="text-sm font-semibold text-marino hover:text-black">
            Volver a la página del semillero
          </a>
        </form>
      </div>
    </div>
  );
}
