'use client';

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { Button } from './Button';
import { Input, Select } from './Input';
import { Label } from './Label';
import { Modal } from './Modal';
import { Badge } from './Badge';
import { Alert } from './Alert';

export interface CreatableItem {
  id: string;
  nome: string;
}

interface BaseProps<T extends CreatableItem> {
  id: string;
  label: string;
  itens: T[];
  /** Mostra o botão "+ Novo" (normalmente ligado a isAdmin na página). */
  podeCriar: boolean;
  tituloModal: string;
  onCriar: (nome: string) => Promise<T>;
}

interface CreatableSelectSingleProps<T extends CreatableItem> extends BaseProps<T> {
  multiple?: false;
  value: string;
  onChange: (id: string) => void;
}

interface CreatableSelectMultiProps<T extends CreatableItem> extends BaseProps<T> {
  multiple: true;
  value: string[];
  onChange: (ids: string[]) => void;
}

/**
 * Select (single) ou multiselect (chips + select "adicionar") com um
 * botão "+ Novo" que abre um modal para criar o item em falta sem sair
 * da página — o novo item é adicionado à lista e selecionado
 * automaticamente, mantendo o resto do formulário intacto.
 */
export function CreatableSelect<T extends CreatableItem>(
  props: CreatableSelectSingleProps<T> | CreatableSelectMultiProps<T>
) {
  const { id, label, itens, podeCriar, tituloModal, onCriar } = props;
  const [aCriar, setACriar] = useState(false);
  const [nomeNovo, setNomeNovo] = useState('');
  const [erroNovo, setErroNovo] = useState<string | null>(null);
  const [aGravar, setAGravar] = useState(false);

  async function confirmarCriacao() {
    setErroNovo(null);
    if (!nomeNovo.trim()) {
      setErroNovo('Indique um nome.');
      return;
    }
    setAGravar(true);
    try {
      const novo = await onCriar(nomeNovo.trim());
      if (props.multiple) {
        props.onChange([...props.value, novo.id]);
      } else {
        props.onChange(novo.id);
      }
      setNomeNovo('');
      setACriar(false);
    } catch (e) {
      setErroNovo(e instanceof Error ? e.message : 'Não foi possível criar.');
    } finally {
      setAGravar(false);
    }
  }

  return (
    <div>
      <Label htmlFor={id}>{label}</Label>

      {props.multiple ? (
        <div className="flex flex-col gap-2">
          {props.value.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {props.value.map((selId) => {
                const item = itens.find((i) => i.id === selId);
                if (!item) return null;
                return (
                  <Badge key={selId} tone="brand">
                    {item.nome}
                    <button
                      type="button"
                      onClick={() => props.onChange(props.value.filter((v) => v !== selId))}
                      aria-label={`Remover ${item.nome}`}
                      className="ml-0.5 hover:text-red-600"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </Badge>
                );
              })}
            </div>
          )}
          <div className="flex gap-2">
            <Select
              id={id}
              value=""
              onChange={(e) => {
                const val = e.target.value;
                if (val) props.onChange([...props.value, val]);
              }}
              className="flex-1"
            >
              <option value="">Adicionar…</option>
              {itens
                .filter((i) => !props.value.includes(i.id))
                .map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.nome}
                  </option>
                ))}
            </Select>
            {podeCriar && (
              <Button type="button" variant="secondary" size="sm" onClick={() => setACriar(true)}>
                <Plus className="h-4 w-4" />
                Novo
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <Select id={id} value={props.value} onChange={(e) => props.onChange(e.target.value)} className="flex-1">
            <option value="">Selecionar…</option>
            {itens.map((i) => (
              <option key={i.id} value={i.id}>
                {i.nome}
              </option>
            ))}
          </Select>
          {podeCriar && (
            <Button type="button" variant="secondary" size="sm" onClick={() => setACriar(true)}>
              <Plus className="h-4 w-4" />
              Novo
            </Button>
          )}
        </div>
      )}

      <Modal
        open={aCriar}
        onClose={() => setACriar(false)}
        title={tituloModal}
        footer={
          <>
            <Button variant="secondary" onClick={() => setACriar(false)}>
              Cancelar
            </Button>
            <Button onClick={confirmarCriacao} loading={aGravar}>
              Guardar
            </Button>
          </>
        }
      >
        <div>
          <Label htmlFor={`${id}-novo-nome`}>Nome</Label>
          <Input id={`${id}-novo-nome`} value={nomeNovo} onChange={(e) => setNomeNovo(e.target.value)} autoFocus />
          {erroNovo && (
            <div className="mt-2">
              <Alert tone="danger">{erroNovo}</Alert>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
}
