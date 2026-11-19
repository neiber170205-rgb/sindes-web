import { Link } from 'react-router';

export function PageLoading() {
  return (
    <div className="flex min-h-[70vh] items-center justify-center bg-azul" role="status" aria-label="Cargando">
      <img src="/img/logo-sindes.png" alt="" className="h-24 w-auto animate-pulse" />
    </div>
  );
}

export function PageError({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 bg-hielo px-6 text-center">
      <h1 className="text-[clamp(28px,3.4vw,44px)] font-black italic">No pudimos cargar la página.</h1>
      <p className="max-w-md text-lg text-gris">Revisa tu conexión y vuelve a intentarlo.</p>
      <button type="button" onClick={onRetry} className="bt btk min-h-[50px] cursor-pointer rounded-full border-none bg-black px-6 font-bold text-white">
        Intentar de nuevo
      </button>
    </div>
  );
}

export function NotFound({ what = 'Esta dirección' }: { what?: string }) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 bg-hielo px-6 text-center">
      <span className="text-[clamp(80px,12vw,160px)] leading-none font-black text-rojo italic">404</span>
      <h1 className="text-[clamp(26px,3vw,40px)] font-black italic">{what} no existe o no está en la página.</h1>
      <Link to="/" className="bt btk inline-flex min-h-[50px] items-center rounded-full bg-black px-6 font-bold text-white no-underline hover:text-white">
        Volver al inicio
      </Link>
    </div>
  );
}
