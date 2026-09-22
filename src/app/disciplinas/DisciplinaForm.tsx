'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert } from '@/components/ui/Alert';
import { CreatableSelect } from '@/components/ui/CreatableSelect';
import type { AnoEscolaridade, Ciclo, GrupoDisciplinar } from '@/lib/types';

export interface DisciplinaFormValues {
  nome: string;
  grupoDisciplinarId: string;
  cicloIds: string[];
  anoEscolaridadeIds: string[];
}

interface DisciplinaFormProps {
  valoresIniciais?: DisciplinaFormValues;
  aoSubmeter: (valores: DisciplinaFormValues) => void | Promise<void>;
  aEnviar: boolean;
  erro: string | null;
  textoSubmeter: string;
  cancelarHref?: string;
}

function estadoVazio(): DisciplinaFormValues {
  return { nome: '', grupoDisciplinarId: '', cicloIds: [], anoEscolaridadeIds: [] };
}

/** Formulário de disciplina partilhado entre /disciplinas/nova e /disciplinas/[id]/editar. */
export default function DisciplinaForm({
  valoresIniciais,
  aoSubmeter,
  aEnviar,
  erro,
  textoSubmeter,
  cancelarHref = '/disciplinas',
}: DisciplinaFormProps) {
  const [form, setForm] = useState<DisciplinaFormValues>(valoresIniciais ?? estadoVazio());
  const [grupos, setGrupos] = useState<GrupoDisciplinar[]>([]);
  const [ciclos, setCiclos] = useState<Ciclo[]>([]);
  const [anos, setAnos] = useState<AnoEscolaridade[]>([]);
  const [erroLocal, setErroLocal] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/grupos-disciplinares').then((r) => r.json()),
      fetch('/api/ciclos').then((r) => r.json()),
      fetch('/api/anos-escolaridade').then((r) => r.json()),
    ]).then(([g, c, a]) => {
      setGrupos(g);
      setCiclos(c);
      setAnos(a);
    });
  }, []);

  useEffect(() => {
    if (valoresIniciais) setForm(valoresIniciais);
  }, [valoresIniciais]);

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

  function submeter(e: React.FormEvent) {
    e.preventDefault();
    setErroLocal(null);
    if (!form.nome.trim()) {
      setErroLocal('Indique o nome da disciplina.');
      return;
    }
    if (!form.grupoDisciplinarId) {
      setErroLocal('Escolha o grupo disciplinar.');
      return;
    }
    if (form.cicloIds.length === 0) {
      setErroLocal('Selecione pelo menos um ciclo.');
      return;
    }
    if (form.anoEscolaridadeIds.length === 0) {
      setErroLocal('Selecione pelo menos um ano de escolaridade.');
      return;
    }
    aoSubmeter({ ...form, nome: form.nome.trim() });
  }

  return (
    <Card as="form" onSubmit={submeter} className="flex flex-col gap-4 p-4">
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
        podeCriar
        tituloModal="Novo grupo disciplinar"
        onCriar={criarGrupo}
        value={form.grupoDisciplinarId}
        onChange={(id) => setForm((f) => ({ ...f, grupoDisciplinarId: id }))}
      />
      <CreatableSelect
        id="ciclos"
        label="Ciclos"
        itens={ciclos}
        podeCriar
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
        podeCriar
        tituloModal="Novo ano de escolaridade"
        onCriar={criarAno}
        multiple
        value={form.anoEscolaridadeIds}
        onChange={(ids) => setForm((f) => ({ ...f, anoEscolaridadeIds: ids }))}
      />
      <div className="flex items-center gap-3">
        <Button type="submit" loading={aEnviar}>
          {textoSubmeter}
        </Button>
        <Link href={cancelarHref}>
          <Button type="button" variant="secondary">
            Cancelar
          </Button>
        </Link>
      </div>
      {(erro ?? erroLocal) && <Alert tone="danger">{erro ?? erroLocal}</Alert>}
    </Card>
  );
}
