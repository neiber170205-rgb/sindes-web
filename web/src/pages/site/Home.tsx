import { useDocumentTitle, useReveal, useSite } from '@/lib/hooks';
import { Hero, Tapes } from './home/Hero';
import { Join } from './home/Join';
import { Members } from './home/Members';
import { Projects } from './home/Projects';
import { Focuses, Semillero } from './home/Semillero';
import { PageError, PageLoading } from './States';

export default function Home() {
  const { data, isLoading, error, refetch } = useSite();
  const ref = useReveal<HTMLDivElement>([data]);
  useDocumentTitle('SINDES · Semillero de Investigación de Ingeniería de Software');
  if (isLoading) return <PageLoading />;
  if (error || !data) return <PageError onRetry={() => refetch()} />;
  const { content, gallery, members, projects } = data;
  return (
    <div ref={ref}>
      <Hero content={content} projects={projects} />
      <Tapes top={content.tapes.top} bottom={content.tapes.bottom} />
      <Semillero content={content} gallery={gallery} />
      <Focuses content={content} />
      <Projects projects={projects} />
      <Members members={members} />
      <Join content={content} />
    </div>
  );
}
