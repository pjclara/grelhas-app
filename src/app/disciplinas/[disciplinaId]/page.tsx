import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { ArrowLeft } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import AppShell from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import AcoesDisciplina from './AcoesDisciplina';

/**
 * Detalhe de uma disciplina (Server Component — sem interatividade, só
 * apresenta dados). Segue o padrão de sessão/papel de
 * src/app/admin/layout.tsx.
 */
export default async function DisciplinaShowPage({ params }: { params: { disciplinaId: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect('/login');

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  const isAdmin = user?.role === 'ADMIN';

  const disciplina = await prisma.disciplina.findUnique({
    where: { id: params.disciplinaId },
    include: {
      grupoDisciplinar: true,
      ciclos: { include: { ciclo: true } },
      anosEscolaridade: { include: { anoEscolaridade: true } },
      _count: { select: { turmaDisciplinas: true } },
    },
  });
  if (!disciplina) notFound();

  return (
    <AppShell>
      <Link
        href="/disciplinas"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar às disciplinas
      </Link>

      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{disciplina.nome}</h1>
          <Badge tone={disciplina.ativo ? 'success' : 'neutral'} className="mt-2">
            {disciplina.ativo ? 'Ativo' : 'Inativo'}
          </Badge>
        </div>
        {isAdmin && (
          <AcoesDisciplina
            disciplinaId={disciplina.id}
            nome={disciplina.nome}
            turmasAssociadas={disciplina._count.turmaDisciplinas}
          />
        )}
      </div>

      <Card className="flex flex-col gap-4 p-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Grupo Disciplinar</h2>
          <p className="mt-1 text-sm text-slate-700">{disciplina.grupoDisciplinar?.nome ?? '—'}</p>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Ciclos</h2>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {disciplina.ciclos.length === 0 ? (
              <span className="text-sm text-slate-400">—</span>
            ) : (
              disciplina.ciclos.map((dc) => <Badge key={dc.id}>{dc.ciclo.nome}</Badge>)
            )}
          </div>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Anos de Escolaridade</h2>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {disciplina.anosEscolaridade.length === 0 ? (
              <span className="text-sm text-slate-400">—</span>
            ) : (
              disciplina.anosEscolaridade.map((da) => <Badge key={da.id}>{da.anoEscolaridade.nome}</Badge>)
            )}
          </div>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Turmas associadas</h2>
          <p className="mt-1 text-sm text-slate-700">{disciplina._count.turmaDisciplinas}</p>
        </div>
      </Card>
    </AppShell>
  );
}
