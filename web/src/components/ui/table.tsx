import * as React from 'react';
import { cn } from '@/lib/utils';

function Table({ className, ...props }: React.ComponentProps<'table'>) {
  return (
    <div className="relative w-full overflow-x-auto">
      <table className={cn('w-full caption-bottom text-sm', className)} {...props} />
    </div>
  );
}
const TableHeader = ({ className, ...props }: React.ComponentProps<'thead'>) => <thead className={cn('[&_tr]:border-b', className)} {...props} />;
const TableBody = ({ className, ...props }: React.ComponentProps<'tbody'>) => <tbody className={cn('[&_tr:last-child]:border-0', className)} {...props} />;
const TableRow = ({ className, ...props }: React.ComponentProps<'tr'>) => <tr className={cn('border-b transition-colors hover:bg-hielo/60 data-[state=selected]:bg-hielo', className)} {...props} />;
const TableHead = ({ className, ...props }: React.ComponentProps<'th'>) => (
  <th className={cn('h-11 px-3 text-left align-middle text-[13px] font-semibold whitespace-nowrap text-gris-2', className)} {...props} />
);
const TableCell = ({ className, ...props }: React.ComponentProps<'td'>) => <td className={cn('p-3 align-middle', className)} {...props} />;

export { Table, TableBody, TableCell, TableHead, TableHeader, TableRow };
