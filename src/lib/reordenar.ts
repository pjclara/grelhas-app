'use client';

import { useState } from 'react';

/** Move um elemento de `from` para `to` num array, devolvendo uma cópia nova. */
export function mover<T>(itens: T[], from: number, to: number): T[] {
  if (from === to) return itens;
  const copia = [...itens];
  const [item] = copia.splice(from, 1);
  copia.splice(to, 0, item);
  return copia;
}

/**
 * Handlers HTML5 nativos de drag-and-drop para reordenar uma lista de linhas por
 * arrastar (sem biblioteca externa). `onReordenar` recebe os índices de origem e
 * destino; quem chama decide como atualizar o seu estado (normalmente com `mover`).
 */
export function useArrastarReordenar(onReordenar: (from: number, to: number) => void) {
  const [arrastando, setArrastando] = useState<number | null>(null);

  function aoComecarArrastar(i: number) {
    return (e: React.DragEvent) => {
      setArrastando(i);
      e.dataTransfer.effectAllowed = 'move';
    };
  }

  function aoPassarPorCima(e: React.DragEvent) {
    e.preventDefault();
  }

  function aoSoltar(i: number) {
    return (e: React.DragEvent) => {
      e.preventDefault();
      if (arrastando !== null && arrastando !== i) onReordenar(arrastando, i);
      setArrastando(null);
    };
  }

  function aoTerminarArrastar() {
    setArrastando(null);
  }

  return { arrastando, aoComecarArrastar, aoPassarPorCima, aoSoltar, aoTerminarArrastar };
}
