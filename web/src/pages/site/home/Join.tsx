import type { SiteContent } from '@/lib/types';

const shortDay = (d: string) => (d ? d.trim().slice(0, 3).replace(/^./, (c) => c.toUpperCase()) : '');

export function Join({ content }: { content: SiteContent }) {
  const { meeting, join } = content;
  const href = meeting.joinUrl?.trim();
  return (
    <section id="unete" className="overflow-hidden bg-rojo px-6 py-[clamp(64px,8vw,104px)]">
      <div className="rv mx-auto flex max-w-[1240px] flex-wrap items-center gap-x-16 gap-y-12">
        <div className="flex min-w-0 flex-[1.3_1_440px] flex-col gap-[22px]">
          <h2 className="s s-wipe pr-[0.12em] text-[clamp(36px,5.2vw,74px)] leading-[0.98] font-black tracking-[-0.02em] text-white italic">{join.title}</h2>
          {meeting.requirements && <p className="s s-up d2 max-w-[30em] text-[19px] leading-[1.55] font-medium text-white">{meeting.requirements}</p>}
          {href && (
            <a
              className="bt btb s s-up d3 inline-flex min-h-14 items-center justify-center self-start rounded-full bg-black px-[30px] text-lg font-bold text-white no-underline hover:text-white"
              href={href}
              target={href.startsWith('http') ? '_blank' : undefined}
              rel="noreferrer"
            >
              Quiero unirme
            </a>
          )}
        </div>
        <div className="s s-pass d2 max-w-[460px] min-w-0 flex-[1_1_340px] rotate-3">
          <div className="pass relative flex overflow-hidden rounded-[22px] bg-white shadow-[10px_10px_0_#000]">
            <div className="flex flex-[0_0_112px] flex-col items-center justify-center gap-1.5 bg-black px-2 py-[30px] text-white">
              <span className="text-[40px] leading-none font-black italic">{shortDay(meeting.day)}</span>
              <span className="text-[13px] font-medium">cada semana</span>
            </div>
            <div className="flex min-w-0 flex-1 flex-col gap-2 border-l-[3px] border-dashed border-black px-[22px] py-6">
              <span className="text-sm font-bold text-rojo-texto">Reunión del semillero</span>
              <span className="text-[clamp(21px,2.3vw,30px)] leading-[1.1] font-extrabold">{meeting.time}</span>
              {meeting.room && <span className="text-base text-gris">{meeting.room}</span>}
              {meeting.place && <span className="text-base text-gris">{meeting.place}</span>}
            </div>
            <span aria-hidden="true" className="absolute -top-3 left-[100px] size-6 rounded-full bg-rojo" />
            <span aria-hidden="true" className="absolute -bottom-3 left-[100px] size-6 rounded-full bg-rojo" />
          </div>
        </div>
      </div>
    </section>
  );
}
