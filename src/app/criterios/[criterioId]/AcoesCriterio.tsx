'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function AcoesCriterio({ criterioId, nome }: { criterioId: string; nome: string }) {
  const router = useRouter();

  async function remover() {
    if (!confirm(`Eliminar o critério "${nome}" e os seus instrumentos? Esta ação não pode ser desfeita.`)) return;
    const res = await fetch(`/api/criterios/${criterioId}`, { method: 'DELETE' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      alert(body.error ?? 'Não foi possível eliminar o critério.');
      return;
    }
    router.push('/criterios');
  }

  return (
    <div className="flex gap-2">
      <Link href={`/criterios/${criterioId}/editar`}>
        <Button type="button" variant="secondary">
          <Pencil className="h-4 w-4" />
          Editar
        </Button>
      </Link>
      <Button type="button" variant="danger" onClick={remover}>
        <Trash2 className="h-4 w-4" />
        Eliminar
      </Button>
    </div>
  );
}
