import 'dotenv/config';
/**
 * Cuentas del panel desde la terminal del servidor.
 *   node dist/db/admin-cli.js crear  correo@fesc.edu.co "Nombre" [admin|editor]
 *   node dist/db/admin-cli.js clave  correo@fesc.edu.co      → genera una contraseña nueva y la muestra
 *   node dist/db/admin-cli.js lista
 */
import bcrypt from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { randomBytes } from 'node:crypto';
import { createPool } from './db.module';
import * as schema from './schema';
import { adminUsers } from './schema';

const newPassword = () => randomBytes(12).toString('base64url');

async function main() {
  const [cmd, emailRaw, name, role] = process.argv.slice(2);
  const pool = createPool();
  const db = drizzle(pool, { schema });
  const email = emailRaw?.toLowerCase().trim();
  try {
    if (cmd === 'lista') {
      const rows = await db.select({ email: adminUsers.email, name: adminUsers.name, role: adminUsers.role }).from(adminUsers);
      console.table(rows);
    } else if (cmd === 'crear' && email && name) {
      if (role && role !== 'admin' && role !== 'editor') throw new Error(`Rol desconocido «${role}»: usa admin o editor`);
      const [exists] = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, email));
      if (exists) throw new Error(`Ya existe la cuenta ${email}. Para darle otra contraseña: clave ${email}`);
      // Siempre una contraseña nueva: ADMIN_PASSWORD del .env es la de la cuenta principal y no debe repetirse.
      const password = newPassword();
      await db.insert(adminUsers).values({ email, name, role: role === 'editor' ? 'editor' : 'admin', passwordHash: await bcrypt.hash(password, 12) });
      console.log(`Cuenta creada: ${email}\nContraseña: ${password}\nCámbiala al entrar (Panel → Mi cuenta).`);
    } else if (cmd === 'clave' && email) {
      const password = newPassword();
      // También cierra las sesiones abiertas de esa cuenta
      const rows = await db
        .update(adminUsers)
        .set({ passwordHash: await bcrypt.hash(password, 12), sessionVersion: sql`${adminUsers.sessionVersion} + 1`, updatedAt: new Date() })
        .where(eq(adminUsers.email, email))
        .returning({ id: adminUsers.id });
      if (!rows.length) throw new Error(`No existe la cuenta ${email}`);
      console.log(`Contraseña nueva para ${email}: ${password}`);
    } else {
      console.log('Uso:\n  crear correo "Nombre" [admin|editor]\n  clave correo\n  lista');
      process.exitCode = 1;
    }
  } finally {
    await pool.end();
  }
}
main().catch((e) => {
  console.error(e.message ?? e);
  process.exit(1);
});
