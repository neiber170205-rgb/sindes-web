import {
  boolean,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  serial,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const memberStatus = pgEnum('member_status', ['draft', 'pending', 'published', 'hidden']);
export const memberKind = pgEnum('member_kind', ['docente', 'estudiante']);
export const projectStatus = pgEnum('project_status', ['en_desarrollo', 'prototipo', 'finalizado']);
export const adminRole = pgEnum('admin_role', ['admin', 'editor']);

export type Achievement = { title: string; detail?: string; date?: string };
export type Education = { title: string; institution?: string; period?: string };
export type Feature = { title: string; description: string };
export type Layer = { label: string; title: string; description: string };
export type Stat = { value: string; label: string };
export type Milestone = { date: string; title: string; description?: string; pending?: boolean };
export type Fact = { label: string; value: string };

const timestamps = {
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
};

export const adminUsers = pgTable('admin_users', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  name: text('name').notNull(),
  passwordHash: text('password_hash').notNull(),
  role: adminRole('role').notNull().default('editor'),
  /** Sube al cambiar la clave: las sesiones abiertas con la versión anterior dejan de servir. */
  sessionVersion: integer('session_version').notNull().default(0),
  ...timestamps,
});

export const members = pgTable('members', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  fullName: text('full_name').notNull(),
  kind: memberKind('kind').notNull().default('estudiante'),
  roleTitle: text('role_title').notNull().default('Integrante'),
  program: text('program').notNull().default('Ingeniería de Software'),
  semester: integer('semester'),
  joinedOn: text('joined_on'),
  bio: text('bio'),
  interests: text('interests'),
  email: text('email'),
  githubUrl: text('github_url'),
  linkedinUrl: text('linkedin_url'),
  cvlacUrl: text('cvlac_url'),
  photoPath: text('photo_path'),
  status: memberStatus('status').notNull().default('draft'),
  featured: boolean('featured').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(100),
  achievements: jsonb('achievements').$type<Achievement[]>().notNull().default([]),
  education: jsonb('education').$type<Education[]>().notNull().default([]),
  consentAt: timestamp('consent_at', { withTimezone: true }),
  inviteTokenHash: text('invite_token_hash').unique(),
  inviteExpiresAt: timestamp('invite_expires_at', { withTimezone: true }),
  submittedAt: timestamp('submitted_at', { withTimezone: true }),
  ...timestamps,
});

export const technologies = pgTable('technologies', {
  id: serial('id').primaryKey(),
  name: text('name').notNull().unique(),
  slug: text('slug').notNull().unique(),
  logoPath: text('logo_path'),
  category: text('category').notNull().default('Herramientas'),
  sortOrder: integer('sort_order').notNull().default(100),
});

export const memberTechnologies = pgTable(
  'member_technologies',
  {
    memberId: integer('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
    technologyId: integer('technology_id').notNull().references(() => technologies.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.memberId, t.technologyId] })],
);

export const projects = pgTable('projects', {
  id: serial('id').primaryKey(),
  slug: text('slug').notNull().unique(),
  name: text('name').notNull(),
  subtitle: text('subtitle'),
  summary: text('summary'),
  tag: text('tag'),
  intro: text('intro'),
  problem: text('problem'),
  solution: text('solution'),
  status: projectStatus('status').notNull().default('en_desarrollo'),
  statusLabel: text('status_label'),
  focus: text('focus'),
  demoUrl: text('demo_url'),
  published: boolean('published').notNull().default(false),
  sortOrder: integer('sort_order').notNull().default(100),
  featuresTitle: text('features_title').notNull().default('Lo que hace'),
  features: jsonb('features').$type<Feature[]>().notNull().default([]),
  layers: jsonb('layers').$type<Layer[]>().notNull().default([]),
  stats: jsonb('stats').$type<Stat[]>().notNull().default([]),
  milestones: jsonb('milestones').$type<Milestone[]>().notNull().default([]),
  facts: jsonb('facts').$type<Fact[]>().notNull().default([]),
  documents: jsonb('documents').$type<string[]>().notNull().default([]),
  extraTitle: text('extra_title'),
  extraBody: text('extra_body'),
  ...timestamps,
});

export const projectImages = pgTable('project_images', {
  id: serial('id').primaryKey(),
  projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
  path: text('path').notNull(),
  caption: text('caption'),
  alt: text('alt'),
  sortOrder: integer('sort_order').notNull().default(100),
});

export const projectMembers = pgTable(
  'project_members',
  {
    projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    memberId: integer('member_id').notNull().references(() => members.id, { onDelete: 'cascade' }),
    role: text('role'),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.memberId] })],
);

export const projectTechnologies = pgTable(
  'project_technologies',
  {
    projectId: integer('project_id').notNull().references(() => projects.id, { onDelete: 'cascade' }),
    technologyId: integer('technology_id').notNull().references(() => technologies.id, { onDelete: 'cascade' }),
    category: text('category'),
  },
  (t) => [primaryKey({ columns: [t.projectId, t.technologyId] })],
);

export const galleryPhotos = pgTable('gallery_photos', {
  id: serial('id').primaryKey(),
  path: text('path').notNull(),
  caption: text('caption'),
  alt: text('alt'),
  sortOrder: integer('sort_order').notNull().default(100),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const siteContent = pgTable('site_content', {
  key: text('key').primaryKey(),
  value: jsonb('value').notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});

export type SiteContent = {
  hero: { line1: string; line2: string; rotatingWords: string[]; intro: string };
  tapes: { top: string[]; bottom: string[] };
  semillero: { title: string; body: string; mission: string; vision: string };
  steps: { title: string; body: string }[];
  line: { kicker: string; title: string; intro: string };
  focuses: { key: 'innovacion' | 'optimizacion' | 'automatizacion' | 'ia'; title: string; body: string }[];
  meeting: { day: string; time: string; room: string; place: string; requirements: string; joinUrl: string };
  join: { title: string };
  footer: { text: string };
};
