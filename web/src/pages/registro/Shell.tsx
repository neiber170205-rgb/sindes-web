/** Marco de las páginas de registro: logos arriba y el contenido centrado. */
export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-hielo">
      <header className="bg-azul px-5 py-3">
        <div className="mx-auto flex max-w-3xl items-center gap-4">
          <img src="/img/logo-fesc.webp" alt="FESC" className="h-9 w-auto" />
          <span aria-hidden="true" className="h-7 w-px bg-white/55" />
          <img src="/img/logo-ingenieria-software.svg" alt="Ingeniería de Software" className="h-10 w-auto" />
          <span aria-hidden="true" className="h-7 w-px bg-white/55" />
          <img src="/img/logo-sindes.png" alt="SINDES" className="h-11 w-auto" />
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-12">{children}</main>
    </div>
  );
}
