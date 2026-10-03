import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { getServerSession } from 'next-auth';
import { ArrowLeft } from 'lucide-react';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { criterioInclude } from '@/lib/criterios';
import AppShell from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import AcoesCriterio from './AcoesCriterio';

function formatarPeso(peso: number | null) {
  return peso === null ? 'sem peso' : `${Math.round(peso * 10000) / 100}%`;
}

/**
 * Detalhe de um critério (Server Component — só apresenta dados). Segue o
 * padrão de sessão/papel de src/app/disciplinas/[disciplinaId]/page.tsx.
 */
export default async function CriterioShowPage({ params }: { params: { criterioId: string } }) {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as { id?: string } | undefined)?.id;
  if (!userId) redirect('/login');

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { role: true } });
  const isAdmin = user?.role === 'ADMIN';

  const criterio = await prisma.criterio.findUnique({
    where: { id: params.criterioId },
    include: criterioInclude,
  });
  if (!criterio) notFound();

  return (
    <AppShell>
      <Link
        href="/criterios"
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar aos critérios
      </Link>

      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">{criterio.nome}</h1>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <Badge tone={criterio.tipo === 'GERAL' ? 'brand' : 'warning'}>
              {criterio.tipo === 'GERAL' ? 'Geral' : 'Específico'}
            </Badge>
            <Badge>{criterio.anoLetivo.nome}</Badge>
            <Badge>{criterio.ciclo.nome}</Badge>
          </div>
        </div>
        {isAdmin && <AcoesCriterio criterioId={criterio.id} nome={criterio.nome} />}
      </div>

      <Card className="flex flex-col gap-4 p-4">
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Peso</h2>
          <p className="mt-1 text-sm text-slate-700">{formatarPeso(criterio.peso)}</p>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Grupo disciplinar</h2>
          <p className="mt-1 text-sm text-slate-700">
            {criterio.grupoDisciplinar?.nome ?? 'Todas as disciplinas do ciclo'}
          </p>
        </div>
        <div>
          <h2 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Instrumentos de recolha</h2>
          {criterio.instrumentosRecolha.length === 0 ? (
            <p className="mt-1 text-sm text-slate-400">Ainda sem instrumentos de recolha.</p>
          ) : (
            <ul className="mt-2 flex flex-col gap-2">
              {criterio.instrumentosRecolha.map((ir) => (
                <li key={ir.id} className="rounded-md border border-slate-200 px-3 py-2">
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="font-medium text-slate-900">{ir.nome}</span>
                    <span className="text-slate-500">{formatarPeso(ir.peso)}</span>
                  </div>
                  {ir.subInstrumentos.length > 0 && (
                    <ul className="mt-2 flex flex-col gap-1 border-l-2 border-slate-200 pl-3">
                      {ir.subInstrumentos.map((s) => (
                        <li key={s.id} className="flex items-center justify-between gap-2 text-sm text-slate-600">
                          <span>{s.nome}</span>
                          <span className="text-slate-500">{formatarPeso(s.peso)}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      </Card>
    </AppShell>
  );
}
