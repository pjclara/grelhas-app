'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import TopNav from '@/components/TopNav';
import type { Disciplina, AnoLetivo, Turma } from '@/lib/types';

export default function DashboardPage() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [anos, setAnos] = useState<AnoLetivo[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);

  async function carregarTudo() {
    setACarregar(true);
    const [rt, rd, ra] = await Promise.all([
      fetch('/api/turmas'),
      fetch('/api/disciplinas'),
      fetch('/api/anos-letivos'),
    ]);
    setTurmas(await rt.json());
    setDisciplinas(await rd.json());
    setAnos(await ra.json());
    setACarregar(false);
  }

  useEffect(() => {
    carregarTudo();
  }, []);

  return (
    <div>
      <TopNav />
      <main className="mx-auto max-w-5xl px-6 py-8">
        <div className="mb-6 flex items-center justify-between">
          <h1 className="text-2xl font-semibold text-slate-900">As minhas turmas</h1>
          <button
            onClick={() => setMostrarForm((v) => !v)}
            className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700"
          >
            {mostrarForm ? 'Cancelar' : '+ Nova turma'}
          </button>
        </div>

        {mostrarForm && (
          <NovaTurmaForm
            disciplinas={disciplinas}
            anos={anos}
            onCriada={() => {
              setMostrarForm(false);
              carregarTudo();
            }}
            onDisciplinasAtualizadas={setDisciplinas}
            onAnosAtualizados={setAnos}
          />
        )}

        {aCarregar ? (
          <p className="text-sm text-slate-500">A carregar…</p>
        ) : turmas.length === 0 ? (
          <p className="text-sm text-slate-500">Ainda não tem turmas. Crie a primeira acima.</p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {turmas.map((t) => (
              <Link
                key={t.id}
                href={`/turmas/${t.id}`}
                className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md"
              >
                <p className="font-semibold text-slate-900">{t.nome}</p>
                <p className="text-sm text-slate-500">{t.disciplina.nome}</p>
                <p className="text-xs text-slate-400">{t.anoLetivo.nome}</p>
                <p className="mt-2 text-xs text-slate-500">{t._count?.alunos ?? 0} alunos</p>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

function NovaTurmaForm({
  disciplinas,
  anos,
  onCriada,
  onDisciplinasAtualizadas,
  onAnosAtualizados,
}: {
  disciplinas: Disciplina[];
  anos: AnoLetivo[];
  onCriada: () => void;
  onDisciplinasAtualizadas: (d: Disciplina[]) => void;
  onAnosAtualizados: (a: AnoLetivo[]) => void;
}) {
  const [nome, setNome] = useState('');
  const [nivelEnsino, setNivelEnsino] = useState('');
  const [disciplinaId, setDisciplinaId] = useState('');
  const [anoLetivoId, setAnoLetivoId] = useState('');
  const [novaDisciplina, setNovaDisciplina] = useState('');
  const [novoAno, setNovoAno] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [aGravar, setAGravar] = useState(false);

  async function adicionarDisciplina() {
    if (!novaDisciplina.trim()) return;
    const res = await fetch('/api/disciplinas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: novaDisciplina.trim() }),
    });
    if (res.ok) {
      const nova = await res.json();
      onDisciplinasAtualizadas([...disciplinas, nova]);
      setDisciplinaId(nova.id);
      setNovaDisciplina('');
    }
  }

  async function adicionarAno() {
    if (!novoAno.trim()) return;
    const res = await fetch('/api/anos-letivos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome: novoAno.trim() }),
    });
    if (res.ok) {
      const novo = await res.json();
      onAnosAtualizados([novo, ...anos]);
      setAnoLetivoId(novo.id);
      setNovoAno('');
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!disciplinaId || !anoLetivoId || !nome) {
      setErro('Preencha disciplina, ano letivo e nome da turma.');
      return;
    }
    setAGravar(true);
    const res = await fetch('/api/turmas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ disciplinaId, anoLetivoId, nome, nivelEnsino: nivelEnsino || null }),
    });
    setAGravar(false);
    if (!res.ok) {
      setErro('Não foi possível criar a turma.');
      return;
    }
    onCriada();
  }

  return (
    <form onSubmit={onSubmit} className="mb-8 space-y-4 rounded-lg border border-slate-200 bg-white p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Disciplina</label>
          <div className="flex gap-2">
            <select
              value={disciplinaId}
              onChange={(e) => setDisciplinaId(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            >
              <option value="">Selecionar…</option>
              {disciplinas.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.nome}
                </option>
              ))}
            </select>
          </div>
          <div className="mt-2 flex gap-2">
            <input
              placeholder="Nova disciplina"
              value={novaDisciplina}
              onChange={(e) => setNovaDisciplina(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={adicionarDisciplina}
              className="whitespace-nowrap rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Adicionar
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Ano letivo</label>
          <select
            value={anoLetivoId}
            onChange={(e) => setAnoLetivoId(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Selecionar…</option>
            {anos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </select>
          <div className="mt-2 flex gap-2">
            <input
              placeholder="ex: 2025/2026"
              value={novoAno}
              onChange={(e) => setNovoAno(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-1.5 text-sm"
            />
            <button
              type="button"
              onClick={adicionarAno}
              className="whitespace-nowrap rounded-md border border-slate-300 px-3 py-1.5 text-sm hover:bg-slate-50"
            >
              Adicionar
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Nome da turma</label>
          <input
            placeholder="ex: 9.º F"
            value={nome}
            onChange={(e) => setNome(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-slate-700">Nível de ensino</label>
          <input
            placeholder="ex: 3.º ciclo"
            value={nivelEnsino}
            onChange={(e) => setNivelEnsino(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
      </div>
      {erro && <p className="text-sm text-red-600">{erro}</p>}
      <button
        type="submit"
        disabled={aGravar}
        className="rounded-md bg-brand-600 px-4 py-2 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-60"
      >
        {aGravar ? 'A criar…' : 'Criar turma'}
      </button>
      <p className="text-xs text-slate-400">
        A turma é criada já com os critérios de avaliação e semestres padrão (editáveis depois).
      </p>
    </form>
  );
}
