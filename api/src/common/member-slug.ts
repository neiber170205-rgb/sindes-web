import { like } from 'drizzle-orm';
import { Db } from '../db/db.module';
import { members } from '../db/schema';
import { slugify } from './util';

/** Dirección libre para un perfil: «juan-perez», o «juan-perez-2» si ya está tomada. */
export async function uniqueMemberSlug(db: Db, base: string, exceptId?: number) {
  const root = slugify(base);
  const taken = await db.select({ id: members.id, slug: members.slug }).from(members).where(like(members.slug, `${root}%`));
  const used = new Set(taken.filter((t) => t.id !== exceptId).map((t) => t.slug));
  if (!used.has(root)) return root;
  let n = 2;
  while (used.has(`${root}-${n}`)) n++;
  return `${root}-${n}`;
}
