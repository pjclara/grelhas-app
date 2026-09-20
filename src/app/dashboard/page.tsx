'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import TopNav from '@/components/TopNav';
import Sidebar from '@/components/Sidebar';
import { NIVEIS_ENSINO, anoLetivoAtual, type AnoLetivo, type Turma } from '@/lib/types';

export default function DashboardPage() {
  const [turmas, setTurmas] = useState<Turma[]>([]);
  const [anos, setAnos] = useState<AnoLetivo[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [mostrarForm, setMostrarForm] = useState(false);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);

  async function carregarTudo() {
    setACarregar(true);
    setErroCarregar(null);
    const [rt, ra] = await Promise.all([fetch('/api/turmas'), fetch('/api/anos-letivos')]);
    if (rt.status === 401 || ra.status === 401) {
      signOut({ callbackUrl: '/login' });
      return;
    }
    if (!rt.ok || !ra.ok) {
      setErroCarregar('Não foi possível carregar os dados. Tente novamente.');
      setACarregar(false);
      return;
    }
    setTurmas(await rt.json());
    setAnos(await ra.json());
    setACarregar(false);
  }

  useEffect(() => {
    carregarTudo();
  }, []);

  return (
    <div>
      <TopNav />
      <div className="flex">
        <Sidebar />
        <main className="min-w-0 flex-1 px-6 py-8">
        <div className="mx-auto max-w-5xl">
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
            anos={anos}
            onCriada={() => {
              setMostrarForm(false);
              carregarTudo();
            }}
            onAnosAtualizados={setAnos}
          />
        )}

        {erroCarregar ? (
          <p className="text-sm text-red-600">{erroCarregar}</p>
        ) : aCarregar ? (
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
                <p className="text-sm text-slate-500">
                  {t.disciplinas && t.disciplinas.length > 0
                    ? t.disciplinas.map((td) => td.disciplina.nome).join(', ')
                    : 'Sem disciplinas associadas'}
                </p>
                <p className="text-xs text-slate-400">{t.anoLetivo.nome}</p>
                <p className="mt-2 text-xs text-slate-500">{t._count?.alunos ?? 0} alunos</p>
              </Link>
            ))}
          </div>
        )}
        </div>
        </main>
      </div>
    </div>
  );
}

function NovaTurmaForm({
  anos,
  onCriada,
  onAnosAtualizados,
}: {
  anos: AnoLetivo[];
  onCriada: () => void;
  onAnosAtualizados: (a: AnoLetivo[]) => void;
}) {
  const [nome, setNome] = useState('');
  const [nivelEnsino, setNivelEnsino] = useState('');
  const [anoLetivoId, setAnoLetivoId] = useState('');
  const [novoAno, setNovoAno] = useState('');
  const [erro, setErro] = useState<string | null>(null);
  const [aGravar, setAGravar] = useState(false);

  // Por omissão sugere o ano letivo corrente: se já existir, pré-seleciona-o;
  // caso contrário, pré-preenche o campo de criação para bastar um clique.
  // O professor pode sempre escolher outro ano ou mudar o texto.
  useEffect(() => {
    if (anoLetivoId) return;
    const atual = anoLetivoAtual();
    const existente = anos.find((a) => a.nome === atual);
    if (existente) {
      setAnoLetivoId(existente.id);
    } else if (!novoAno) {
      setNovoAno(atual);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [anos]);

  async function adicionarAno() {
    if (!novoAno.trim()) return;
    setErro(null);
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
    } else {
      setErro('Não foi possível adicionar o ano letivo.');
    }
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!anoLetivoId || !nome) {
      setErro('Preencha ano letivo e nome da turma.');
      return;
    }
    setAGravar(true);
    const res = await fetch('/api/turmas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ anoLetivoId, nome, nivelEnsino: nivelEnsino || null }),
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
          <select
            value={nivelEnsino}
            onChange={(e) => setNivelEnsino(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          >
            <option value="">Selecionar…</option>
            {NIVEIS_ENSINO.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
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
        A turma é criada já com os semestres padrão. Depois de criada, associe as disciplinas que a
        turma leciona — cada uma nasce já com os critérios de avaliação padrão (editáveis depois).
      </p>
    </form>
  );
}
