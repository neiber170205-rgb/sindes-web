import { Toaster as Sonner, type ToasterProps } from 'sonner';

const Toaster = (props: ToasterProps) => (
  <Sonner
    position="bottom-right"
    toastOptions={{
      classNames: {
        toast: '!rounded-xl !border-2 !border-black !shadow-[4px_4px_0_#000] !font-sans',
        title: '!font-semibold',
        error: '!border-rojo',
      },
    }}
    {...props}
  />
);

export { Toaster };
