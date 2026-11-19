import { Tabs as TabsPrimitive } from 'radix-ui';
import * as React from 'react';
import { cn } from '@/lib/utils';

const Tabs = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Root>) => <TabsPrimitive.Root className={cn('flex flex-col gap-5', className)} {...props} />;
function TabsList({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn('inline-flex w-fit max-w-full flex-wrap items-center gap-1 rounded-full bg-muted p-1', className)} {...props} />;
}
function TabsTrigger({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'inline-flex h-9 cursor-pointer items-center justify-center gap-1.5 rounded-full px-4 text-sm font-semibold whitespace-nowrap text-gris-2 transition-colors outline-none hover:text-black focus-visible:ring-[3px] focus-visible:ring-azul/40 data-[state=active]:bg-black data-[state=active]:text-white',
        className,
      )}
      {...props}
    />
  );
}
const TabsContent = ({ className, ...props }: React.ComponentProps<typeof TabsPrimitive.Content>) => <TabsPrimitive.Content className={cn('outline-none', className)} {...props} />;

export { Tabs, TabsContent, TabsList, TabsTrigger };
