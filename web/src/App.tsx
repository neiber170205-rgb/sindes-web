import { lazy, Suspense } from 'react';
import { BrowserRouter, Route, Routes } from 'react-router';
import { SiteLayout } from '@/components/site/SiteLayout';
import Home from '@/pages/site/Home';
import MemberPage from '@/pages/site/MemberPage';
import ProjectPage from '@/pages/site/ProjectPage';
import { NotFound } from '@/pages/site/States';

const Registro = lazy(() => import('@/pages/registro/RegistroPage'));
const AdminApp = lazy(() => import('@/pages/admin/AdminApp'));

function Loading() {
  return <div className="flex min-h-screen items-center justify-center text-sm text-gris-2">Cargando…</div>;
}

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route element={<SiteLayout />}>
            <Route index element={<Home />} />
            <Route path="proyectos/:slug" element={<ProjectPage />} />
            <Route path="integrantes/:slug" element={<MemberPage />} />
            <Route path="*" element={<NotFound />} />
          </Route>
          <Route path="registro/:token" element={<Registro />} />
          <Route path="admin/*" element={<AdminApp />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
