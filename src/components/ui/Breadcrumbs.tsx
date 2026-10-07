'use client';

import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export interface BreadcrumbItem {
  label: string;
  /** Ausente = página atual (não é link). */
  href?: string;
}

/** Trilho de navegação (turma › disciplina › período › …) no topo de uma página. */
export function Breadcrumbs({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Navegação" className="mb-4 flex flex-wrap items-center gap-1.5 text-sm">
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && <ChevronRight className="h-3.5 w-3.5 text-slate-300" aria-hidden="true" />}
          {item.href ? (
            <Link href={item.href} className="text-slate-500 hover:text-brand-600 hover:underline">
              {item.label}
            </Link>
          ) : (
            <span className="font-medium text-slate-700" aria-current="page">
              {item.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}
