import 'dotenv/config';
/**
 * Carga el contenido inicial (el del mockup aprobado) y crea la cuenta de administración.
 *   npm run db:seed            → solo si la base está vacía
 *   npm run db:seed -- --force → borra el contenido y lo vuelve a cargar (no toca las cuentas)
 */
import 'reflect-metadata';
import bcrypt from 'bcryptjs';
import { eq, sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';
import { UploadsService } from '../common/uploads.service';
import { slugify } from '../common/util';
import { createPool } from './db.module';
import * as schema from './schema';
import {
  adminUsers,
  galleryPhotos,
  memberTechnologies,
  members,
  projectImages,
  projectMembers,
  projectTechnologies,
  projects,
  SiteContent,
  siteContent,
  technologies,
} from './schema';

const ASSETS = [join(__dirname, '..', '..', 'seed-assets'), join(process.cwd(), 'seed-assets')].find((p) => existsSync(p))!;
const uploads = new UploadsService();

type SeedDb = ReturnType<typeof drizzle<typeof schema>>;
type Tx = Parameters<Parameters<SeedDb['transaction']>[0]>[0];

/** Fotos que este seed alcanzó a copiar: si algo falla se borran para no dejar basura. */
const copied: string[] = [];
async function importFile(...args: Parameters<UploadsService['importFile']>) {
  const rel = await uploads.importFile(...args);
  copied.push(rel);
  return rel;
}

async function portrait(file: string, top = 0.3) {
  const img = sharp(await readFile(join(ASSETS, file))).rotate();
  const { width = 900, height = 1125 } = await img.metadata();
  const w = width;
  const h = Math.round((w * 5) / 4);
  let buf: Buffer;
  if (h <= height) {
    const offset = Math.round((height - h) * top);
    buf = await img.extract({ left: 0, top: offset, width: w, height: h }).resize(900, 1125).webp({ quality: 84 }).toBuffer();
  } else {
    buf = await img.resize(900, 1125, { fit: 'cover' }).webp({ quality: 84 }).toBuffer();
  }
  return importFile('members', buf, '.webp');
}

async function wide(kind: 'projects' | 'gallery', file: string) {
  const buf = await sharp(await readFile(join(ASSETS, file)))
    .rotate()
    .resize({ width: 1800, withoutEnlargement: true })
    .webp({ quality: 82 })
    .toBuffer();
  return importFile(kind, buf, '.webp');
}

async function logo(file: string) {
  const path = join(ASSETS, 'logos', file);
  if (!existsSync(path)) return null;
  return importFile('logos', await readFile(path), '.svg');
}

export const SITE: SiteContent = {
  hero: {
    line1: 'Sembramos ideas.',
    line2: 'Cosechamos',
    rotatingWords: ['software.', 'prototipos.', 'soluciones.'],
    intro:
      'SINDES es el semillero de investigación del programa de Ingeniería de Software de la FESC. Desarrollamos tecnología para que las empresas sean más productivas: innovamos, optimizamos, automatizamos e implementamos IA.',
  },
  tapes: {
    top: ['Innovación', 'Optimización', 'Automatización', 'Implementación de IA'],
    bottom: ['Python', 'React', 'PostgreSQL', 'n8n', 'Notion', 'GitHub'],
  },
  semillero: {
    title: 'Un semillero es donde las ideas echan raíz.',
    body: 'En SINDES, estudiantes y docentes de Ingeniería de Software tomamos un problema real de una empresa, lo investigamos y lo convertimos en tecnología que la hace más productiva. Cada proyecto lo lleva un equipo de 2 a 3 estudiantes.',
    mission: '',
    vision: '',
  },
  steps: [
    { title: 'Problema real', body: 'Una empresa o la región trae una necesidad concreta.' },
    { title: 'Investigación', body: 'Se estudia qué existe, qué falta y qué se puede probar.' },
    { title: 'Prototipo', body: 'Un equipo de 2 a 3 estudiantes lo construye.' },
    { title: 'Presentación', body: 'Cada miércoles se muestran avances y se ajusta el rumbo.' },
  ],
  line: {
    kicker: 'Nuestra línea de investigación',
    title: 'Desarrollo tecnológico como aporte a la productividad empresarial.',
    intro: 'La trabajamos desde cuatro enfoques.',
  },
  focuses: [
    { key: 'innovacion', title: 'Innovación', body: 'Probar ideas nuevas en problemas que las empresas ya tienen.' },
    { key: 'optimizacion', title: 'Optimización', body: 'Que un proceso gaste menos tiempo y menos recursos.' },
    { key: 'automatizacion', title: 'Automatización', body: 'Tareas repetitivas que dejan de hacerse a mano.' },
    { key: 'ia', title: 'Implementación de IA', body: 'Modelos de IA puestos a trabajar en casos concretos de la empresa.' },
  ],
  meeting: { day: 'Miércoles', time: '2:00 a 4:00 p. m.', room: 'Salón B204', place: 'FESC, Cúcuta', requirements: '', joinUrl: '' },
  join: { title: 'Los miércoles hay puesto para ti.' },
  footer: { text: 'SINDES, semillero de investigación del programa de Ingeniería de Software de la FESC' },
};

const TECHS: [string, string, string | null][] = [
  // [nombre, categoría, logo]
  ['React', 'Pantalla', 'react.svg'],
  ['Next.js', 'Pantalla', 'nextdotjs.svg'],
  ['TypeScript', 'Pantalla', 'typescript.svg'],
  ['JavaScript', 'Pantalla', 'javascript.svg'],
  ['HTML', 'Pantalla', 'html5.svg'],
  ['CSS', 'Pantalla', 'css.svg'],
  ['Tailwind CSS', 'Pantalla', 'tailwindcss.svg'],
  ['shadcn/ui', 'Pantalla', 'shadcnui.svg'],
  ['Vite', 'Pantalla', 'vite.svg'],
  ['React Router', 'Pantalla', 'reactrouter.svg'],
  ['PWA', 'Pantalla', 'pwa.svg'],
  ['Python', 'Servidor', 'python.svg'],
  ['Node.js', 'Servidor', 'nodedotjs.svg'],
  ['NestJS', 'Servidor', 'nestjs.svg'],
  ['ERPNext / Frappe', 'Servidor', 'frappe.svg'],
  ['PHP', 'Servidor', 'php.svg'],
  ['XAMPP', 'Servidor', 'xampp.svg'],
  ['SQL Server', 'Datos', 'sqlserver.svg'],
  ['PostgreSQL', 'Datos', 'postgresql.svg'],
  ['MySQL', 'Datos', 'mysql.svg'],
  ['MariaDB', 'Datos', 'mariadb.svg'],
  ['Redis', 'Datos', 'redis.svg'],
  ['Prisma', 'Datos', 'prisma.svg'],
  ['n8n', 'Automatización', 'n8n.svg'],
  ['Docker', 'Infraestructura', 'docker.svg'],
  ['Git', 'Infraestructura', 'git.svg'],
  ['Linux', 'Infraestructura', 'linux.svg'],
  ['GitHub', 'Herramientas', 'github.svg'],
  ['Notion', 'Herramientas', 'notion.svg'],
  ['Leaflet', 'Mapas', 'leaflet.svg'],
  ['OpenStreetMap', 'Mapas', 'openstreetmap.svg'],
  ['OSRM', 'Mapas', null],
  ['Overpass', 'Mapas', null],
  ['Nominatim', 'Mapas', null],
];

async function ensureAdmin(db: SeedDb) {
  const email = process.env.ADMIN_EMAIL?.toLowerCase().trim();
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) {
    console.log('· ADMIN_EMAIL / ADMIN_PASSWORD vacíos: no se creó cuenta de administración');
    return;
  }
  const [exists] = await db.select({ id: adminUsers.id }).from(adminUsers).where(eq(adminUsers.email, email));
  if (exists) {
    console.log(`· La cuenta ${email} ya existe`);
    return;
  }
  if (password.length < 10) throw new Error('ADMIN_PASSWORD debe tener al menos 10 caracteres');
  await db.insert(adminUsers).values({
    email,
    name: process.env.ADMIN_NAME || 'Administración SINDES',
    role: 'admin',
    passwordHash: await bcrypt.hash(password, 12),
  });
  console.log(`· Cuenta de administración creada: ${email}`);
}

