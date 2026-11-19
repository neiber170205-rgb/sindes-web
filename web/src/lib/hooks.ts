import { useQuery } from '@tanstack/react-query';
import { useEffect, useRef, useState } from 'react';
import { api } from './api';
import type { Member, Project, Site } from './types';

export const useSite = () => useQuery({ queryKey: ['site'], queryFn: () => api.get<Site>('/public/site'), staleTime: 30_000 });
export const useProject = (slug: string) => useQuery({ queryKey: ['project', slug], queryFn: () => api.get<Project>(`/public/projects/${slug}`), retry: false });
export const useMember = (slug: string) => useQuery({ queryKey: ['member', slug], queryFn: () => api.get<Member>(`/public/members/${slug}`), retry: false });

export function useReducedMotion() {
  const [reduce, setReduce] = useState(() => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
  useEffect(() => {
    const mq = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    if (!mq) return;
    const on = () => setReduce(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);
  return reduce;
}

/** Activa las apariciones (.rv → .on) cuando cada bloque entra en pantalla. */
export function useReveal<T extends HTMLElement>(deps: unknown[] = []) {
  const ref = useRef<T>(null);
  useEffect(() => {
    const root = ref.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;
    root.classList.add('io');
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add('on');
            io.unobserve(e.target);
          }
        }
      },
      { threshold: 0, rootMargin: '0px 0px -10% 0px' },
    );
    root.querySelectorAll('.rv:not(.on)').forEach((el) => io.observe(el));
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return ref;
}

/** Intervalo que se detiene con la pestaña oculta. */
export function useTicker(cb: () => void, ms: number, active: boolean) {
  const saved = useRef(cb);
  saved.current = cb;
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => {
      if (!document.hidden) saved.current();
    }, ms);
    return () => clearInterval(id);
  }, [ms, active]);
}

export function useScrolledPast(px: number) {
  const [past, setPast] = useState(false);
  useEffect(() => {
    const on = () => setPast(window.scrollY > px);
    on();
    window.addEventListener('scroll', on, { passive: true });
    return () => window.removeEventListener('scroll', on);
  }, [px]);
  return past;
}

export function useDocumentTitle(title?: string) {
  useEffect(() => {
    if (title) document.title = title;
  }, [title]);
}
