import { useState } from 'react';
import { RoundArrow } from '@/components/site/bits';
import { useReducedMotion, useTicker } from '@/lib/hooks';
import type { FocusKey, GalleryPhoto, SiteContent } from '@/lib/types';

function PhotoSlider({ photos }: { photos: GalleryPhoto[] }) {
  const reduce = useReducedMotion();
  const [i, setI] = useState(0);
  const [stopped, setStopped] = useState(false);
  const [hover, setHover] = useState(false);
  const n = photos.length;
  const running = !reduce && !stopped && !hover && n > 1;
  useTicker(() => setI((x) => (x + 1) % n), 5000, running);
  const go = (k: number) => {
    setI(((k % n) + n) % n);
    setStopped(true);
  };
  if (!n) return null;
  const cur = photos[i];

  return (
    <div className="s s-r d2 flex max-w-[620px] min-w-0 flex-[1.2_1_420px] flex-col gap-3" onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>
      <div className="relative">
        <div aria-hidden="true" className="cut-tr-64 absolute inset-0 translate-x-3.5 translate-y-3.5 bg-azul" />
        <div role="region" aria-roledescription="carrusel" aria-label="Fotos del semillero" className="cut-tr-64 relative aspect-[3/2] overflow-hidden bg-black">
          <div key={cur.id} className="slide absolute inset-0">
            <img className={`kb${i % 3} absolute inset-0 size-full object-cover`} src={cur.url} alt={cur.alt || cur.caption || 'Foto del semillero'} />
            {cur.caption && <span className="cap absolute bottom-4 left-4 rounded-full bg-black px-3.5 py-2 text-[15px] font-bold text-white">{cur.caption}</span>}
          </div>
        </div>
      </div>
      {n > 1 && (
        <div className="flex items-center gap-3 pt-2">
          <RoundArrow dir="prev" label="Foto anterior" onClick={() => go(i - 1)} />
          <div className="flex flex-1 gap-2">
            {photos.map((p, k) => (
              <button
                key={p.id}
                type="button"
                onClick={() => go(k)}
                aria-label={`Ver foto ${k + 1}${p.caption ? `: ${p.caption}` : ''}`}
                aria-pressed={k === i}
                className="relative h-11 flex-1 cursor-pointer border-none bg-transparent p-0"
              >
                <span aria-hidden="true" className="absolute inset-x-0 top-[19px] h-1.5 overflow-hidden rounded-[3px] bg-[#D5DEE6]">
                  {k === i &&
                    (stopped || reduce ? (
                      <span className="absolute inset-0 bg-rojo" />
                    ) : (
                      <span key={i} className="fbar absolute inset-0 origin-left bg-rojo" style={{ animationPlayState: running ? 'running' : 'paused' }} />
                    ))}
                </span>
              </button>
            ))}
          </div>
          <RoundArrow dir="next" label="Foto siguiente" onClick={() => go(i + 1)} />
        </div>
      )}
    </div>
  );
}

