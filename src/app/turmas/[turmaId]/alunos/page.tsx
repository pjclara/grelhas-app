'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mic, Square, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { PageLoading } from '@/components/ui/Spinner';
import { TableContainer, Table, THead, TBody, Tr, Th, Td } from '@/components/ui/Table';
import type { Aluno } from '@/lib/types';

// A Web Speech API não está nos tipos padrão do TS DOM; usamos `any` para o objeto de reconhecimento.
type SpeechRecognitionInstance = any;

const PALAVRAS_PARAR = ['parar', 'terminar', 'sair', 'para'];
const PALAVRAS_DESFAZER = ['apagar último', 'apagar ultimo', 'remover último', 'remover ultimo', 'desfazer'];

/** Extrai "número/aluno número N ..." do início de uma frase ditada, devolvendo [número, resto] ou null. */
function extrairNumeroExplicito(transcript: string): [number, string] | null {
  const m = transcript.match(/^(?:aluno\s*)?n[uú]mero\s*(\d+)\s*(.*)$/i);
  if (!m) return null;
  return [Number(m[1]), m[2].trim()];
}

/** Capitaliza cada palavra do nome (o reconhecimento de voz costuma devolver tudo em minúsculas). */
function capitalizarNome(nome: string): string {
  return nome
    .split(' ')
    .filter(Boolean)
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');
}

