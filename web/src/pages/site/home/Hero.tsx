import { useEffect, useMemo, useState } from 'react';
import { useReducedMotion, useTicker } from '@/lib/hooks';
import type { Project, SiteContent } from '@/lib/types';

const PILL_COLORS = ['#1B4B9B', '#E1251B', '#000000'];

/** Fondo de unos y ceros que sube lento. */
function useBits() {
  return useMemo(() => {
    let seed = 7;
    const lines: string[] = [];
    for (let r = 0; r < 22; r++) {
      let s = '';
      for (let c = 0; c < 110; c++) {
        seed = (seed * 48271) % 2147483647;
        s += seed % 7 < 3 ? '1' : '0';
      }
      lines.push(s);
    }
    return lines.concat(lines);
  }, []);
}

/** Palabra que rueda dentro de la píldora de color. */
function RotatingPill({ words }: { words: string[] }) {
  const reduce = useReducedMotion();
  const list = words.length ? words : ['software.'];
  const [i, setI] = useState(0);
  const [snap, setSnap] = useState(false);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), 1800);
    return () => clearTimeout(t);
  }, []);

  useTicker(() => setI((x) => x + 1), 2700, started && !reduce && list.length > 1);

  // Al llegar a la copia de la primera palabra, vuelve al inicio sin animación.
  useEffect(() => {
    if (i !== list.length) return;
    const t = setTimeout(() => {
      setSnap(true);
      setI(0);
      requestAnimationFrame(() => requestAnimationFrame(() => setSnap(false)));
    }, 750);
    return () => clearTimeout(t);
  }, [i, list.length]);

  const shown = [...list, list[0]];
  const color = PILL_COLORS[(i % list.length) % PILL_COLORS.length];

  return (
    <span
      className="pill inline-block origin-left rounded-[0.26em] pt-[0.04em] pr-[0.3em] pb-[0.1em] pl-[0.26em]"
      style={{ animationDelay: '0.5s', backgroundColor: color, transition: 'background-color .7s cubic-bezier(.7,0,.2,1)' }}
    >
      <span className="sr-only">{list[0]}</span>
      <span className="block h-[1.16em] overflow-hidden" aria-hidden="true">
        <span className="roll flex flex-col" style={{ transform: `translateY(-${i * 1.16}em)`, transition: snap ? 'none' : undefined }}>
          {shown.map((w, k) => (
            <span key={k} className="h-[1.16em] pr-[0.1em] leading-[1.16] whitespace-nowrap">
              {w}
            </span>
          ))}
        </span>
      </span>
    </span>
  );
}

