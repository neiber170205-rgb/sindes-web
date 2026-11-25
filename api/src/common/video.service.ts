import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { and, eq, lt, ne } from 'drizzle-orm';
import { ChildProcess, spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { stat, statfs, unlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import sharp from 'sharp';
import { Db, InjectDb } from '../db/db.module';
import { projectVideos } from '../db/schema';
import { UploadsService } from './uploads.service';

/** Tamaño máximo del archivo que se sube (por defecto 2 GB). */
export const MAX_VIDEO_BYTES = Number(process.env.MAX_VIDEO_MB ?? 2048) * 1024 * 1024;
/** Duración máxima aceptada. */
export const MAX_VIDEO_SECONDS = 30 * 60;
/** Los originales esperan aquí mientras se procesan: fuera de /uploads, así nunca son públicos. */
export const VIDEO_TMP_DIR = process.env.VIDEO_TMP_DIR ?? join(tmpdir(), 'sindes-videos');

type Probe = { duration: number; width: number; height: number };
type Job = { id: number; projectId: number };

/** Error con un mensaje que se le puede mostrar a la persona. */
export class FriendlyError extends Error {}

/**
 * Convierte cada video subido a MP4 H.264 (máx. 1280 px por lado, 30 fps, AAC) con «faststart»
 * para que empiece a reproducirse sin bajarlo completo, y saca una portada.
 * Procesa de a uno para no ahogar un VPS pequeño.
 */
@Injectable()
export class VideoService implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly log = new Logger('Video');
  private readonly queue: Job[] = [];
  private current?: Job & { child?: ChildProcess; cancelled?: boolean };
  private readonly progress = new Map<number, number>();

  constructor(@InjectDb() private readonly db: Db, private readonly uploads: UploadsService) {}

  async onApplicationBootstrap() {
    // Si el servidor se reinició a mitad de un proceso, se retoma lo que todavía tenga original.
    const stuck = await this.db.select().from(projectVideos).where(eq(projectVideos.status, 'processing'));
    for (const v of stuck) {
      if (v.sourcePath && existsSync(v.sourcePath)) this.enqueue({ id: v.id, projectId: v.projectId });
      else await this.fail(v.id, 'El servidor se reinició mientras se procesaba. Súbelo de nuevo.');
    }
  }

  onModuleDestroy() {
    this.current?.child?.kill('SIGKILL');
  }

  /** Revisa que haya espacio en disco para guardar el original y su versión final. */
  async assertSpace(bytes: number) {
    try {
      const fs = await statfs(this.uploads.root);
      const free = fs.bavail * fs.bsize;
      if (free < bytes * 1.5 + 512 * 1024 * 1024) {
        throw new FriendlyError('El servidor no tiene espacio suficiente para este video. Libera espacio o súbelo más liviano.');
      }
    } catch (e) {
      if (e instanceof FriendlyError) throw e;
    }
  }

  enqueue(job: Job) {
    this.queue.push(job);
    void this.next();
  }

  /** Avance del proceso (0–99) o la posición en la fila si todavía no empieza. */
  state(id: number): { percent: number; waiting: number } {
    const waiting = this.queue.findIndex((j) => j.id === id);
    return { percent: this.progress.get(id) ?? 0, waiting: waiting >= 0 ? waiting + 1 : 0 };
  }

  /** Detiene lo que se esté procesando de un proyecto (al reemplazar o quitar su video). */
  cancelProject(projectId: number) {
    for (let i = this.queue.length - 1; i >= 0; i--) if (this.queue[i].projectId === projectId) this.queue.splice(i, 1);
    if (this.current?.projectId === projectId) {
      this.current.cancelled = true;
      this.current.child?.kill('SIGKILL');
    }
  }

  private async next() {
    if (this.current) return;
    const job = this.queue.shift();
    if (!job) return;
    this.current = job;
    const started = Date.now();
    try {
      await this.process(job);
      this.log.log(`Video ${job.id} listo en ${Math.round((Date.now() - started) / 1000)} s`);
    } catch (e) {
      if (!this.current?.cancelled) {
        this.log.warn(`Video ${job.id} falló: ${e instanceof Error ? e.message : e}`);
        await this.fail(job.id, e instanceof FriendlyError ? e.message : 'No se pudo procesar este video. Prueba exportándolo de nuevo en MP4.');
      }
    } finally {
      this.progress.delete(job.id);
      this.current = undefined;
      void this.next();
    }
  }

  private run(cmd: string, args: string[], onLine?: (line: string) => void) {
    return new Promise<Buffer>((resolve, reject) => {
      const child = spawn(cmd, args, { stdio: ['ignore', 'pipe', 'pipe'] });
      if (this.current) this.current.child = child;
      const out: Buffer[] = [];
      let err = '';
      let pending = '';
      child.stdout.on('data', (d: Buffer) => {
        if (onLine) {
          pending += d.toString();
          const lines = pending.split('\n');
          pending = lines.pop() ?? '';
          lines.forEach(onLine);
        } else out.push(d);
      });
      child.stderr.on('data', (d: Buffer) => (err = (err + d.toString()).slice(-2000)));
      child.on('error', reject);
      child.on('close', (code) => (code === 0 ? resolve(Buffer.concat(out)) : reject(new Error(`${cmd} salió con ${code}: ${err.trim().split('\n').pop()}`))));
    });
  }

  private async probe(file: string): Promise<Probe> {
    const raw = await this.run('ffprobe', ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file]);
    const info = JSON.parse(raw.toString()) as {
      format?: { duration?: string };
      streams?: { codec_type: string; width?: number; height?: number; duration?: string; tags?: { rotate?: string }; side_data_list?: { rotation?: number }[] }[];
    };
    const v = info.streams?.find((s) => s.codec_type === 'video');
    if (!v?.width || !v.height) throw new FriendlyError('Ese archivo no tiene una pista de video que se pueda leer.');
    const rotation = Math.abs(Number(v.side_data_list?.find((s) => s.rotation !== undefined)?.rotation ?? v.tags?.rotate ?? 0)) % 180;
    const duration = Number(info.format?.duration ?? v.duration ?? 0);
    return { duration, width: rotation === 90 ? v.height : v.width, height: rotation === 90 ? v.width : v.height };
  }

  private async process(job: Job) {
    const [v] = await this.db.select().from(projectVideos).where(eq(projectVideos.id, job.id));
    if (!v || v.status !== 'processing' || !v.sourcePath) return;
    const src = v.sourcePath;
    const info = await this.probe(src);
    if (!(info.duration >= 1)) throw new FriendlyError('No se pudo leer la duración del video.');
    if (info.duration > MAX_VIDEO_SECONDS) throw new FriendlyError('El video dura más de 30 minutos. Súbelo más corto.');

    const out = await this.uploads.reserve('videos', '.mp4');
    try {
      await this.run(
        'ffmpeg',
        [
          '-hide_banner', '-nostdin', '-y',
          '-i', src,
          '-map', '0:v:0', '-map', '0:a:0?',
          '-vf', "scale='min(1280,iw)':'min(1280,ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,format=yuv420p",
          '-fpsmax', '30',
          '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '26', '-profile:v', 'high',
          '-c:a', 'aac', '-b:a', '128k', '-ac', '2',
          '-movflags', '+faststart',
          '-progress', 'pipe:1', '-nostats',
          out.abs,
        ],
        (line) => {
          if (!line.startsWith('out_time_us=')) return;
          const t = Number(line.slice(12)) / 1e6;
          if (Number.isFinite(t)) this.progress.set(job.id, Math.max(0, Math.min(99, Math.round((t / info.duration) * 100))));
        },
      );
      const frame = await this.run('ffmpeg', ['-hide_banner', '-nostdin', '-ss', String(Math.min(2, info.duration / 3)), '-i', out.abs, '-frames:v', '1', '-f', 'image2pipe', '-vcodec', 'mjpeg', 'pipe:1']);
      const poster = await this.uploads.importFile('videos', await sharp(frame).resize({ width: 720, height: 720, fit: 'inside', withoutEnlargement: true }).webp({ quality: 80 }).toBuffer(), '.webp');
      const final = await this.probe(out.abs);
      const size = (await stat(out.abs)).size;

      const [saved] = await this.db
        .update(projectVideos)
        .set({
          status: 'ready',
          path: out.rel,
          posterPath: poster,
          durationSec: Math.round(info.duration),
          width: final.width,
          height: final.height,
          sizeBytes: Math.min(size, 2_147_483_647),
          sourcePath: null,
          error: null,
          updatedAt: new Date(),
        })
        .where(and(eq(projectVideos.id, job.id), eq(projectVideos.status, 'processing')))
        .returning({ id: projectVideos.id });
      if (!saved) {
        // Lo quitaron mientras se procesaba
        await this.uploads.remove(out.rel);
        await this.uploads.remove(poster);
      }
      await unlink(src).catch(() => undefined);

      // El video nuevo reemplaza a los anteriores del mismo proyecto
      const old = await this.db
        .delete(projectVideos)
        .where(and(eq(projectVideos.projectId, job.projectId), ne(projectVideos.id, job.id), lt(projectVideos.id, job.id)))
        .returning();
      for (const o of old) await this.removeFiles(o);
    } catch (e) {
      await this.uploads.remove(out.rel);
      throw e;
    }
  }

  private async fail(id: number, message: string) {
    // El original ya no sirve: se borra para no llenar el disco
    const [row] = await this.db.select({ sourcePath: projectVideos.sourcePath }).from(projectVideos).where(eq(projectVideos.id, id));
    if (row?.sourcePath) await unlink(row.sourcePath).catch(() => undefined);
    await this.db.update(projectVideos).set({ status: 'error', error: message, sourcePath: null, updatedAt: new Date() }).where(eq(projectVideos.id, id));
  }

  async removeFiles(v: { sourcePath: string | null; path: string | null; posterPath: string | null }) {
    if (v.sourcePath) await unlink(v.sourcePath).catch(() => undefined);
    await this.uploads.remove(v.path);
    await this.uploads.remove(v.posterPath);
  }
}
