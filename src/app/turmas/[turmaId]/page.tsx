'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Plus, Trash2, Users, BookOpen, Lightbulb } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Select } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert } from '@/components/ui/Alert';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoading } from '@/components/ui/Spinner';
import type { Disciplina, TurmaDetalhe } from '@/lib/types';

export default function TurmaPage({ params }: { params: { turmaId: string } }) {
  const [turma, setTurma] = useState<TurmaDetalhe | null>(null);
  const [disciplinasCatalogo, setDisciplinasCatalogo] = useState<Disciplina[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [disciplinaId, setDisciplinaId] = useState('');
  const [erroAdicionar, setErroAdicionar] = useState<string | null>(null);
  const [aGravar, setAGravar] = useState(false);

  async function carregar() {
    const [rt, rd] = await Promise.all([
      fetch(`/api/turmas/${params.turmaId}`),
      fetch('/api/disciplinas'),
    ]);
    if (!rt.ok) {
      setErro(rt.status === 404 ? 'Turma não encontrada.' : 'Não foi possível carregar a turma.');
      return;
    }
    setErro(null);
    setTurma(await rt.json());
    if (rd.ok) setDisciplinasCatalogo(await rd.json());
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.turmaId]);

  async function adicionarDisciplina(e: React.FormEvent) {
    e.preventDefault();
    setErroAdicionar(null);
    if (!disciplinaId) {
      setErroAdicionar('Selecione uma disciplina.');
      return;
    }
    setAGravar(true);
    const res = await fetch(`/api/turmas/${params.turmaId}/disciplinas`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disciplinaId }),
    });
    setAGravar(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErroAdicionar(body.error ?? 'Não foi possível associar a disciplina (já associada?).');
      return;
    }
    setDisciplinaId('');
    setMostrarForm(false);
    carregar();
  }

  async function removerDisciplina(turmaDisciplinaId: string, nome: string) {
    if (
      !confirm(
        `Remover "${nome}" desta turma? Isto apaga os critérios, instrumentos, notas e inscrições dessa disciplina. Esta ação não pode ser desfeita.`
      )
    )
      return;
    await fetch(`/api/turmas/${params.turmaId}/disciplinas/${turmaDisciplinaId}`, { method: 'DELETE' });
    carregar();
  }

  if (erro) {
    return (
      <AppShell>
        <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
          <ArrowLeft className="h-4 w-4" /> As minhas turmas
        </Link>
        <Alert tone="danger">{erro}</Alert>
      </AppShell>
    );
  }

  if (!turma) {
    return (
      <AppShell>
        <PageLoading />
      </AppShell>
    );
  }

  const disciplinasDisponiveis = disciplinasCatalogo.filter(
    (d) => !turma.disciplinas.some((td) => td.disciplina.id === d.id)
  );

  return (
    <AppShell>
      <Link href="/dashboard" className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> As minhas turmas
      </Link>
      <p className="text-sm text-slate-500">{turma.anoLetivo.nome}</p>
      <h1 className="mb-4 text-2xl font-semibold tracking-tight text-slate-900">{turma.nome}</h1>

      <Alert tone="info" className="mb-6">
        <p className="font-medium">Como avançar nesta turma</p>
        <ol className="mt-1 list-decimal space-y-0.5 pl-4">
          <li className={turma.alunos.length > 0 ? 'line-through opacity-60' : ''}>
            Adicione os alunos da turma.
          </li>
          <li className={turma.disciplinas.length > 0 ? 'line-through opacity-60' : ''}>
            Associe as disciplinas que leciona.
          </li>
          <li>
            Dentro de cada disciplina, defina os critérios (pesos a somar 100%) e inscreva os alunos.
          </li>
          <li>Por período, crie instrumentos de avaliação e lance as notas; o resumo calcula-se sozinho.</li>
        </ol>
      </Alert>

      <Link
        href={`/turmas/${turma.id}/alunos`}
        className="flex items-center justify-between rounded-lg border border-slate-200 bg-white p-4 shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-md bg-brand-50 text-brand-600">
            <Users className="h-4 w-4" />
          </span>
          <div>
            <p className="font-semibold text-slate-900">Alunos</p>
            <p className="text-sm text-slate-500">{turma.alunos.length} alunos na turma</p>
          </div>
        </div>
      </Link>

      <div className="mt-8 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-slate-900">Disciplinas</h2>
        <Button size="sm" onClick={() => setMostrarForm((v) => !v)}>
          <Plus className="h-4 w-4" />
          Associar disciplina
        </Button>
      </div>

      {mostrarForm && (
        <Card as="form" onSubmit={adicionarDisciplina} className="mt-3 flex flex-wrap items-end gap-3 p-4">
          <div className="min-w-[220px] flex-1">
            <Label htmlFor="disciplina">Disciplina</Label>
            <Select id="disciplina" value={disciplinaId} onChange={(e) => setDisciplinaId(e.target.value)}>
              <option value="">Selecionar…</option>
              {disciplinasDisponiveis.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </Select>
            {disciplinasDisponiveis.length === 0 && (
              <p className="mt-1 text-xs text-slate-400">
                Todas as disciplinas do seu catálogo já estão associadas a esta turma, ou ainda não
                criou nenhuma em{' '}
                <Link href="/disciplinas" className="text-brand-600 hover:underline">
                  Disciplinas
                </Link>
                .
              </p>
            )}
          </div>
          <Button type="submit" loading={aGravar}>
            {aGravar ? 'A associar…' : 'Associar'}
          </Button>
          {erroAdicionar && (
            <div className="w-full">
              <Alert tone="danger">{erroAdicionar}</Alert>
            </div>
          )}
        </Card>
      )}

      <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {turma.disciplinas.map((td) => (
          <div key={td.id} className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-start justify-between gap-2">
              <Link
                href={`/turmas/${turma.id}/disciplinas/${td.id}`}
                className="font-semibold text-slate-900 hover:text-brand-700"
              >
                {td.disciplina.nome}
              </Link>
              <button
                onClick={() => removerDisciplina(td.id, td.disciplina.nome)}
                aria-label="Remover disciplina"
                title="Apaga também critérios, instrumentos, notas e inscrições desta disciplina nesta turma"
                className="rounded-md p-1 text-slate-400 hover:bg-red-50 hover:text-red-600"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <p className="mt-1 text-xs text-slate-400">
              {td.disciplina.ciclos.length > 0 ? td.disciplina.ciclos.map((dc) => dc.ciclo.nome).join(', ') : '—'}
            </p>
            <p className="mt-3 flex items-start gap-1.5 rounded-md bg-brand-50 px-2 py-1.5 text-xs text-brand-700">
              <Lightbulb className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Abra para definir critérios e inscrever alunos.
            </p>
          </div>
        ))}
        {turma.disciplinas.length === 0 && (
          <div className="sm:col-span-2 lg:col-span-3">
            <Card>
              <EmptyState
                icon={BookOpen}
                title="Sem disciplinas associadas"
                description="Associe a primeira disciplina desta turma acima."
              />
            </Card>
          </div>
        )}
      </div>
    </AppShell>
  );
}
