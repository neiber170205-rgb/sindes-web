export type Tech = { id: number; name: string; slug: string; logoUrl: string | null; category: string };
export type Achievement = { title: string; detail?: string; date?: string };
export type Education = { title: string; institution?: string; period?: string };
export type ProjectStatus = 'en_desarrollo' | 'prototipo' | 'finalizado';
export type MemberStatus = 'draft' | 'pending' | 'published' | 'hidden';

export type MemberProjectRef = { id: number; slug: string; name: string; role: string | null; status: ProjectStatus; statusLabel: string };

export type Member = {
  id: number;
  slug: string;
  fullName: string;
  kind: 'docente' | 'estudiante';
  roleTitle: string;
  program: string;
  semester: number | null;
  joinedOn: string | null;
  bio: string | null;
  interests: string | null;
  email: string | null;
  githubUrl: string | null;
  linkedinUrl: string | null;
  cvlacUrl: string | null;
  photoUrl: string | null;
  featured: boolean;
  sortOrder: number;
  achievements: Achievement[];
  education: Education[];
  technologies: Tech[];
  projects: MemberProjectRef[];
};

export type AdminMember = Member & {
  status: MemberStatus;
  hasInvite: boolean;
  inviteExpiresAt: string | null;
  submittedAt: string | null;
  consent: boolean;
  updatedAt: string;
};

export type Feature = { title: string; description: string };
export type Layer = { label: string; title: string; description: string };
export type Stat = { value: string; label: string };
export type Milestone = { date: string; title: string; description?: string; pending?: boolean };
export type Fact = { label: string; value: string };
export type Img = { id: number; url: string; caption: string | null; alt: string | null; sortOrder: number };

export type TeamMember = { id: number; slug: string; fullName: string; kind: 'docente' | 'estudiante'; roleTitle: string; role: string | null; photoUrl: string | null; published: boolean };

export type Project = {
  id: number;
  slug: string;
  name: string;
  subtitle: string | null;
  summary: string | null;
  tag: string | null;
  intro: string | null;
  problem: string | null;
  solution: string | null;
  status: ProjectStatus;
  statusLabel: string;
  focus: string | null;
  demoUrl: string | null;
  published: boolean;
  sortOrder: number;
  featuresTitle: string;
  features: Feature[];
  layers: Layer[];
  stats: Stat[];
  milestones: Milestone[];
  facts: Fact[];
  documents: string[];
  extraTitle: string | null;
  extraBody: string | null;
  images: Img[];
  technologies: Tech[];
  team: TeamMember[];
};

export type FocusKey = 'innovacion' | 'optimizacion' | 'automatizacion' | 'ia';
export type SiteContent = {
  hero: { line1: string; line2: string; rotatingWords: string[]; intro: string };
  tapes: { top: string[]; bottom: string[] };
  semillero: { title: string; body: string; mission: string; vision: string };
  steps: { title: string; body: string }[];
  line: { kicker: string; title: string; intro: string };
  focuses: { key: FocusKey; title: string; body: string }[];
  meeting: { day: string; time: string; room: string; place: string; requirements: string; joinUrl: string };
  join: { title: string };
  footer: { text: string };
};

export type GalleryPhoto = Img;
export type Site = { content: SiteContent; gallery: GalleryPhoto[]; members: Member[]; projects: Project[] };
export type SessionUser = { id: number; email: string; name: string; role: 'admin' | 'editor' };
