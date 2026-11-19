import { BadRequestException, PipeTransform } from '@nestjs/common';
import { z } from 'zod';

export class ZodPipe<T extends z.ZodTypeAny> implements PipeTransform {
  constructor(private readonly schema: T) {}
  transform(value: unknown): z.infer<T> {
    const parsed = this.schema.safeParse(value);
    if (!parsed.success) {
      const first = parsed.error.issues[0];
      const where = first?.path?.length ? `${first.path.join('.')}: ` : '';
      throw new BadRequestException(`${where}${first?.message ?? 'Datos inválidos'}`);
    }
    return parsed.data;
  }
}