function SeedCircuit({ labels }: { labels: string[] }) {
  const [inno, opt, auto, ia] = labels;
  return (
    <svg
      role="img"
      aria-label={`Una semilla que crece como un circuito: del problema de una empresa salen ${labels.join(', ')}, hasta llegar a la productividad`}
      viewBox="0 0 480 480"
      className="box-border block h-auto w-full px-3 pt-[18px]"
    >
      <path d="M28 360H452" fill="none" stroke="#FFFFFF" strokeOpacity="0.4" strokeWidth="2" strokeDasharray="2 9" strokeLinecap="round" />
      <g fill="none" stroke="#FFFFFF" strokeOpacity="0.6" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path className="draw" style={{ animationDelay: '1s' }} d="M220 400H172L152 420H108" />
        <path className="draw" style={{ animationDelay: '1s' }} d="M260 400H308L328 420H372" />
        <path className="draw" style={{ animationDelay: '1s' }} d="M240 412V440" />
      </g>
      <g fill="#FFFFFF" fillOpacity="0.7">
        <circle className="pop" style={{ animationDelay: '1.32s' }} cx="102" cy="420" r="5" />
        <circle className="pop" style={{ animationDelay: '1.32s' }} cx="378" cy="420" r="5" />
        <circle className="pop" style={{ animationDelay: '1.08s' }} cx="240" cy="446" r="5" />
      </g>
      <g fill="none" stroke="#3F95CB" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
        <path className="draw" style={{ animationDelay: '1.1s' }} d="M240 384V126" />
        <path className="draw" style={{ animationDelay: '1.27s' }} d="M240 320L190 270V226" />
        <path className="draw" style={{ animationDelay: '1.35s' }} d="M240 290L300 230V196" />
        <path className="draw" style={{ animationDelay: '1.51s' }} d="M240 230L160 150H118" />
        <path className="draw" style={{ animationDelay: '1.59s' }} d="M240 200L310 130H362" />
      </g>
      <g fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path className="pulse-line" style={{ animationDelay: '2.4s' }} stroke="#E1251B" strokeWidth="5" d="M240 384V126" />
        <path className="pulse-line" style={{ animationDelay: '2.74s' }} stroke="#FFFFFF" strokeWidth="4" d="M240 320L190 270V226" />
        <path className="pulse-line" style={{ animationDelay: '2.9s' }} stroke="#FFFFFF" strokeWidth="4" d="M240 290L300 230V196" />
        <path className="pulse-line" style={{ animationDelay: '3.22s' }} stroke="#FFFFFF" strokeWidth="4" d="M240 230L160 150H118" />
        <path className="pulse-line" style={{ animationDelay: '3.38s' }} stroke="#FFFFFF" strokeWidth="4" d="M240 200L310 130H362" />
      </g>
      <ellipse className="pop" style={{ animationDelay: '0.9s' }} cx="240" cy="399" rx="24" ry="15" fill="#E1251B" />
      {[
        [190, 218, 1.58],
        [300, 188, 1.67],
        [110, 150, 1.92],
        [370, 130, 1.99],
      ].map(([cx, cy, d]) => (
        <g key={`${cx}`} className="pop" style={{ animationDelay: `${d}s` }}>
          <circle cx={cx} cy={cy} r="9" fill="#FFFFFF" />
          <circle cx={cx} cy={cy} r="3.5" fill="#000000" />
        </g>
      ))}
      <polygon className="draw" style={{ animationDelay: '1.79s' }} points="240,66 266,81 266,111 240,126 214,111 214,81" fill="#000000" stroke="#FFFFFF" strokeWidth="3" strokeLinejoin="round" />
      <circle className="halo" cx="240" cy="96" r="9" fill="none" stroke="#E1251B" strokeWidth="2" />
      <circle className="pop" style={{ animationDelay: '2.2s' }} cx="240" cy="96" r="9" fill="#E1251B" />
      <g fontFamily="Rubik Variable, Rubik, sans-serif" fontSize="17" fontWeight="700" fill="#FFFFFF">
        <text className="fade" style={{ animationDelay: '1.7s' }} x="174" y="224" textAnchor="end">
          {inno}
        </text>
        <text className="fade" style={{ animationDelay: '1.8s' }} x="316" y="194">
          {auto}
        </text>
        <text className="fade" style={{ animationDelay: '2.05s' }} x="110" y="128" textAnchor="middle">
          {opt}
        </text>
        <text className="fade" style={{ animationDelay: '2.1s' }} x="370" y="108" textAnchor="middle" fontSize="16">
          {ia}
        </text>
        <text className="fade" style={{ animationDelay: '1.2s' }} x="240" y="472" textAnchor="middle" fontSize="15" fontWeight="600">
          Un problema de una empresa
        </text>
        <text className="fade" style={{ animationDelay: '2.3s' }} x="240" y="50" textAnchor="middle">
          Productividad
        </text>
      </g>
    </svg>
  );
}

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

