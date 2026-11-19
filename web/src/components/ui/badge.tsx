import { cva, type VariantProps } from 'class-variance-authority';
import * as React from 'react';
import { cn } from '@/lib/utils';

const badgeVariants = cva('inline-flex items-center justify-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold whitespace-nowrap shrink-0 [&>svg]:size-3', {
  variants: {
    variant: {
      default: 'bg-black text-white',
      secondary: 'bg-niebla text-black',
      outline: 'border border-input text-foreground',
      draft: 'bg-muted text-gris-2',
      pending: 'bg-[#FFF1D6] text-[#7A4B00]',
      published: 'bg-[#DDF3E4] text-[#14532D]',
      hidden: 'bg-[#FBE3E1] text-rojo-texto',
      azul: 'bg-azul text-black',
      marino: 'bg-marino text-white',
      rojo: 'bg-rojo text-white',
    },
  },
  defaultVariants: { variant: 'default' },
});

function Badge({ className, variant, ...props }: React.ComponentProps<'span'> & VariantProps<typeof badgeVariants>) {
  return <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
