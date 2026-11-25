import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, FolderKanban, Images, KeyRound, LayoutDashboard, Link2, LogOut, Menu, PenLine, Shapes, Users, X } from 'lucide-react';
import { lazy, Suspense, useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router';
import { api, ApiError } from '@/lib/api';
import type { SessionUser } from '@/lib/types';
import { cn } from '@/lib/utils';
import Access from './Access';
import Login from './Login';
import { Spinner } from './ui';

const Dashboard = lazy(() => import('./Dashboard'));
const Members = lazy(() => import('./Members'));
const MemberEditor = lazy(() => import('./MemberEditor'));
const Invitations = lazy(() => import('./Invitations'));
const Projects = lazy(() => import('./Projects'));
const ProjectEditor = lazy(() => import('./ProjectEditor'));
const Content = lazy(() => import('./Content'));
const Gallery = lazy(() => import('./Gallery'));
const Technologies = lazy(() => import('./Technologies'));
const Account = lazy(() => import('./Account'));

export type Summary = { draft: number; pending: number; published: number; hidden: number; total: number };

export function useMe() {
  return useQuery({
    queryKey: ['me'],
    queryFn: () => api.get<SessionUser>('/auth/me'),
    retry: false,
    staleTime: 5 * 60_000,
  });
}

export const useSummary = () => useQuery({ queryKey: ['admin', 'summary'], queryFn: () => api.get<Summary>('/admin/members/summary') });

const NAV = [
  { to: '/admin', label: 'Resumen', icon: LayoutDashboard, end: true },
  { to: '/admin/integrantes', label: 'Integrantes', icon: Users, badge: true },
  { to: '/admin/invitar', label: 'Invitar', icon: Link2 },
  { to: '/admin/proyectos', label: 'Proyectos', icon: FolderKanban },
  { to: '/admin/contenido', label: 'Textos de la página', icon: PenLine },
  { to: '/admin/galeria', label: 'Fotos del semillero', icon: Images },
  { to: '/admin/tecnologias', label: 'Tecnologías', icon: Shapes },
  { to: '/admin/cuenta', label: 'Mi cuenta', adminLabel: 'Cuentas y acceso', icon: KeyRound },
];

function Sidebar({ user, onNavigate }: { user: SessionUser; onNavigate?: () => void }) {
  const qc = useQueryClient();
  const nav = useNavigate();
  const { data: summary } = useSummary();
  const logout = async () => {
    await api.post('/auth/logout').catch(() => undefined);
    qc.clear();
    nav('/admin/login', { replace: true });
  };

  return (
    <div className="flex h-full flex-col gap-6 bg-black px-4 py-5 text-white">
      <div className="flex items-center gap-3 px-2">
        <img src="/img/logo-sindes.png" alt="" className="h-10 w-auto" />
        <span className="text-sm leading-tight font-semibold text-white/70">
          Panel de
          <br />
          administración
        </span>
      </div>
      <nav aria-label="Panel" className="flex flex-col gap-1">
        {NAV.map((n) => (
          <NavLink
            key={n.to}
            to={n.to}
            end={n.end}
            onClick={onNavigate}
            className={({ isActive }) =>
              cn(
                'relative flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-semibold text-white/75 no-underline transition-colors hover:bg-white/10 hover:text-white',
                isActive && 'bg-white text-black hover:bg-white hover:text-black',
              )
            }
          >
            {({ isActive }) => (
              <>
                {isActive && <span aria-hidden="true" className="absolute top-2 bottom-2 -left-4 w-1.5 rounded-r-full bg-rojo" />}
                <n.icon className="size-[18px] shrink-0" />
                <span className="flex-1">{user.role === 'admin' && 'adminLabel' in n ? n.adminLabel : n.label}</span>
                {n.badge && !!summary?.pending && (
                  <span className="rounded-full bg-rojo px-2 py-0.5 text-xs font-bold text-white" aria-label={`${summary.pending} por revisar`}>
                    {summary.pending}
                  </span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>
      <div className="mt-auto flex flex-col gap-2 border-t border-white/15 pt-4">
        <a href="/" target="_blank" rel="noreferrer" className="flex min-h-10 items-center gap-3 rounded-xl px-3 text-sm font-semibold text-white/75 no-underline hover:bg-white/10 hover:text-white">
          <ExternalLink className="size-4" /> Ver la página
        </a>
        <div className="flex items-center gap-3 rounded-xl bg-white/8 px-3 py-2.5">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-azul text-sm font-bold text-black">{user.name.charAt(0).toUpperCase()}</span>
          <span className="flex min-w-0 flex-1 flex-col">
            <span className="truncate text-sm font-semibold">{user.name}</span>
            <span className="truncate text-xs text-white/60">{user.role === 'admin' ? 'Administración' : 'Edición'}</span>
          </span>
          <button type="button" onClick={logout} className="flex size-9 cursor-pointer items-center justify-center rounded-lg text-white/70 hover:bg-white/10 hover:text-white" aria-label="Salir">
            <LogOut className="size-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Layout() {
  const me = useMe();
  const loc = useLocation();
  const [open, setOpen] = useState(false);
  useEffect(() => setOpen(false), [loc.pathname]);

  if (me.isLoading) return <Spinner />;
  if (me.error instanceof ApiError && me.error.status === 401) return <Navigate to="/admin/login" replace state={{ from: loc.pathname }} />;
  if (!me.data) return <Navigate to="/admin/login" replace />;

  return (
    <div className="min-h-screen bg-[#F4F4F5] lg:grid lg:grid-cols-[264px_1fr]">
      <aside className="sticky top-0 hidden h-screen lg:block">
        <Sidebar user={me.data} />
      </aside>
      <div className="sticky top-0 z-40 flex items-center justify-between bg-black px-4 py-3 lg:hidden">
        <img src="/img/logo-sindes.png" alt="SINDES" className="h-9 w-auto" />
        <button type="button" onClick={() => setOpen(true)} className="flex size-10 cursor-pointer items-center justify-center rounded-full bg-white text-black" aria-label="Abrir menú">
          <Menu className="size-5" />
        </button>
      </div>
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Menú">
          <button type="button" className="absolute inset-0 bg-black/60" aria-label="Cerrar menú" onClick={() => setOpen(false)} />
          <div className="absolute inset-y-0 left-0 w-[86%] max-w-xs">
            <Sidebar user={me.data} onNavigate={() => setOpen(false)} />
            <button type="button" onClick={() => setOpen(false)} className="absolute top-4 -right-12 flex size-10 cursor-pointer items-center justify-center rounded-full bg-white text-black" aria-label="Cerrar menú">
              <X className="size-5" />
            </button>
          </div>
        </div>
      )}
      <main className="min-w-0 px-4 py-6 sm:px-8 sm:py-10">
        <div className="mx-auto max-w-6xl">
          <Suspense fallback={<Spinner />}>
            <Outlet context={me.data} />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

export default function AdminApp() {
  useEffect(() => {
    const prev = document.title;
    document.title = 'Panel · SINDES';
    return () => {
      document.title = prev;
    };
  }, []);
  return (
    <Routes>
      <Route path="login" element={<Login />} />
      <Route path="acceso/:token" element={<Access />} />
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="integrantes" element={<Members />} />
        <Route path="integrantes/nuevo" element={<MemberEditor />} />
        <Route path="integrantes/:id" element={<MemberEditor />} />
        <Route path="invitar" element={<Invitations />} />
        <Route path="proyectos" element={<Projects />} />
        <Route path="proyectos/nuevo" element={<ProjectEditor />} />
        <Route path="proyectos/:id" element={<ProjectEditor />} />
        <Route path="contenido" element={<Content />} />
        <Route path="galeria" element={<Gallery />} />
        <Route path="tecnologias" element={<Technologies />} />
        <Route path="cuenta" element={<Account />} />
        <Route path="*" element={<Navigate to="/admin" replace />} />
      </Route>
    </Routes>
  );
}