export default function AlunosPage({ params }: { params: { turmaId: string } }) {
  const [alunos, setAlunos] = useState<Aluno[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [numero, setNumero] = useState('');
  const [nome, setNome] = useState('');
  const [medidas, setMedidas] = useState('');
  const [erro, setErro] = useState<string | null>(null);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [numeroEdit, setNumeroEdit] = useState('');
  const [nomeEdit, setNomeEdit] = useState('');
  const [medidasEdit, setMedidasEdit] = useState('');
  const [erroEdit, setErroEdit] = useState<string | null>(null);

  const [aDitar, setADitar] = useState(false);
  const [ultimoOuvido, setUltimoOuvido] = useState<string | null>(null);
  const [ultimoAdicionado, setUltimoAdicionado] = useState<string | null>(null);
  const [avisoDitado, setAvisoDitado] = useState<string | null>(null);
  const [ditadoSuportado, setDitadoSuportado] = useState(true);
  const ditandoRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionInstance>(null);
  const alunosRef = useRef<Aluno[]>([]);
  const ultimoAdicionadoIdRef = useRef<string | null>(null);

  async function carregar() {
    setACarregar(true);
    const r = await fetch(`/api/turmas/${params.turmaId}/alunos`);
    if (!r.ok) {
      setErroCarregar('Não foi possível carregar os alunos.');
      setACarregar(false);
      return [];
    }
    setErroCarregar(null);
    const lista: Aluno[] = await r.json();
    setAlunos(lista);
    alunosRef.current = lista;
    setACarregar(false);
    return lista;
  }

  useEffect(() => {
    carregar();
  }, [params.turmaId]);

  useEffect(() => {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    setDitadoSuportado(Boolean(SpeechRecognitionCtor));
  }, []);

  useEffect(() => {
    return () => {
      ditandoRef.current = false;
      recognitionRef.current?.stop();
    };
  }, []);

  async function adicionar(e: React.FormEvent) {
    e.preventDefault();
    setErro(null);
    if (!numero || !nome) {
      setErro('Indique número e nome.');
      return;
    }
    const res = await fetch(`/api/turmas/${params.turmaId}/alunos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numero: Number(numero), nome, medidas: medidas || null }),
    });
    if (!res.ok) {
      setErro('Não foi possível adicionar (número já usado?).');
      return;
    }
    setNumero('');
    setNome('');
    setMedidas('');
    carregar();
  }

  function proximoNumero(): number {
    const maior = alunosRef.current.reduce((max, a) => Math.max(max, a.numero), 0);
    return maior + 1;
  }

  async function adicionarAlunoViaVoz(numeroExplicito: number | null, nomeTexto: string) {
    const nomeFinal = capitalizarNome(nomeTexto.trim());
    if (!nomeFinal) return;
    const numeroFinal = numeroExplicito ?? proximoNumero();

    const res = await fetch(`/api/turmas/${params.turmaId}/alunos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numero: numeroFinal, nome: nomeFinal, medidas: null }),
    });
    if (!res.ok) {
      setAvisoDitado(`Não foi possível adicionar "${nomeFinal}" (nº ${numeroFinal} já usado?).`);
      return;
    }
    const novo = await res.json();
    ultimoAdicionadoIdRef.current = novo.id;
    setUltimoAdicionado(`Nº ${numeroFinal} — ${nomeFinal}`);
    setAvisoDitado(null);
    await carregar();
  }

  async function desfazerUltimoDitado() {
    const id = ultimoAdicionadoIdRef.current;
    if (!id) {
      setAvisoDitado('Não há nenhum aluno adicionado por voz nesta sessão para desfazer.');
      return;
    }
    await fetch(`/api/turmas/${params.turmaId}/alunos/${id}`, { method: 'DELETE' });
    ultimoAdicionadoIdRef.current = null;
    setUltimoAdicionado(null);
    setAvisoDitado('Último aluno removido.');
    await carregar();
  }

  function processarTranscript(transcriptBruto: string) {
    const transcript = transcriptBruto.trim();
    setUltimoOuvido(transcriptBruto);
    if (!transcript) return;
    const minusculas = transcript.toLowerCase();

    if (PALAVRAS_PARAR.some((p) => minusculas === p || minusculas.startsWith(p + ' '))) {
      pararDitado();
      return;
    }
    if (PALAVRAS_DESFAZER.some((p) => minusculas.includes(p))) {
      desfazerUltimoDitado();
      return;
    }

    const explicito = extrairNumeroExplicito(transcript);
    if (explicito) {
      const [numeroExplicito, resto] = explicito;
      if (resto) adicionarAlunoViaVoz(numeroExplicito, resto);
      else setAvisoDitado('Diga o número seguido do nome, ex.: "número 5 Maria Silva".');
      return;
    }

    adicionarAlunoViaVoz(null, transcript);
  }

  function iniciarDitado() {
    const SpeechRecognitionCtor =
      (window as any).SpeechRecognition ?? (window as any).webkitSpeechRecognition;
    if (!SpeechRecognitionCtor) {
      setDitadoSuportado(false);
      return;
    }
    const recognition: SpeechRecognitionInstance = new SpeechRecognitionCtor();
    recognition.lang = 'pt-PT';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onresult = (event: any) => {
      const ultimo = event.results[event.results.length - 1];
      const transcript = ultimo?.[0]?.transcript ?? '';
      processarTranscript(transcript);
    };
    recognition.onerror = (event: any) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        setDitadoSuportado(false);
        pararDitado();
      }
    };
    recognition.onend = () => {
      if (ditandoRef.current) {
        try {
          recognition.start();
        } catch {
          // já iniciado ou instância inválida; ignora
        }
      }
    };

    recognitionRef.current = recognition;
    ditandoRef.current = true;
    setADitar(true);
    setUltimoOuvido(null);
    setUltimoAdicionado(null);
    setAvisoDitado(null);
    ultimoAdicionadoIdRef.current = null;
    recognition.start();
  }

  function pararDitado() {
    ditandoRef.current = false;
    setADitar(false);
    recognitionRef.current?.stop();
    recognitionRef.current = null;
  }

  async function remover(id: string) {
    if (!confirm('Remover este aluno e todas as suas notas?')) return;
    await fetch(`/api/turmas/${params.turmaId}/alunos/${id}`, { method: 'DELETE' });
    carregar();
  }

  async function alternarAtivo(aluno: Aluno) {
    await fetch(`/api/turmas/${params.turmaId}/alunos/${aluno.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !aluno.ativo }),
    });
    carregar();
  }

  function iniciarEdicao(aluno: Aluno) {
    setEditandoId(aluno.id);
    setNumeroEdit(String(aluno.numero));
    setNomeEdit(aluno.nome);
    setMedidasEdit(aluno.medidas ?? '');
    setErroEdit(null);
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setErroEdit(null);
  }

  async function guardarEdicao(id: string) {
    setErroEdit(null);
    if (!numeroEdit || !nomeEdit) {
      setErroEdit('Indique número e nome.');
      return;
    }
    const res = await fetch(`/api/turmas/${params.turmaId}/alunos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        numero: Number(numeroEdit),
        nome: nomeEdit,
        medidas: medidasEdit || null,
      }),
    });
    if (!res.ok) {
      setErroEdit('Não foi possível guardar (número já usado?).');
      return;
    }
    setEditandoId(null);
    carregar();
  }

  return (
    <AppShell>
      <Link href={`/turmas/${params.turmaId}`} className="mb-4 inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:underline">
        <ArrowLeft className="h-4 w-4" /> Voltar à turma
      </Link>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">Alunos</h1>
        {ditadoSuportado && (
          <Button
            type="button"
            variant={aDitar ? 'danger' : 'primary'}
            onClick={() => (aDitar ? pararDitado() : iniciarDitado())}
          >
            {aDitar ? <Square className="h-4 w-4" /> : <Mic className="h-4 w-4" />}
            {aDitar ? 'Parar ditado' : 'Ditar alunos'}
          </Button>
        )}
      </div>

      {aDitar && (
        <div className="mb-4 space-y-2">
          <Alert tone="info">
            A ouvir… diga o nome do aluno para o adicionar com o número seguinte automático, ou
            "número 5 Maria Silva" para indicar o número. Diga "apagar último" para desfazer ou
            "parar" para terminar.
            {ultimoOuvido && <span className="ml-2 text-brand-500">Ouvido: "{ultimoOuvido}"</span>}
          </Alert>
          {ultimoAdicionado && <Alert tone="success">Adicionado: {ultimoAdicionado}</Alert>}
          {avisoDitado && <Alert tone="warning">{avisoDitado}</Alert>}
        </div>
      )}

      <Card as="form" onSubmit={adicionar} className="mb-6 flex flex-wrap items-end gap-3 p-4">
        <div>
          <Label htmlFor="numero">Nº</Label>
          <Input id="numero" type="number" value={numero} onChange={(e) => setNumero(e.target.value)} className="w-20" />
        </div>
        <div className="min-w-[160px] flex-1">
          <Label htmlFor="nome-aluno">Nome</Label>
          <Input id="nome-aluno" value={nome} onChange={(e) => setNome(e.target.value)} />
        </div>
        <div className="min-w-[160px] flex-1">
          <Label htmlFor="medidas">Medidas (Dec-Lei 54)</Label>
          <Input id="medidas" value={medidas} onChange={(e) => setMedidas(e.target.value)} />
        </div>
        <Button type="submit">
          <Plus className="h-4 w-4" />
          Adicionar
        </Button>
        {erro && (
          <div className="w-full">
            <Alert tone="danger">{erro}</Alert>
          </div>
        )}
      </Card>

      {erroCarregar ? (
        <Alert tone="danger">{erroCarregar}</Alert>
      ) : aCarregar ? (
        <PageLoading />
      ) : (
        <TableContainer>
          <Table>
            <THead>
              <Tr>
                <Th className="w-16">Nº</Th>
                <Th>Nome</Th>
                <Th>Medidas</Th>
                <Th>Estado</Th>
                <Th className="text-right">Ações</Th>
              </Tr>
            </THead>
            <TBody>
              {alunos.map((a) =>
                editandoId === a.id ? (
                  <Tr key={a.id} className="bg-slate-50/70">
                    <Td>
                      <Input type="number" value={numeroEdit} onChange={(e) => setNumeroEdit(e.target.value)} className="w-16" />
                    </Td>
                    <Td>
                      <Input value={nomeEdit} onChange={(e) => setNomeEdit(e.target.value)} />
                      {erroEdit && <p className="mt-1 text-xs text-red-600">{erroEdit}</p>}
                    </Td>
                    <Td>
                      <Input value={medidasEdit} onChange={(e) => setMedidasEdit(e.target.value)} />
                    </Td>
                    <Td className="text-slate-400">{a.ativo ? 'Ativo' : 'Inativo'}</Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => guardarEdicao(a.id)} aria-label="Guardar">
                          <Check className="h-4 w-4 text-emerald-600" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={cancelarEdicao} aria-label="Cancelar">
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                ) : (
                  <Tr key={a.id}>
                    <Td className="tabular-nums text-slate-500">{a.numero}</Td>
                    <Td className="font-medium text-slate-900">{a.nome}</Td>
                    <Td className="text-slate-500">{a.medidas ?? '—'}</Td>
                    <Td>
                      <button onClick={() => alternarAtivo(a)}>
                        <Badge tone={a.ativo ? 'success' : 'neutral'}>{a.ativo ? 'Ativo' : 'Inativo'}</Badge>
                      </button>
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => iniciarEdicao(a)} aria-label="Editar">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => remover(a.id)} aria-label="Remover">
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                    </Td>
                  </Tr>
                ),
              )}
              {alunos.length === 0 && (
                <Tr>
                  <Td colSpan={5}>
                    <div className="py-6 text-center text-sm text-slate-400">
                      Ainda não tem alunos. Adicione o primeiro acima.
                    </div>
                  </Td>
                </Tr>
              )}
            </TBody>
          </Table>
        </TableContainer>
      )}
    </AppShell>
  );
}
