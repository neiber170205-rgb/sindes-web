import { useQuery } from '@tanstack/react-query';
import { Link2, Loader2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { api, errorText } from '@/lib/api';
import type { AdminMember, Project, Tech } from '@/lib/types';
import { CopyButton } from './ui';

export const useAdminMembers = () => useQuery({ queryKey: ['admin', 'members'], queryFn: () => api.get<AdminMember[]>('/admin/members') });
export const useAdminProjects = () => useQuery({ queryKey: ['admin', 'projects'], queryFn: () => api.get<Project[]>('/admin/projects') });
export const useTechnologies = () => useQuery({ queryKey: ['admin', 'technologies'], queryFn: () => api.get<Tech[]>('/admin/technologies') });

export function whatsappText(name: string, link: string) {
  const first = name.split(' ')[0];
  return `Hola ${first}, este es tu link para armar tu perfil en la página de SINDES: ${link}\nLlénalo con tus datos y tu foto, y al final dale «Enviar a revisión». El link es solo tuyo.`;
}

/** Mensaje para el grupo con el link general. */
export function groupText(link: string) {
  return `¡Hola, equipo! Estamos armando la página de SINDES. Entren a este link, escriban su nombre y su correo @fesc.edu.co, llenen su perfil y suban su foto: ${link}\nAl final denle «Enviar a revisión». Guarden el link personal que les queda para volver después.`;
}

/** Genera un link personal nuevo para alguien y lo muestra para copiar. */
export function InviteButton({ member, onDone, variant = 'outline', size = 'sm' }: { member: { id: number; fullName: string }; onDone?: () => void; variant?: 'outline' | 'default' | 'ghost'; size?: 'sm' | 'default' }) {
  const [link, setLink] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const make = async () => {
    setBusy(true);
    try {
      const r = await api.post<{ link: string }>(`/admin/members/${member.id}/invite`, { days: 21 });
      setLink(r.link);
      onDone?.();
    } catch (e) {
      toast.error(errorText(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button type="button" variant={variant} size={size} onClick={make} disabled={busy}>
        {busy ? <Loader2 className="animate-spin" /> : <Link2 />}
        Link nuevo
      </Button>
      <Dialog open={!!link} onOpenChange={(o) => !o && setLink(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Link para {member.fullName.split(' ')[0]}</DialogTitle>
            <DialogDescription>Vale por 21 días. El link anterior dejó de funcionar. Cópialo ahora: por seguridad no se guarda.</DialogDescription>
          </DialogHeader>
          <Input readOnly value={link ?? ''} onFocus={(e) => e.currentTarget.select()} className="font-mono text-xs" />
          <DialogFooter>
            <CopyButton text={whatsappText(member.fullName, link ?? '')} label="Copiar mensaje" copied="Mensaje copiado" />
            <CopyButton text={link ?? ''} label="Copiar link" variant="default" />
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