async function main() {
  const pool = createPool();
  const db = drizzle(pool, { schema });
  const force = process.argv.includes('--force');

  await ensureAdmin(db);

  const [hasContent] = await db.select({ key: siteContent.key }).from(siteContent).where(eq(siteContent.key, 'site'));
  if (hasContent && !force) {
    console.log('· La base ya tiene contenido. Usa --force para recargarlo.');
    await pool.end();
    return;
  }

  // Todo o nada: si algo falla a mitad de camino la base queda como estaba y se puede volver a correr.
  try {
    await db.transaction(async (tx) => {
      if (force) {
        await tx.execute(
          sql`truncate table project_members, project_technologies, project_images, member_technologies, gallery_photos, projects, members, technologies, site_content restart identity cascade`,
        );
      }
      await loadContent(tx);
    });
  } catch (err) {
    await Promise.all(copied.map((rel) => uploads.remove(rel)));
    throw err;
  } finally {
    await pool.end();
  }
  console.log('· Contenido inicial cargado: 2 proyectos, 3 integrantes, 3 fotos de galería, %d tecnologías', TECHS.length);
}

async function loadContent(db: Tx) {
  await db.insert(siteContent).values({ key: 'site', value: SITE });

  // Tecnologías
  const techId = new Map<string, number>();
  for (const [i, [name, category, file]] of TECHS.entries()) {
    const [row] = await db
      .insert(technologies)
      .values({ name, slug: slugify(name), category, sortOrder: (i + 1) * 10, logoPath: file ? await logo(file) : null })
      .returning({ id: technologies.id });
    techId.set(name, row.id);
  }
  const tech = (n: string) => {
    const id = techId.get(n);
    if (!id) throw new Error(`Tecnología desconocida: ${n}`);
    return id;
  };

  // Galería del semillero
  const gallery: [string, string, string][] = [
    ['grupo-campus-party.jpg', 'En Campus Party', 'Integrantes de SINDES con la docente en Campus Party'],
    ['grupo-salon.jpg', 'Reunión del semillero en la FESC', 'Integrantes del semillero SINDES reunidos en un salón de la FESC'],
    ['grupo-selfie.jpg', 'El equipo en la FESC', 'Selfie del equipo SINDES con la docente en la FESC'],
  ];
  for (const [i, [file, caption, alt]] of gallery.entries()) {
    await db.insert(galleryPhotos).values({ path: await wide('gallery', file), caption, alt, sortOrder: (i + 1) * 10 });
  }

  // Proyectos
  const [sicaf] = await db
    .insert(projects)
    .values({
      slug: 'sicaf',
      name: 'SICAF',
      subtitle: 'Sistema integral de gestión para fábricas de calzado',
      summary:
        'Compras, inventario, producción, calidad, ventas y despachos de una fábrica de calzado en una sola app. Cada área es un módulo y cada integrante del equipo responde por uno.',
      tag: 'Proyecto integrador FESC',
      intro:
        'Una sola app para manejar la fábrica de punta a punta: compras, inventario, producción, calidad, ventas y despachos. Es el proyecto integrador del programa en la FESC.',
      problem:
        'En una fábrica de calzado cada área lleva lo suyo por separado: compras, bodega, planta, calidad, ventas y despachos. Nadie ve el recorrido completo de un pedido y los avisos entre áreas se pierden.',
      solution:
        'SICAF junta todo en una sola app. Cada operación avisa al área que debe actuar: si falta material, Compras se entera; si Calidad rechaza un lote, Producción lo ve. Desde noviembre trabaja con datos reales en base de datos.',
      status: 'en_desarrollo',
      focus: 'Optimización y automatización',
      published: true,
      sortOrder: 10,
      featuresTitle: 'Los módulos',
      features: [
        { title: 'Dashboard', description: 'Estado de toda la fábrica, alertas y tendencia de producción.' },
        { title: 'Diseño', description: 'Modelos, referencias y fichas técnicas (hoy en Inventario › Productos).' },
        { title: 'Compras', description: 'Órdenes de compra y avisos de material bajo el mínimo.' },
        { title: 'Inventario', description: 'Materia prima, producto en proceso, terminado, mermas y kardex.' },
        { title: 'Producción', description: 'Órdenes, etapas de planta, pérdidas, productividad y costos.' },
        { title: 'Control de calidad', description: 'Estándares, inspecciones por etapa y no conformidades.' },
        { title: 'Comercial', description: 'Cotizaciones, facturación, clientes, existencias y pedidos.' },
        { title: 'Logística y despacho', description: 'Despachos, recepción, flota y logística inversa.' },
        { title: 'Administración', description: 'Usuarios, roles e inicio de sesión.' },
      ],
      layers: [
        { label: 'Pantalla', title: 'React + TypeScript', description: 'Una sola app para todos los módulos, con React Router, Tailwind y shadcn/ui.' },
        { label: 'API', title: 'PHP', description: 'Un archivo por acción: recibe los datos, revisa las reglas y los guarda.' },
        { label: 'Base de datos', title: 'MariaDB (XAMPP)', description: 'Una base por módulo, para que el trabajo de uno no dañe el de otro.' },
      ],
      stats: [
        { value: '9', label: 'módulos en una sola app' },
        { value: '1', label: 'base de datos por módulo' },
        { value: '3', label: 'capas: pantalla, API y base' },
        { value: 'Pedido → despacho', label: 'un solo recorrido' },
      ],
      milestones: [
        { date: 'Antes', title: 'Mockups de los 9 módulos', description: 'Todas las pantallas dibujadas en HTML, con un estilo común para todo SICAF.' },
        { date: '11 nov 2026', title: 'Datos reales en la base', description: 'Se acabaron los datos de prueba: cada módulo lee y guarda en su base, con inicio de sesión.' },
        { date: 'Nov 2026', title: 'Producción en su versión 2', description: 'El módulo de Producción pasa a su base versión 2.' },
        { date: '18 nov 2026', title: 'Revisión automática', description: 'Cada cambio que se propone se revisa solo: PHP, app y bases.' },
      ],
      facts: [
        { label: 'Sector', value: 'Calzado' },
        { label: 'Tipo', value: 'Proyecto integrador' },
        { label: 'Módulos', value: '9' },
      ],
      documents: ['Lógica de negocio por módulo', 'Requisitos de calidad', 'Modelo entidad-relación (MER)', 'Manual de usuario'],
    })
    .returning({ id: projects.id });

  const [ruta] = await db
    .insert(projects)
    .values({
      slug: 'ruta-toche',
      name: 'Ruta Toche',
      subtitle: 'App de turismo para Cúcuta, con Toche como guía',
      summary:
        'Mapa real, rutas a pie con indicaciones por voz, estampas en cada punto turístico, zonas seguras por colores y ayuda de emergencia. Funciona sin internet y se instala en el celular.',
      tag: 'Diseño v2',
      intro:
        'Prototipo funcional que lleva al visitante por el patrimonio de Cúcuta: mapa real, rutas a pie con voz, la historia de cada lugar y avisos de seguridad. Se usa desde el navegador y se instala en el celular.',
      problem:
        'Cúcuta tiene un patrimonio histórico y cultural que el visitante no encuentra fácil: no sabe cómo llegar a cada lugar, qué historia tiene ni qué zonas son seguras a cada hora.',
      solution:
        'Ruta Toche guía a pie con indicaciones por voz, cuenta la historia de cada lugar al llegar, premia la visita con estampas y avisa por colores qué zonas son seguras. Funciona sin internet una vez abierta.',
      status: 'prototipo',
      statusLabel: 'Prototipo · fase 1',
      focus: 'Innovación',
      demoUrl: 'https://neiber170205-rgb.github.io/mockup-turismo/',
      published: true,
      sortOrder: 20,
      featuresTitle: 'Lo que hace',
      features: [
        { title: 'Mapa y rutas con voz', description: 'Mapa real de OpenStreetMap, rutas a pie o en carro, recálculo si te sales y aviso al llegar.' },
        { title: 'Llegada al lugar', description: 'Al estar a pocos metros vibra, Toche lo anuncia y se abre la historia con el comparador antes y hoy.' },
        { title: 'Pasaporte de estampas', description: 'En cada punto, o con un plato típico, te tomas una foto y ganas la estampa.' },
        { title: 'Seguridad por colores', description: 'Verde segura, amarilla precaución, roja restringida. Alerta de noche y corredor seguro cerca de la frontera.' },
        { title: 'Ayuda', description: 'Llamar al 123, hospital y CAI más cercanos, líneas oficiales y compartir ubicación.' },
        { title: 'Accesibilidad', description: 'Guía por voz, alto contraste, tres tamaños de letra, paleta para daltonismo y lector de pantalla.' },
        { title: 'Hablar con Toche', description: 'Comandos de voz como "llévame al Templo Histórico" o "ayuda".' },
        { title: 'Toche animado', description: 'Un toche real hecho con código: respira, parpadea, vuela y celebra cada estampa.' },
      ],
      layers: [
        { label: 'App', title: 'HTML, CSS y JavaScript', description: 'Sin instalar ni compilar nada. Se instala en el celular y guarda lo visto para usarlo sin internet.' },
        { label: 'Mapa', title: 'Leaflet + OpenStreetMap', description: 'Mapa abierto; rutas con OSRM, lugares cercanos con Overpass y buscador con Nominatim.' },
        { label: 'Contenido', title: 'Catálogo de lugares', description: 'Historia, línea de tiempo, fuentes y fotos de uso libre de cada sitio.' },
      ],
      stats: [
        { value: '14', label: 'lugares del patrimonio' },
        { value: '9', label: 'paradas en la ruta del centro' },
        { value: '2,8 km', label: 'a pie por el centro' },
        { value: '3', label: 'rutas por tiempo: ½, 1 y 2 días' },
      ],
      milestones: [
        { date: '27 oct 2026', title: 'Investigación del patrimonio', description: 'Documento sobre el patrimonio histórico y cultural de Cúcuta, base del contenido de la app.' },
        { date: 'Nov 2026', title: 'Prototipo fase 1, diseño v2', description: 'Mapa, rutas con voz, estampas, seguridad por colores, ayuda y accesibilidad funcionando.' },
        { date: '18 nov 2026', title: 'Última actualización', description: 'Prototipo publicado en línea para probarlo desde el celular.' },
        { date: 'Pendiente', title: 'Validar con la gente', description: 'Probarlo con habitantes y visitantes, y confirmar los datos por verificar.', pending: true },
        { date: 'Pendiente', title: 'Fase 2', description: 'Pedir taxi dentro de la app y rutas de bus.', pending: true },
      ],
      facts: [
        { label: 'Sector', value: 'Turismo' },
        { label: 'Ciudad', value: 'Cúcuta' },
        { label: 'Fase', value: '1 de 2' },
      ],
      documents: ['Anteproyecto', 'Avance de investigación del patrimonio', 'Requisitos (SRS v1)'],
      extraTitle: 'Los lugares',
      extraBody:
        'Teatro Zulima, Parque Santander, Catedral de San José, Palacio de la Gobernación, Casa Torre del Reloj, Parque La Victoria, Biblioteca Julio Pérez Ferrero, Quinta Teresa, Monumento a Cristo Rey y Columna de Bolívar. Además, cuatro sitios por verificar: Corredor de Los Patios, La Bagatela, Casa Natal de Santander y Templo Histórico.\n\nFotos de Wikimedia Commons con licencia libre (CC BY-SA o dominio público).',
    })
    .returning({ id: projects.id });

  const images: [number, string, string, string][] = [
    [sicaf.id, 'sicaf-dashboard.jpg', 'Dashboard general', 'Dashboard general de la fábrica'],
    [sicaf.id, 'sicaf-panel-produccion.jpg', 'Panel de producción', 'Panel de producción con órdenes, flujo y pendientes'],
    [sicaf.id, 'sicaf-ficha-producto.jpg', 'Ficha del producto en ventas', 'Ficha de la Bota Andina en Comercial, con existencias por color y talla'],
    [sicaf.id, 'sicaf-cotizaciones.jpg', 'Cotizaciones', 'Lista de cotizaciones del módulo Comercial'],
    [sicaf.id, 'sicaf-inventario.jpg', 'Inventario', 'Inicio del módulo de Inventario con alertas y movimientos'],
    [ruta.id, 'ruta-toche-inicio.jpg', 'Bienvenida e inicio', 'Pantallas de bienvenida e inicio en el celular'],
    [ruta.id, 'ruta-toche-rutas-punto.jpg', 'Rutas y punto turístico', 'Pantallas de rutas por tiempo y del Parque Santander con el comparador antes y hoy'],
    [ruta.id, 'ruta-toche-pasaporte-ayuda.jpg', 'Pasaporte y ayuda', 'Pantallas del pasaporte de estampas y de ayuda con el 123'],
    [ruta.id, 'ruta-toche-computador.jpg', 'Vista en computador', 'Vista en el computador con el panel para saltar entre pantallas'],
  ];
  for (const [i, [projectId, file, caption, alt]] of images.entries()) {
    await db.insert(projectImages).values({ projectId, path: await wide('projects', file), caption, alt, sortOrder: (i + 1) * 10 });
  }

  const projectTech: [number, string, string[]][] = [
    [sicaf.id, 'Pantalla', ['React', 'TypeScript', 'Vite', 'Tailwind CSS', 'shadcn/ui', 'React Router']],
    [sicaf.id, 'Servidor', ['PHP', 'XAMPP']],
    [sicaf.id, 'Datos', ['MariaDB']],
    [sicaf.id, 'Equipo', ['Git']],
    [ruta.id, 'App', ['HTML', 'CSS', 'JavaScript', 'PWA']],
    [ruta.id, 'Mapa', ['Leaflet', 'OpenStreetMap']],
    [ruta.id, 'Servicios de mapa', ['OSRM', 'Overpass', 'Nominatim']],
  ];
  for (const [projectId, category, names] of projectTech) {
    await db.insert(projectTechnologies).values(names.map((n) => ({ projectId, technologyId: tech(n), category })));
  }

  // Integrantes
  const [jenny] = await db
    .insert(members)
    .values({
      slug: 'jenny-zabaleta',
      fullName: 'Jenny Esmeralda Zabaleta Suárez',
      kind: 'docente',
      roleTitle: 'Docente directora',
      program: 'Ingeniería de Software',
      photoPath: await portrait('jenny-zabaleta.jpg', 0.1),
      status: 'published',
      featured: true,
      sortOrder: 1,
    })
    .returning({ id: members.id });

  const [neiber] = await db
    .insert(members)
    .values({
      slug: 'neiber-araque',
      fullName: 'Neiber Danilo Araque Pacheco',
      kind: 'estudiante',
      roleTitle: 'Líder estudiantil',
      program: 'Ingeniería de Software',
      semester: 7,
      joinedOn: 'Agosto de 2026',
      bio: 'Estudiante de 7.º semestre de Ingeniería de Software y tecnólogo en Análisis y Desarrollo de Software del SENA. Trabajó dos años como desarrollador full stack en Globaltronik: backend en Python sobre Frappe / ERPNext, frontend en React con Next.js y TypeScript, integraciones por APIs REST y automatización con n8n. En SINDES lidera el equipo estudiantil y aporta esa experiencia a SICAF y Ruta Toche.',
      interests:
        'Automatización de procesos con n8n, integración de inteligencia artificial en sistemas empresariales, ERP (Frappe / ERPNext) y visión por computador.',
      email: 'est_nd_araque@fesc.edu.co',
      githubUrl: 'https://github.com/neiber170205-rgb',
      photoPath: await portrait('neiber-araque.jpg', 0),
      status: 'published',
      sortOrder: 10,
      consentAt: new Date(),
      education: [
        { title: 'Ingeniería de Software', institution: 'FESC', period: '7.º semestre, en curso' },
        { title: 'Tecnólogo en Análisis y Desarrollo de Software', institution: 'SENA', period: '2024' },
      ],
      achievements: [{ title: '2.º puesto en la competencia de PPA de la FESC', detail: 'Con el proyecto SICAF', date: '2026' }],
    })
    .returning({ id: members.id });

  const [valery] = await db
    .insert(members)
    .values({ slug: 'valery-alarcon', fullName: 'Valery Alarcón', status: 'draft', sortOrder: 20 })
    .returning({ id: members.id });

  const neiberStack = [
    'React', 'Next.js', 'TypeScript', 'JavaScript', 'Tailwind CSS', 'shadcn/ui',
    'Python', 'Node.js', 'NestJS', 'ERPNext / Frappe',
    'SQL Server', 'PostgreSQL', 'MySQL', 'MariaDB', 'Redis', 'Prisma',
    'n8n', 'Docker', 'Git', 'Linux',
  ];
  await db.insert(memberTechnologies).values(neiberStack.map((n) => ({ memberId: neiber.id, technologyId: tech(n) })));

  await db.insert(projectMembers).values([
    { projectId: sicaf.id, memberId: jenny.id, role: 'Acompañamiento docente' },
    { projectId: sicaf.id, memberId: neiber.id, role: null },
    { projectId: sicaf.id, memberId: valery.id, role: 'Responsable de Producción' },
    { projectId: ruta.id, memberId: jenny.id, role: 'Acompañamiento docente' },
    { projectId: ruta.id, memberId: neiber.id, role: null },
  ]);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
