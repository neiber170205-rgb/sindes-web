import { useEffect, useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { useScrolledPast, useSite } from '@/lib/hooks';
import { cn } from '@/lib/utils';
import { ArrowUpIcon } from './bits';

const NAV = [
  { hash: 'semillero', label: 'El semillero' },
  { hash: 'lineas', label: 'Enfoques' },
  { hash: 'proyectos', label: 'Proyectos' },
  { hash: 'integrantes', label: 'Integrantes' },
];

function useHashScroll() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) {
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
      return;
    }
    // El contenido llega de la API: se reintenta hasta que la sección exista.
    let tries = 0;
    const id = setInterval(() => {
      const el = document.getElementById(hash.slice(1));
      if (el || ++tries > 40) {
        clearInterval(id);
        el?.scrollIntoView({ behavior: 'smooth' });
      }
    }, 50);
    return () => clearInterval(id);
  }, [pathname, hash]);
}

export function SiteHeader() {
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const onHome = pathname === '/';
  const href = (h: string) => (onHome ? `#${h}` : `/#${h}`);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div className="sticky top-0 z-50">
      <header className="bg-azul px-6 py-3">
        <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-x-7 gap-y-3">
          <Link to="/" className="flex flex-wrap items-center gap-x-[18px] gap-y-3.5" aria-label="SINDES, ir al inicio">
            <img src="/img/logo-fesc.webp" alt="FESC Educación Superior" className="block h-[clamp(40px,4vw,52px)] w-auto" />
            <span aria-hidden="true" className="h-9 w-px bg-white/55" />
            <img src="/img/logo-ingenieria-software.svg" alt="Ingeniería de Software" className="block h-[clamp(44px,4.4vw,58px)] w-auto" />
            <span aria-hidden="true" className="h-9 w-px bg-white/55" />
            <img src="/img/logo-sindes.png" alt="SINDES, Semillero de Investigación de Ingeniería de Software" className="block h-[clamp(46px,4.6vw,60px)] w-auto" />
          </Link>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label="Abrir o cerrar el menú"
            className="hidden size-12 cursor-pointer items-center justify-center rounded-full border-none bg-black max-[860px]:inline-flex"
          >
            <svg aria-hidden="true" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" strokeWidth="2.6" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
          <nav className={cn('nv flex flex-wrap items-center gap-x-[26px] gap-y-1.5 text-[19px] font-extrabold', open && 'open')} aria-label="Principal">
            {NAV.map((n) =>
              onHome ? (
                <a key={n.hash} href={href(n.hash)} onClick={() => setOpen(false)}>
                  {n.label}
                </a>
              ) : (
                <Link key={n.hash} to={href(n.hash)}>
                  {n.label}
                </Link>
              ),
            )}
            {onHome ? (
              <a className="cta" href="#unete" onClick={() => setOpen(false)}>
                Únete
              </a>
            ) : (
              <Link className="cta" to="/#unete">
                Únete
              </Link>
            )}
          </nav>
        </div>
      </header>
    </div>
  );
}

export function SiteFooter() {
  const { data } = useSite();
  const text = data?.content.footer.text || 'SINDES, semillero de investigación del programa de Ingeniería de Software de la FESC';
  return (
    <>
      <footer className="dk bg-black px-6 pt-[60px] pb-7">
        <div className="mx-auto flex max-w-[1240px] flex-col gap-10">
          <div className="flex flex-wrap items-center gap-5">
            <img src="/img/logo-fesc.webp" alt="FESC Educación Superior" className="block h-[68px] w-auto" />
            <img src="/img/logo-ingenieria-software.svg" alt="Ingeniería de Software" className="block h-[78px] w-auto" />
            <img src="/img/logo-sindes.png" alt="SINDES" className="block h-[88px] w-auto" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#333] pt-5">
            <p className="text-sm text-[#BDBDBD]">
              © {new Date().getFullYear()} {text}
            </p>
            <a
              className="totop inline-flex min-h-12 items-center gap-2.5 rounded-full bg-white pr-5 pl-2 text-[15px] font-bold text-black no-underline hover:text-black"
              href="#top"
              onClick={(e) => {
                e.preventDefault();
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
            >
              <span className="flex size-[34px] items-center justify-center rounded-full bg-black text-white">
                <ArrowUpIcon />
              </span>
              Volver arriba
            </a>
          </div>
        </div>
      </footer>
      <div aria-hidden="true" className="h-2.5" style={{ background: 'linear-gradient(90deg, #E1251B 0 50%, #3F95CB 50% 100%)' }} />
    </>
  );
}

function FloatingTop() {
  const show = useScrolledPast(700);
  if (!show) return null;
  return (
    <button
      type="button"
      aria-label="Volver arriba"
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      className="totop fu fixed right-5 bottom-5 z-[55] flex size-14 cursor-pointer items-center justify-center rounded-full border-none bg-black text-white shadow-[0_6px_18px_rgba(0,0,0,0.25)]"
    >
      <ArrowUpIcon />
    </button>
  );
}

export function SiteLayout() {
  useHashScroll();
  return (
    <div id="top" className="w-full bg-white">
      <div className="prog fixed top-0 left-0 z-[60] h-[5px] w-full origin-left bg-rojo" aria-hidden="true" />
      <SiteHeader />
      <Outlet />
      <FloatingTop />
      <SiteFooter />
    </div>
  );
}
