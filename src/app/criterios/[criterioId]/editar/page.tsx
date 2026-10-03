'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { ArrowLeft, Trash2 } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { PageLoading } from '@/components/ui/Spinner';
import CriterioForm, { valoresDeCriterio, type CriterioPayload } from '../../CriterioForm';
import type { CriterioCatalogo } from '@/lib/types';

export default function EditarCriterioPage({ params }: { params: { criterioId: string } }) {
  const { data: session, status } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'ADMIN';
  const router = useRouter();

  const [criterio, setCriterio] = useState<CriterioCatalogo | null>(null);
  const [aCarregar, setACarregar] = useState(true);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aEnviar, setAEnviar] = useState(false);

  useEffect(() => {
    fetch(`/api/criterios/${params.criterioId}`)
      .then((r) => {
        if (!r.ok) throw new Error();
        return r.json();
      })
      .then((c: CriterioCatalogo) => {
        setCriterio(c);
        setACarregar(false);
      })
      .catch(() => {
        setErroCarregar('Não foi possível carregar o critério.');
        setACarregar(false);
      });
  }, [params.criterioId]);

  const valoresIniciais = useMemo(() => (criterio ? valoresDeCriterio(criterio) : undefined), [criterio]);

  async function guardar(payload: CriterioPayload) {
    setErro(null);
    setAEnviar(true);
    const res = await fetch(`/api/criterios/${params.criterioId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    setAEnviar(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErro(body.error ?? 'Não foi possível guardar o critério.');
      return;
    }
    router.push(`/criterios/${params.criterioId}`);
  }

  async function remover() {
    if (!criterio) return;
    if (!confirm(`Eliminar o critério "${criterio.nome}" e os seus instrumentos? Esta ação não pode ser desfeita.`)) return;
    await fetch(`/api/criterios/${params.criterioId}`, { method: 'DELETE' });
    router.push('/criterios');
  }

  return (
    <AppShell>
      <Link
        href={`/criterios/${params.criterioId}`}
        className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar ao critério
      </Link>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Editar critério</h1>
        {criterio && isAdmin && (
          <Button type="button" variant="danger" onClick={remover}>
            <Trash2 className="h-4 w-4" />
            Eliminar
          </Button>
        )}
      </div>

      {status !== 'loading' && !isAdmin ? (
        <Alert tone="danger">Apenas administradores podem editar critérios.</Alert>
      ) : erroCarregar ? (
        <Alert tone="danger">{erroCarregar}</Alert>
      ) : aCarregar || !valoresIniciais ? (
        <PageLoading />
      ) : (
        <CriterioForm
          valoresIniciais={valoresIniciais}
          aoSubmeter={guardar}
          aEnviar={aEnviar}
          erro={erro}
          textoSubmeter="Guardar alterações"
          cancelarHref={`/criterios/${params.criterioId}`}
        />
      )}
    </AppShell>
  );
}
