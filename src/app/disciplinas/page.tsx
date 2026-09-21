'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { Plus, Pencil, Trash2, BookOpen } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { EmptyState } from '@/components/ui/EmptyState';
import { PageLoading } from '@/components/ui/Spinner';
import { TableContainer, Table, THead, TBody, Tr, Th, Td } from '@/components/ui/Table';
import { CreatableSelect } from '@/components/ui/CreatableSelect';
import type { AnoEscolaridade, Ciclo, Disciplina, GrupoDisciplinar } from '@/lib/types';

interface FormState {
  nome: string;
  grupoDisciplinarId: string;
  cicloIds: string[];
  anoEscolaridadeIds: string[];
}

function estadoVazio(): FormState {
  return { nome: '', grupoDisciplinarId: '', cicloIds: [], anoEscolaridadeIds: [] };
}

export default function DisciplinasPage() {
  const { data: session } = useSession();
  const isAdmin = (session?.user as { role?: string } | undefined)?.role === 'ADMIN';

  const [disciplinas, setDisciplinas] = useState<Disciplina[]>([]);
  const [grupos, setGrupos] = useState<GrupoDisciplinar[]>([]);
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [anos, setAnos] = useState<AnoEscolaridade[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [filtroNome, setFiltroNome] = useState('');

  const [form, setForm] = useState<FormState>(estadoVazio());
  const [erro, setErro] = useState<string | null>(null);
  const [aGravar, setAGravar] = useState(false);

  const [editando, setEditando] = useState<Disciplina | null>(null);
  const [formEdit, setFormEdit] = useState<FormState>(estadoVazio());
  const [erroEdit, setErroEdit] = useState<string | null>(null);
  const [aGuardarEdicao, setAGuardarEdicao] = useState(false);

  async function carregar() {
    setACarregar(true);
    const [rd, rg, rc, ra] = await Promise.all([
      fetch('/api/disciplinas?comContagem=1'),
      fetch('/api/grupos-disciplinares'),
      fetch('/api/ciclos'),
      fetch('/api/anos-escolaridade'),
    ]);
    if (!rd.ok || !rg.ok || !rc.ok || !ra.ok) {
      setErroCarregar('Não foi possível carregar as disciplinas.');
      setACarregar(false);
      return;
    }
    setErroCarregar(null);
    setDisciplinas(await rd.json());
    setGrupos(await rg.json());
    setCiclos(await rc.json());
    setAnos(await ra.json());
    setACarregar(false);
  }

  useEffect(() => {
    carregar();
  }, []);

  async function criarGrupo(nome: string): Promise<GrupoDisciplinar> {
    const res = await fetch('/api/grupos-disciplinares', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? 'Não foi possível criar o grupo disciplinar (nome já usado?).');
    }
    const novo: GrupoDisciplinar = await res.json();
    setGrupos((prev) => [...prev, novo].sort((a, b) => a.nome.localeCompare(b.nome)));
    return novo;
  }

  async function criarCiclo(nome: string): Promise<Ciclo> {
    const res = await fetch('/api/ciclos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? 'Não foi possível criar o ciclo (nome já usado?).');
    }
    const novo: Ciclo = await res.json();
    setCiclos((prev) => [...prev, novo].sort((a, b) => a.nome.localeCompare(b.nome)));
    return novo;
  }

  async function criarAno(nome: string): Promise<AnoEscolaridade> {
    const res = await fetch('/api/anos-escolaridade', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nome }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error ?? 'Não foi possível criar o ano de escolaridade (nome já usado?).');
    }
    const novo: AnoEscolaridade = await res.json();
    setAnos((prev) => [...prev, novo].sort((a, b) => a.ordem - b.ordem || a.nome.localeCompare(b.nome)));
    return novo;
  }

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!form.nome.trim()) {
      setErro('Indique o nome da disciplina.');
      return;
    }
    if (!form.grupoDisciplinarId) {
      setErro('Escolha o grupo disciplinar.');
      return;
    }
    if (form.cicloIds.length === 0) {
      setErro('Selecione pelo menos um ciclo.');
      return;
    }
    if (form.anoEscolaridadeIds.length === 0) {
      setErro('Selecione pelo menos um ano de escolaridade.');
      return;
    }
    setAGravar(true);
    const res = await fetch('/api/disciplinas', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, nome: form.nome.trim() }),
    });
    setAGravar(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErro(body.error ?? 'Não foi possível criar a disciplina (nome já usado?).');
      return;
    }
    setForm(estadoVazio());
    carregar();
  }

  function iniciarEdicao(d: Disciplina) {
    setEditando(d);
    setFormEdit({
      nome: d.nome,
      grupoDisciplinarId: d.grupoDisciplinarId ?? '',
      cicloIds: d.ciclos.map((dc) => dc.ciclo.id),
      anoEscolaridadeIds: d.anosEscolaridade.map((da) => da.anoEscolaridade.id),
    });
    setErroEdit(null);
  }

  async function guardarEdicao() {
    if (!editando) return;
    setErroEdit(null);
    if (!formEdit.nome.trim()) {
      setErroEdit('Indique o nome da disciplina.');
      return;
    }
    if (!formEdit.grupoDisciplinarId) {
      setErroEdit('Escolha o grupo disciplinar.');
      return;
    }
    if (formEdit.cicloIds.length === 0) {
      setErroEdit('Selecione pelo menos um ciclo.');
      return;
    }
    if (formEdit.anoEscolaridadeIds.length === 0) {
      setErroEdit('Selecione pelo menos um ano de escolaridade.');
      return;
    }
    setAGuardarEdicao(true);
    const res = await fetch(`/api/disciplinas/${editando.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...formEdit, nome: formEdit.nome.trim() }),
    });
    setAGuardarEdicao(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErroEdit(body.error ?? 'Não foi possível guardar (nome já usado?).');
      return;
    }
    setEditando(null);
    carregar();
  }

  async function alternarAtivo(d: Disciplina) {
    await fetch(`/api/disciplinas/${d.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !d.ativo }),
    });
    carregar();
  }

  async function remover(d: Disciplina) {
    const turmas = d._count?.turmaDisciplinas ?? 0;
    const aviso =
      turmas > 0
        ? `A disciplina "${d.nome}" tem ${turmas} turma(s) associada(s). Eliminá-la apaga também essas turmas, alunos e notas. Esta ação não pode ser desfeita. Continuar?`
        : `Eliminar a disciplina "${d.nome}"?`;
    if (!confirm(aviso)) return;
    await fetch(`/api/disciplinas/${d.id}`, { method: 'DELETE' });
    carregar();
  }

  const disciplinasFiltradas = disciplinas.filter((d) =>
    d.nome.toLowerCase().includes(filtroNome.trim().toLowerCase())
  );

  return (
    <AppShell>
      <div className="mb-6">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Disciplinas</h1>
        <p className="mt-1 text-sm text-slate-500">
          Catálogo global de disciplinas, partilhado por todos os professores.
          {!isAdmin && ' Apenas administradores podem criar, editar ou remover disciplinas.'}
        </p>
      </div>

      {isAdmin && (
        <Card as="form" onSubmit={adicionar} className="mb-6 flex flex-col gap-4 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="nome-disciplina">Nome da disciplina</Label>
              <Input
                id="nome-disciplina"
                placeholder="ex: Matemática"
                value={form.nome}
                onChange={(e) => setForm((f) => ({ ...f, nome: e.target.value }))}
              />
            </div>
            <CreatableSelect
              id="grupo-disciplinar"
              label="Grupo Disciplinar"
              itens={grupos}
              podeCriar={isAdmin}
              tituloModal="Novo grupo disciplinar"
              onCriar={criarGrupo}
              value={form.grupoDisciplinarId}
              onChange={(id) => setForm((f) => ({ ...f, grupoDisciplinarId: id }))}
            />
            <CreatableSelect
              id="ciclos"
              label="Ciclos"
              itens={ciclos}
              podeCriar={isAdmin}
              tituloModal="Novo ciclo"
              onCriar={criarCiclo}
              multiple
              value={form.cicloIds}
              onChange={(ids) => setForm((f) => ({ ...f, cicloIds: ids }))}
            />
            <CreatableSelect
              id="anos-escolaridade"
              label="Anos de Escolaridade"
              itens={anos}
              podeCriar={isAdmin}
              tituloModal="Novo ano de escolaridade"
              onCriar={criarAno}
              multiple
              value={form.anoEscolaridadeIds}
              onChange={(ids) => setForm((f) => ({ ...f, anoEscolaridadeIds: ids }))}
            />
          </div>
          <div className="flex items-center gap-3">
            <Button type="submit" loading={aGravar}>
              <Plus className="h-4 w-4" />
              Adicionar
            </Button>
          </div>
          {erro && <Alert tone="danger">{erro}</Alert>}
        </Card>
      )}

      <div className="mb-4 max-w-xs">
        <Label htmlFor="filtro-nome">Pesquisar por nome</Label>
        <Input
          id="filtro-nome"
          placeholder="ex: Matemática"
          value={filtroNome}
          onChange={(e) => setFiltroNome(e.target.value)}
        />
      </div>

      {erroCarregar ? (
        <Alert tone="danger">{erroCarregar}</Alert>
      ) : aCarregar ? (
        <PageLoading />
      ) : disciplinasFiltradas.length === 0 ? (
        <Card>
          <EmptyState
            icon={BookOpen}
            title={disciplinas.length === 0 ? 'Ainda não existem disciplinas' : 'Sem resultados'}
            description={
              disciplinas.length === 0
                ? isAdmin
                  ? 'Crie a primeira acima.'
                  : 'Peça a um administrador para criar disciplinas.'
                : 'Nenhuma disciplina corresponde à pesquisa.'
            }
          />
        </Card>
      ) : (
        <TableContainer>
          <Table>
            <THead>
              <Tr>
                <Th>Disciplina</Th>
                <Th>Grupo Disciplinar</Th>
                <Th>Ciclos</Th>
                <Th>Anos</Th>
                <Th>Estado</Th>
                {isAdmin && <Th className="text-right">Ações</Th>}
              </Tr>
            </THead>
            <TBody>
              {disciplinasFiltradas.map((d) => (
                <Tr key={d.id}>
                  <Td className="font-medium text-slate-900">{d.nome}</Td>
                  <Td className="text-slate-500">{d.grupoDisciplinar?.nome ?? '—'}</Td>
                  <Td>
                    {d.ciclos.length === 0 ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {d.ciclos.map((dc) => (
                          <Badge key={dc.id}>{dc.ciclo.nome}</Badge>
                        ))}
                      </div>
                    )}
                  </Td>
                  <Td>
                    {d.anosEscolaridade.length === 0 ? (
                      <span className="text-slate-400">—</span>
                    ) : (
                      <div className="flex flex-wrap gap-1">
                        {d.anosEscolaridade.map((da) => (
                          <Badge key={da.id}>{da.anoEscolaridade.nome}</Badge>
                        ))}
                      </div>
                    )}
                  </Td>
                  <Td>
                    {isAdmin ? (
                      <button onClick={() => alternarAtivo(d)}>
                        <Badge tone={d.ativo ? 'success' : 'neutral'}>{d.ativo ? 'Ativo' : 'Inativo'}</Badge>
                      </button>
                    ) : (
                      <Badge tone={d.ativo ? 'success' : 'neutral'}>{d.ativo ? 'Ativo' : 'Inativo'}</Badge>
                    )}
                  </Td>
                  {isAdmin && (
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => iniciarEdicao(d)} aria-label="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remover(d)} aria-label="Remover">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </Td>
                  )}
                </Tr>
              ))}
            </TBody>
          </Table>
        </TableContainer>
      )}

      <Modal
        open={editando !== null}
        onClose={() => setEditando(null)}
        title={editando ? `Editar ${editando.nome}` : undefined}
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setEditando(null)}>
              Cancelar
            </Button>
            <Button onClick={guardarEdicao} loading={aGuardarEdicao}>
              Guardar
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-4">
          <div>
            <Label htmlFor="nome-disciplina-edit">Nome da disciplina</Label>
            <Input
              id="nome-disciplina-edit"
              value={formEdit.nome}
              onChange={(e) => setFormEdit((f) => ({ ...f, nome: e.target.value }))}
            />
          </div>
          <CreatableSelect
            id="grupo-disciplinar-edit"
            label="Grupo Disciplinar"
            itens={grupos}
            podeCriar={isAdmin}
            tituloModal="Novo grupo disciplinar"
            onCriar={criarGrupo}
            value={formEdit.grupoDisciplinarId}
            onChange={(id) => setFormEdit((f) => ({ ...f, grupoDisciplinarId: id }))}
          />
          <CreatableSelect
            id="ciclos-edit"
            label="Ciclos"
            itens={ciclos}
            podeCriar={isAdmin}
            tituloModal="Novo ciclo"
            onCriar={criarCiclo}
            multiple
            value={formEdit.cicloIds}
            onChange={(ids) => setFormEdit((f) => ({ ...f, cicloIds: ids }))}
          />
          <CreatableSelect
            id="anos-escolaridade-edit"
            label="Anos de Escolaridade"
            itens={anos}
            podeCriar={isAdmin}
            tituloModal="Novo ano de escolaridade"
            onCriar={criarAno}
            multiple
            value={formEdit.anoEscolaridadeIds}
            onChange={(ids) => setFormEdit((f) => ({ ...f, anoEscolaridadeIds: ids }))}
          />
          {erroEdit && <Alert tone="danger">{erroEdit}</Alert>}
        </div>
      </Modal>
    </AppShell>
  );
}
