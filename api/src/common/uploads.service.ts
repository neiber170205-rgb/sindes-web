import { BadRequestException, Injectable } from '@nestjs/common';
import { randomBytes } from 'node:crypto';
import { mkdir, unlink, writeFile } from 'node:fs/promises';
import { dirname, extname, join, normalize } from 'node:path';
import sharp from 'sharp';

export type UploadKind = 'members' | 'projects' | 'gallery' | 'logos' | 'videos';

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif', 'image/gif'];
export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;

@Injectable()
export class UploadsService {
  readonly root = process.env.UPLOAD_DIR ?? join(process.cwd(), 'uploads');

  private async save(kind: UploadKind, ext: string, data: Buffer): Promise<string> {
    const rel = `${kind}/${Date.now().toString(36)}-${randomBytes(5).toString('hex')}${ext}`;
    const abs = join(this.root, rel);
    await mkdir(dirname(abs), { recursive: true });
    await writeFile(abs, data);
    return rel;
  }

  private assertImage(file?: Express.Multer.File) {
    if (!file) throw new BadRequestException('Falta el archivo');
    if (file.size > MAX_UPLOAD_BYTES) throw new BadRequestException('La imagen pesa más de 8 MB');
    if (!IMAGE_TYPES.includes(file.mimetype)) throw new BadRequestException('Formato no admitido: usa JPG, PNG o WebP');
  }

  /** Retrato 4:5, 900×1125, WebP. */
  async savePortrait(file?: Express.Multer.File): Promise<string> {
    this.assertImage(file);
    const out = await sharp(file!.buffer)
      .rotate()
      .resize(900, 1125, { fit: 'cover', position: sharp.strategy.attention })
      .webp({ quality: 84 })
      .toBuffer()
      .catch(() => {
        throw new BadRequestException('No se pudo leer la imagen');
      });
    return this.save('members', '.webp', out);
  }

  /** Captura o foto ancha: máximo 1800 px de ancho, WebP. */
  async saveWide(kind: 'projects' | 'gallery', file?: Express.Multer.File): Promise<string> {
    this.assertImage(file);
    const out = await sharp(file!.buffer)
      .rotate()
      .resize({ width: 1800, withoutEnlargement: true })
      .webp({ quality: 82 })
      .toBuffer()
      .catch(() => {
        throw new BadRequestException('No se pudo leer la imagen');
      });
    return this.save(kind, '.webp', out);
  }

  /** Logo: SVG (limpiado) o imagen reducida a 256 px. */
  async saveLogo(file?: Express.Multer.File): Promise<string> {
    if (!file) throw new BadRequestException('Falta el archivo');
    if (file.size > 512 * 1024) throw new BadRequestException('El logo pesa más de 512 KB');
    if (file.mimetype === 'image/svg+xml' || extname(file.originalname).toLowerCase() === '.svg') {
      const svg = file.buffer.toString('utf8');
      if (/<script|on\w+\s*=|javascript:|<foreignObject/i.test(svg)) {
        throw new BadRequestException('El SVG trae código no permitido');
      }
      return this.save('logos', '.svg', Buffer.from(svg));
    }
    this.assertImage(file);
    const out = await sharp(file.buffer).resize(256, 256, { fit: 'inside' }).png().toBuffer();
    return this.save('logos', '.png', out);
  }

  async remove(rel?: string | null) {
    if (!rel || /^https?:/.test(rel)) return;
    const abs = normalize(join(this.root, rel));
    if (!abs.startsWith(normalize(this.root))) return;
    await unlink(abs).catch(() => undefined);
  }

  /** Ruta nueva y vacía dentro de /uploads para que otro proceso (ffmpeg) escriba ahí. */
  async reserve(kind: UploadKind, ext: string) {
    const rel = `${kind}/${Date.now().toString(36)}-${randomBytes(5).toString('hex')}${ext}`;
    const abs = join(this.root, rel);
    await mkdir(dirname(abs), { recursive: true });
    return { rel, abs };
  }

  async importFile(kind: UploadKind, buffer: Buffer, ext: string): Promise<string> {
    return this.save(kind, ext, buffer);
  }
}
