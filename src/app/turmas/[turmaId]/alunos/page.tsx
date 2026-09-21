'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, ArrowRightLeft, Mic, Square, Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import AppShell from '@/components/AppShell';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Input';
import { Label } from '@/components/ui/Label';
import { Alert } from '@/components/ui/Alert';
import { Badge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { PageLoading } from '@/components/ui/Spinner';
import { TableContainer, Table, THead, TBody, Tr, Th, Td } from '@/components/ui/Table';
import type { AlunoTurma, Medida, TipoMedida, Turma } from '@/lib/types';

const GRUPOS_MEDIDAS: Array<{ tipo: TipoMedida; label: string }> = [
  { tipo: 'UNIVERSAL', label: 'Universais' },
  { tipo: 'SELETIVA', label: 'Seletivas' },
  { tipo: 'ADICIONAL', label: 'Adicionais' },
];

const PREFIXO_TIPO: Record<TipoMedida, string> = { UNIVERSAL: 'Un', SELETIVA: 'Sel', ADICIONAL: 'Ad' };
const TOM_TIPO: Record<TipoMedida, 'brand' | 'warning' | 'danger'> = {
  UNIVERSAL: 'brand',
  SELETIVA: 'warning',
  ADICIONAL: 'danger',
};

function SeletorMedidas({
  catalogo,
  selecionadas,
  onChange,
}: {
  catalogo: Medida[];
  selecionadas: string[];
  onChange: (ids: string[]) => void;
}) {
  function alternar(id: string) {
    onChange(selecionadas.includes(id) ? selecionadas.filter((m) => m !== id) : [...selecionadas, id]);
  }
  return (
    <div className="flex flex-col gap-3">
      {GRUPOS_MEDIDAS.map(({ tipo, label }) => (
        <div key={tipo}>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
          <div className="flex flex-col gap-1">
            {catalogo
              .filter((m) => m.tipo === tipo)
              .map((m) => (
                <label key={m.id} className="flex items-start gap-1.5 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    className="mt-0.5 h-4 w-4 shrink-0 rounded border-slate-300 text-brand-600 focus:ring-brand-500/40"
                    checked={selecionadas.includes(m.id)}
                    onChange={() => alternar(m.id)}
                  />
                  <span>
                    {m.codigo}) {m.titulo}
                  </span>
                </label>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

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
  const [alunos, setAlunos] = useState<AlunoTurma[]>([]);
  const [aCarregar, setACarregar] = useState(true);
  const [erroCarregar, setErroCarregar] = useState<string | null>(null);
  const [numero, setNumero] = useState('');
  const [numeroProcesso, setNumeroProcesso] = useState('');
  const [nome, setNome] = useState('');
  const [medidaIds, setMedidaIds] = useState<string[]>([]);
  const [erro, setErro] = useState<string | null>(null);

  const [medidasCatalogo, setMedidasCatalogo] = useState<Medida[]>([]);

  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [numeroEdit, setNumeroEdit] = useState('');
  const [numeroProcessoEdit, setNumeroProcessoEdit] = useState('');
  const [nomeEdit, setNomeEdit] = useState('');
  const [medidaIdsEdit, setMedidaIdsEdit] = useState<string[]>([]);
  const [erroEdit, setErroEdit] = useState<string | null>(null);

  const [outrasTurmas, setOutrasTurmas] = useState<Turma[]>([]);
  const [transferindo, setTransferindo] = useState<AlunoTurma | null>(null);
  const [turmaDestinoId, setTurmaDestinoId] = useState('');
  const [numeroDestino, setNumeroDestino] = useState('');
  const [erroTransferencia, setErroTransferencia] = useState<string | null>(null);
  const [aTransferir, setATransferir] = useState(false);

  const [aDitar, setADitar] = useState(false);
  const [ultimoOuvido, setUltimoOuvido] = useState<string | null>(null);
  const [ultimoAdicionado, setUltimoAdicionado] = useState<string | null>(null);
  const [avisoDitado, setAvisoDitado] = useState<string | null>(null);
  const [ditadoSuportado, setDitadoSuportado] = useState(true);
  const ditandoRef = useRef(false);
  const recognitionRef = useRef<SpeechRecognitionInstance>(null);
  const alunosRef = useRef<AlunoTurma[]>([]);
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
    const lista: AlunoTurma[] = await r.json();
    setAlunos(lista);
    alunosRef.current = lista;
    setACarregar(false);
    return lista;
  }

  useEffect(() => {
    carregar();
  }, [params.turmaId]);

  useEffect(() => {
    fetch('/api/medidas')
      .then((r) => r.json())
      .then(setMedidasCatalogo);
  }, []);

  useEffect(() => {
    fetch('/api/turmas')
      .then((r) => r.json())
      .then((lista: Turma[]) => setOutrasTurmas(lista.filter((t) => t.id !== params.turmaId)));
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
    if (!numero || !numeroProcesso.trim() || !nome) {
      setErro('Indique número, nº de processo e nome.');
      return;
    }
    const res = await fetch(`/api/turmas/${params.turmaId}/alunos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numero: Number(numero), numeroProcesso: numeroProcesso.trim(), nome, medidaIds }),
    });
    if (!res.ok) {
      setErro('Não foi possível adicionar (número ou nº de processo já usado?).');
      return;
    }
    setNumero('');
    setNumeroProcesso('');
    setNome('');
    setMedidaIds([]);
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
    // O ditado não permite indicar o nº de processo — gera-se um provisório
    // (único), a corrigir depois na edição inline.
    const numeroProcessoProvisorio = `AUTO-${Date.now()}`;

    const res = await fetch(`/api/turmas/${params.turmaId}/alunos`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ numero: numeroFinal, numeroProcesso: numeroProcessoProvisorio, nome: nomeFinal }),
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

  async function alternarAtivo(aluno: AlunoTurma) {
    await fetch(`/api/turmas/${params.turmaId}/alunos/${aluno.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ativo: !aluno.ativo }),
    });
    carregar();
  }

  function iniciarEdicao(aluno: AlunoTurma) {
    setEditandoId(aluno.id);
    setNumeroEdit(String(aluno.numero));
    setNumeroProcessoEdit(aluno.numeroProcesso);
    setNomeEdit(aluno.nome);
    setMedidaIdsEdit(aluno.medidas.map((am) => am.medida.id));
    setErroEdit(null);
  }

  function cancelarEdicao() {
    setEditandoId(null);
    setErroEdit(null);
  }

  async function guardarEdicao(id: string) {
    setErroEdit(null);
    if (!numeroEdit || !numeroProcessoEdit.trim() || !nomeEdit) {
      setErroEdit('Indique número, nº de processo e nome.');
      return;
    }
    const res = await fetch(`/api/turmas/${params.turmaId}/alunos/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        numero: Number(numeroEdit),
        numeroProcesso: numeroProcessoEdit.trim(),
        nome: nomeEdit,
        medidaIds: medidaIdsEdit,
      }),
    });
    if (!res.ok) {
      setErroEdit('Não foi possível guardar (número ou nº de processo já usado?).');
      return;
    }
    setEditandoId(null);
    carregar();
  }

  function iniciarTransferencia(aluno: AlunoTurma) {
    setTransferindo(aluno);
    setTurmaDestinoId('');
    setNumeroDestino('');
    setErroTransferencia(null);
  }

  async function selecionarTurmaDestino(id: string) {
    setTurmaDestinoId(id);
    setNumeroDestino('');
    if (!id) return;
    const r = await fetch(`/api/turmas/${id}/alunos`);
    if (!r.ok) return;
    const alunosDestino: AlunoTurma[] = await r.json();
    const maior = alunosDestino.reduce((max, a) => Math.max(max, a.numero), 0);
    setNumeroDestino(String(maior + 1));
  }

  async function confirmarTransferencia() {
    if (!transferindo) return;
    setErroTransferencia(null);
    if (!turmaDestinoId || !numeroDestino) {
      setErroTransferencia('Escolha a turma de destino e o novo número.');
      return;
    }
    setATransferir(true);
    const res = await fetch(`/api/turmas/${params.turmaId}/alunos/${transferindo.id}/transferir`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ turmaDestinoId, numero: Number(numeroDestino) }),
    });
    setATransferir(false);
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      setErroTransferencia(body.error ?? 'Não foi possível transferir (número já usado na turma destino?).');
      return;
    }
    setTransferindo(null);
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

      <Card as="form" onSubmit={adicionar} className="mb-6 flex flex-col gap-4 p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div>
            <Label htmlFor="numero">Nº</Label>
            <Input id="numero" type="number" value={numero} onChange={(e) => setNumero(e.target.value)} className="w-20" />
          </div>
          <div>
            <Label htmlFor="numero-processo">Nº processo</Label>
            <Input
              id="numero-processo"
              value={numeroProcesso}
              onChange={(e) => setNumeroProcesso(e.target.value)}
              className="w-28"
            />
          </div>
          <div className="min-w-[160px] flex-1">
            <Label htmlFor="nome-aluno">Nome</Label>
            <Input id="nome-aluno" value={nome} onChange={(e) => setNome(e.target.value)} />
          </div>
          <Button type="submit">
            <Plus className="h-4 w-4" />
            Adicionar
          </Button>
        </div>
        <div>
          <Label>Medidas (Dec-Lei 54)</Label>
          <SeletorMedidas catalogo={medidasCatalogo} selecionadas={medidaIds} onChange={setMedidaIds} />
        </div>
        {erro && <Alert tone="danger">{erro}</Alert>}
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
                <Th>Nº processo</Th>
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
                      <Input value={numeroProcessoEdit} onChange={(e) => setNumeroProcessoEdit(e.target.value)} className="w-28" />
                    </Td>
                    <Td>
                      <Input value={nomeEdit} onChange={(e) => setNomeEdit(e.target.value)} />
                      {erroEdit && <p className="mt-1 text-xs text-red-600">{erroEdit}</p>}
                    </Td>
                    <Td>
                      <SeletorMedidas catalogo={medidasCatalogo} selecionadas={medidaIdsEdit} onChange={setMedidaIdsEdit} />
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
                    <Td className="tabular-nums text-slate-500">{a.numeroProcesso}</Td>
                    <Td className="font-medium text-slate-900">{a.nome}</Td>
                    <Td className="text-slate-500">
                      {a.medidas.length === 0 ? (
                        '—'
                      ) : (
                        <div className="flex flex-wrap gap-1">
                          {a.medidas.map((am) => (
                            <Badge key={am.id} tone={TOM_TIPO[am.medida.tipo]}>
                              {PREFIXO_TIPO[am.medida.tipo]}-{am.medida.codigo}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </Td>
                    <Td>
                      <button onClick={() => alternarAtivo(a)}>
                        <Badge tone={a.ativo ? 'success' : 'neutral'}>{a.ativo ? 'Ativo' : 'Inativo'}</Badge>
                      </button>
                    </Td>
                    <Td className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button size="sm" variant="ghost" onClick={() => iniciarTransferencia(a)} aria-label="Transferir">
                          <ArrowRightLeft className="h-4 w-4" />
                        </Button>
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
                  <Td colSpan={6}>
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

      <Modal
        open={transferindo !== null}
        onClose={() => setTransferindo(null)}
        title={transferindo ? `Transferir ${transferindo.nome}` : undefined}
        description="Escolha a turma de destino e o número que o aluno vai ter lá. O histórico e as notas já lançadas mantêm-se."
        footer={
          <>
            <Button variant="secondary" onClick={() => setTransferindo(null)}>
              Cancelar
            </Button>
            <Button onClick={confirmarTransferencia} loading={aTransferir}>
              Transferir
            </Button>
          </>
        }
      >
        <div className="flex flex-col gap-3">
          <div>
            <Label htmlFor="turma-destino">Turma de destino</Label>
            <Select
              id="turma-destino"
              value={turmaDestinoId}
              onChange={(e) => selecionarTurmaDestino(e.target.value)}
            >
              <option value="">Selecionar…</option>
              {outrasTurmas.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome} ({t.anoLetivo.nome})
                </option>
              ))}
            </Select>
          </div>
          <div>
            <Label htmlFor="numero-destino">Nº nessa turma</Label>
            <Input
              id="numero-destino"
              type="number"
              value={numeroDestino}
              onChange={(e) => setNumeroDestino(e.target.value)}
              className="w-24"
            />
          </div>
          {erroTransferencia && <Alert tone="danger">{erroTransferencia}</Alert>}
        </div>
      </Modal>
    </AppShell>
  );
}