export function Hero({ content, projects }: { content: SiteContent; projects: Project[] }) {
  const bits = useBits();
  const { hero, meeting, focuses } = content;
  const active = projects.filter((p) => p.status !== 'finalizado').length;
  const byKey = (k: string, fb: string) => focuses.find((f) => f.key === k)?.title || fb;
  const labels = [byKey('innovacion', 'Innovación'), byKey('optimizacion', 'Optimización'), byKey('automatizacion', 'Automatización'), byKey('ia', 'Implementación de IA')];
  const meetLine = [meeting.day?.toLowerCase(), meeting.time?.split(' a ')[0]].filter(Boolean).join(' ');

  return (
    <section className="relative overflow-hidden bg-azul">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 overflow-hidden select-none">
        <div className="drift font-mono text-[15px] leading-9 tracking-[0.62em] whitespace-nowrap text-white/20">
          {bits.map((b, i) => (
            <div key={i}>{b}</div>
          ))}
        </div>
      </div>

      <div className="relative z-[2] mx-auto flex max-w-[1240px] flex-wrap items-end gap-10 px-6 pt-11">
        <div className="flex min-w-0 flex-[1.4_1_520px] flex-col gap-7 pb-[clamp(48px,7vw,96px)]">
          <h1 className="text-[clamp(40px,4.9vw,66px)] leading-none font-black tracking-[-0.02em] text-white italic">
            <span className="mask">
              <span className="rise">{hero.line1}</span>
            </span>
            <span className="mask">
              <span className="rise" style={{ animationDelay: '0.12s' }}>
                {hero.line2}
              </span>
            </span>
            <span className="block pt-[0.16em]">
              <RotatingPill words={hero.rotatingWords} />
            </span>
          </h1>
          <p className="fu max-w-[33em] text-[clamp(17px,1.5vw,20px)] leading-[1.55] font-medium text-black" style={{ animationDelay: '0.7s' }}>
            {hero.intro}
          </p>
          <div className="fu flex flex-wrap gap-3.5" style={{ animationDelay: '0.85s' }}>
            <a className="bt btk inline-flex min-h-[54px] items-center justify-center rounded-full bg-black px-7 text-[17px] font-bold text-white no-underline hover:text-white" href="#proyectos">
              Ver proyectos
            </a>
            <a className="bt btw inline-flex min-h-[54px] items-center justify-center rounded-full bg-white px-7 text-[17px] font-bold text-black no-underline hover:text-black" href="#integrantes">
              Conocer al equipo
            </a>
          </div>
        </div>

        <div className="fu relative min-w-0 flex-[1_1_380px]" style={{ animationDelay: '0.3s' }}>
          <div aria-hidden="true" className="cut-tl-64 absolute inset-0 -translate-x-3.5 -translate-y-3.5 bg-rojo" />
          <div className="cut-tl-64 relative flex flex-col bg-black">
            <SeedCircuit labels={labels} />
            <div className="border-t-[1.5px] border-[#333] px-[22px] pt-4 pb-5 font-mono text-sm leading-[1.75] text-white">
              <div>
                <span className="text-[#FF7A6E]">$ </span>
                <span className="type" style={{ animationDelay: '2.2s' }}>
                  sindes estado
                </span>
              </div>
              <div className="text-[#BFE0F5]">
                <span className="type" style={{ animationDelay: '3.3s' }}>
                  {plural(active, 'proyecto en marcha', 'proyectos en marcha')}
                </span>
              </div>
              <div className="text-[#BFE0F5]">
                <span className="type" style={{ animationDelay: '4.3s' }}>
                  reunión: {meetLine || 'cada semana'}
                </span>
                <span className="caret ml-1 inline-block h-[17px] w-[9px] bg-white align-text-bottom" aria-hidden="true" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function Tapes({ top, bottom }: { top: string[]; bottom: string[] }) {
  const line = (words: string[]) => `${words.join(' // ')} //`;
  const Row = ({ words, cls }: { words: string[]; cls: string }) => (
    <div className={`${cls} flex w-max text-[clamp(20px,2.2vw,30px)] font-extrabold whitespace-nowrap text-white italic`}>
      {Array.from({ length: 6 }, (_, i) => (
        <span key={i} className="pr-[0.5em]">
          {line(words)}
        </span>
      ))}
    </div>
  );
  if (!top.length && !bottom.length) return null;
  return (
    <div className="relative overflow-hidden bg-white pt-11 pb-9" aria-hidden="true">
      {top.length > 0 && (
        <div className="-ml-[6%] w-[112%] -rotate-2 overflow-hidden bg-black py-[13px]">
          <Row words={top} cls="mql" />
        </div>
      )}
      {bottom.length > 0 && (
        <div className="-mt-4 -ml-[6%] w-[112%] rotate-[1.4deg] overflow-hidden bg-rojo py-[13px]">
          <Row words={bottom} cls="mqr" />
        </div>
      )}
    </div>
  );
}
