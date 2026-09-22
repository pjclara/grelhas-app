'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

export default function AcoesDisciplina({
  disciplinaId,
  nome,
  turmasAssociadas,
}: {
  disciplinaId: string;
  nome: string;
  turmasAssociadas: number;
}) {
  const router = useRouter();

  async function remover() {
    const aviso =
      turmasAssociadas > 0
        ? `A disciplina "${nome}" tem ${turmasAssociadas} turma(s) associada(s). Eliminá-la apaga também essas turmas, alunos e notas. Esta ação não pode ser desfeita. Continuar?`
        : `Eliminar a disciplina "${nome}"?`;
    if (!confirm(aviso)) return;
    await fetch(`/api/disciplinas/${disciplinaId}`, { method: 'DELETE' });
    router.push('/disciplinas');
  }

  return (
    <div className="flex gap-2">
      <Link href={`/disciplinas/${disciplinaId}/editar`}>
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