export function Semillero({ content, gallery }: { content: SiteContent; gallery: GalleryPhoto[] }) {
  const { semillero, steps } = content;
  const pillars = [
    { title: 'Misión', body: semillero.mission, color: 'border-rojo' },
    { title: 'Visión', body: semillero.vision, color: 'border-azul' },
  ].filter((p) => p.body?.trim());

  return (
    <section id="semillero" className="overflow-hidden bg-white px-6 py-[clamp(64px,8vw,104px)]">
      <div className="mx-auto flex max-w-[1240px] flex-col gap-[clamp(56px,7vw,96px)]">
        <div className="rv flex flex-wrap items-center gap-x-16 gap-y-12">
          <div className="flex min-w-0 flex-[1.3_1_480px] flex-col gap-[26px]">
            <h2 className="s s-wipe pr-[0.12em] text-[clamp(32px,4.3vw,60px)] leading-[1.02] font-black tracking-[-0.015em] italic">{semillero.title}</h2>
            <p className="s s-up d2 max-w-[34em] text-[clamp(18px,1.6vw,21px)] leading-[1.55] text-tinta">{semillero.body}</p>
            {pillars.length > 0 && (
              <div className="s s-up d3 grid grid-cols-[repeat(auto-fit,minmax(min(230px,100%),1fr))] gap-6">
                {pillars.map((p) => (
                  <div key={p.title} className={`flex flex-col gap-2 border-t-[5px] pt-4 ${p.color}`}>
                    <h3 className="text-[22px] font-extrabold">{p.title}</h3>
                    <p className="text-base leading-[1.55] text-gris">{p.body}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <PhotoSlider photos={gallery} />
        </div>

        {steps.length > 0 && (
          <div className="rv flex flex-col gap-[30px]">
            <h3 className="s s-up text-[clamp(24px,2.6vw,34px)] font-extrabold italic">Así crece un proyecto aquí</h3>
            <div className="relative">
              <div className="absolute top-[18px] left-5 h-1 bg-[#D5DEE6] max-[999px]:hidden" aria-hidden="true" style={{ right: `calc(${100 / steps.length}% - 38px)` }}>
                <div className="s s-grow absolute inset-0 origin-left bg-black" />
                <div className="runner absolute -top-[5px] -ml-[7px] size-3.5 rounded-full bg-rojo" />
              </div>
              <ol className="relative m-0 grid list-none grid-cols-[repeat(auto-fit,minmax(min(220px,100%),1fr))] gap-x-6 gap-y-7 p-0">
                {steps.map((st, k) => (
                  <li key={k} className="flex flex-col gap-3">
                    <span
                      className={`s s-pop d${Math.min(k + 1, 6)} flex size-10 items-center justify-center rounded-full text-lg font-extrabold text-white ${k === steps.length - 1 ? 'bg-rojo' : 'bg-black'}`}
                    >
                      {k + 1}
                    </span>
                    <div className={`s s-up d${Math.min(k + 1, 6)} flex flex-col gap-1.5`}>
                      <h4 className="text-[21px] font-extrabold">{st.title}</h4>
                      <p className="text-base leading-normal text-gris">{st.body}</p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------------- Enfoques ---------------- */

function InnoArt() {
  const grid: [number, number][] = [];
  for (const y of [27, 79, 131]) for (const x of [80, 132, 184, 236, 288]) if (!(x === 236 && y === 79)) grid.push([x, y]);
  return (
    <svg role="img" aria-label="Una cuadrícula de piezas iguales donde una se transforma" viewBox="0 0 400 190" className="block h-auto w-full">
      <g fill="#B5CBE0">
        {grid.map(([x, y]) => (
          <rect key={`${x}-${y}`} x={x} y={y} width="32" height="32" rx="7" />
        ))}
      </g>
      <circle className="innoring" cx="252" cy="95" r="24" fill="none" stroke="#E1251B" strokeWidth="2.5" />
      <rect className="inno" x="236" y="79" width="32" height="32" rx="7" fill="#B5CBE0" />
    </svg>
  );
}

function OptArt() {
  const zig = 'M50 60L95 24L140 96L185 24L230 96L275 24L320 96L350 60';
  return (
    <svg role="img" aria-label="Dos rutas al mismo punto: la de antes da vueltas y la de ahora va directo" viewBox="0 0 400 190" className="block h-auto w-full">
      <path d={zig} fill="none" stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      <path className="pulse-line" d={zig} fill="none" stroke="#FFFFFF" strokeWidth="6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M50 150H350" fill="none" stroke="#3F95CB" strokeWidth="3.5" strokeLinecap="round" />
      <path className="pulse-line" d="M50 150H350" fill="none" stroke="#E1251B" strokeWidth="7" strokeLinecap="round" />
      <g fill="#FFFFFF">
        <circle cx="50" cy="60" r="7" />
        <circle cx="350" cy="60" r="7" />
        <circle cx="50" cy="150" r="7" />
        <circle cx="350" cy="150" r="7" />
      </g>
      <g fontFamily="Rubik Variable, Rubik, sans-serif" fontSize="14" fontWeight="600" fill="#FFFFFF">
        <text x="6" y="42">Antes</text>
        <text x="6" y="132">Ahora</text>
      </g>
    </svg>
  );
}

function AutoArt() {
  return (
    <svg role="img" aria-label="Un flujo automático: disparador, proceso y resultado" viewBox="0 0 400 190" className="block h-auto w-full">
      <path d="M90 80H310" fill="none" stroke="#FFFFFF" strokeOpacity="0.35" strokeWidth="2.5" strokeDasharray="3 7" strokeLinecap="round" />
      <path className="pulse-line" style={{ animationDelay: '0.6s' }} d="M90 80H310" fill="none" stroke="#3F95CB" strokeWidth="6" strokeLinecap="round" />
      <g fill="#000000" stroke="#FFFFFF" strokeWidth="2.5">
        <rect x="30" y="50" width="60" height="60" rx="14" />
        <rect x="170" y="50" width="60" height="60" rx="14" />
        <rect x="310" y="50" width="60" height="60" rx="14" />
      </g>
      <path d="M65 64L53 83H61L56 97L68 77H60Z" fill="none" stroke="#3F95CB" strokeWidth="2.5" strokeLinejoin="round" />
      <circle className="spin-slow" cx="200" cy="80" r="14" fill="none" stroke="#FFFFFF" strokeWidth="3" strokeDasharray="6 5" />
      <circle cx="200" cy="80" r="3.5" fill="#FFFFFF" />
      <path className="chk" d="M327 81l9 9 17-19" fill="none" stroke="#E1251B" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <g fontFamily="Rubik Variable, Rubik, sans-serif" fontSize="14" fontWeight="600" fill="#FFFFFF" textAnchor="middle">
        <text x="60" y="140">Disparador</text>
        <text x="200" y="140">Proceso</text>
        <text x="340" y="140">Resultado</text>
      </g>
    </svg>
  );
}

function IaArt() {
  const L = [45, 95, 145];
  const M = [30, 73, 117, 160];
  const R = [70, 120];
  let d = '';
  for (const a of L) for (const b of M) d += `M70 ${a}L200 ${b}`;
  for (const b of M) for (const c of R) d += `M200 ${b}L330 ${c}`;
  return (
    <svg role="img" aria-label="Una red neuronal por la que viaja una señal" viewBox="0 0 400 190" className="block h-auto w-full">
      <path d={d} fill="none" stroke="#1B4B9B" strokeOpacity="0.3" strokeWidth="1.5" />
      <g fill="none" stroke="#1B4B9B" strokeWidth="4" strokeLinecap="round">
        <path className="pulse-line" d="M70 45L200 73" />
        <path className="pulse-line" style={{ animationDelay: '0.2s' }} d="M70 95L200 117" />
        <path className="pulse-line" style={{ animationDelay: '0.4s' }} d="M70 145L200 73" />
        <path className="pulse-line" style={{ animationDelay: '0.75s' }} d="M200 73L330 70" />
        <path className="pulse-line" style={{ animationDelay: '0.95s' }} d="M200 117L330 70" />
      </g>
      <g fill="#FFFFFF" stroke="#1B4B9B" strokeWidth="3">
        {L.map((y) => (
          <circle key={`l${y}`} cx="70" cy={y} r="11" />
        ))}
        {M.map((y) => (
          <circle key={`m${y}`} cx="200" cy={y} r="11" />
        ))}
        <circle className="fire" cx="330" cy="70" r="13" />
        <circle cx="330" cy="120" r="11" />
      </g>
    </svg>
  );
}

const FOCUS_STYLE: Record<FocusKey, { dark: boolean; art: () => React.ReactElement; anim: string }> = {
  innovacion: { dark: false, art: InnoArt, anim: 's-l' },
  optimizacion: { dark: true, art: OptArt, anim: 's-r' },
  automatizacion: { dark: true, art: AutoArt, anim: 's-l' },
  ia: { dark: false, art: IaArt, anim: 's-r' },
};

export function Focuses({ content }: { content: SiteContent }) {
  const { line, focuses } = content;
  return (
    <section id="lineas" className="dk overflow-hidden bg-marino px-6 py-[clamp(64px,8vw,104px)]">
      <div className="rv mx-auto flex max-w-[1240px] flex-col gap-11">
        <div className="flex max-w-[940px] flex-col gap-4">
          {line.kicker && <p className="s s-up text-lg font-semibold text-[#BFE0F5]">{line.kicker}</p>}
          <h2 className="s s-wipe d1 pr-[0.12em] text-[clamp(30px,4vw,56px)] leading-[1.04] font-black tracking-[-0.015em] text-white italic">{line.title}</h2>
          {line.intro && <p className="s s-up d2 text-[clamp(18px,1.6vw,21px)] leading-[1.55] text-[#E6EEF8]">{line.intro}</p>}
        </div>
        <div className="grid grid-cols-[repeat(auto-fit,minmax(min(420px,100%),1fr))] gap-6">
          {focuses.map((f, k) => {
            const st = FOCUS_STYLE[f.key];
            const Art = st.art;
            return (
              <article key={f.key} className={`s ${st.anim} d${k + 1} flex flex-col overflow-hidden rounded-[28px] ${st.dark ? 'bg-black text-white' : 'bg-white'}`}>
                <div className={st.dark ? 'border-b-[1.5px] border-[#333] p-[18px]' : 'bg-niebla p-[18px]'}>
                  <Art />
                </div>
                <div className="flex flex-col gap-2.5 px-[30px] pt-[26px] pb-8">
                  <h3 className="text-[clamp(24px,2.4vw,32px)] leading-[1.08] font-extrabold italic">{f.title}</h3>
                  <p className={`text-[17px] leading-normal ${st.dark ? 'text-[#D9D9D9]' : 'text-gris'}`}>{f.body}</p>
                </div>
              </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}
