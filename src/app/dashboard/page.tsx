'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { signOut } from 'next-auth/react';
import { Plus, X, Users, BookOpen } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoading, Skeleton } from '@/components/ui/Spinner';
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
    <AppShell>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">As minhas turmas</h1>
          <p className="mt-1 text-sm text-slate-500">Organize disciplinas, alunos e avaliações por turma.</p>
        </div>
        <Button onClick={() => setMostrarForm((v) => !v)}>
          {mostrarForm ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {mostrarForm ? 'Cancelar' : 'Nova turma'}
        </Button>
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
        <Alert tone="danger">{erroCarregar}</Alert>
      ) : aCarregar ? (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : turmas.length === 0 ? (
        <Card>
          <EmptyState
            icon={Users}
            title="Ainda não tem turmas"
            description="Crie a primeira turma para começar a organizar as suas avaliações."
            action={
              <Button size="sm" onClick={() => setMostrarForm(true)}>
                <Plus className="h-4 w-4" />
                Nova turma
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {turmas.map((t) => (
            <Link
              key={t.id}
              href={`/turmas/${t.id}`}
              className="group rounded-lg border border-slate-200 bg-white p-4 shadow-xs transition-all duration-150 hover:-translate-y-0.5 hover:border-brand-200 hover:shadow-md"
            >
              <p className="font-semibold text-slate-900 group-hover:text-brand-700">{t.nome}</p>
              <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
                <BookOpen className="h-3.5 w-3.5 shrink-0" />
                {t.disciplinas && t.disciplinas.length > 0
                  ? t.disciplinas.map((td) => td.disciplina.nome).join(', ')
                  : 'Sem disciplinas associadas'}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-400">
                <span>{t.anoLetivo.nome}</span>
                <span className="flex items-center gap-1">
                  <Users className="h-3.5 w-3.5" />
                  {t._count?.alunos ?? 0} alunos
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </AppShell>
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
    <Card as="form" onSubmit={onSubmit} className="mb-6 space-y-4 p-5">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="ano-letivo">Ano letivo</Label>
          <Select id="ano-letivo" value={anoLetivoId} onChange={(e) => setAnoLetivoId(e.target.value)}>
            <option value="">Selecionar…</option>
            {anos.map((a) => (
              <option key={a.id} value={a.id}>
                {a.nome}
              </option>
            ))}
          </Select>
          <div className="mt-2 flex gap-2">
            <Input
              placeholder="ex: 2025/2026"
              value={novoAno}
              onChange={(e) => setNovoAno(e.target.value)}
            />
            <Button type="button" variant="secondary" size="sm" className="shrink-0" onClick={adicionarAno}>
              Adicionar
            </Button>
          </div>
        </div>

        <div>
          <Label htmlFor="nome-turma">Nome da turma</Label>
          <Input id="nome-turma" placeholder="ex: 9.º F" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div>
          <Label htmlFor="nivel-ensino">Nível de ensino</Label>
          <Select id="nivel-ensino" value={nivelEnsino} onChange={(e) => setNivelEnsino(e.target.value)}>
            <option value="">Selecionar…</option>
            {NIVEIS_ENSINO.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </Select>
        </div>
      </div>
      {erro && <Alert tone="danger">{erro}</Alert>}
      <div className="flex items-center gap-3">
        <Button type="submit" loading={aGravar}>
          {aGravar ? 'A criar…' : 'Criar turma'}
        </Button>
        <p className="text-xs text-slate-400">
          A turma é criada já com os semestres padrão. Depois de criada, associe as disciplinas que a
          turma leciona.
        </p>
      </div>
    </Card>
  );
}
