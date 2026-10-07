'use client';

import { FileText, FileSpreadsheet } from 'lucide-react';

/** Par de botões "Exportar PDF" / "Exportar Excel" — mesmo estilo usado no resumo do período. */
export function ExportButtons({ pdfHref, xlsxHref }: { pdfHref: string; xlsxHref: string }) {
  const base =
    'inline-flex h-9 items-center gap-1.5 rounded-md border border-slate-300 bg-white px-3 text-sm font-medium text-slate-700 shadow-xs transition-colors duration-150 hover:bg-slate-50';
  return (
    <div className="flex gap-2">
      <a href={pdfHref} className={base}>
        <FileText className="h-4 w-4" />
        Exportar PDF
      </a>
      <a href={xlsxHref} className={base}>
        <FileSpreadsheet className="h-4 w-4" />
        Exportar Excel
      </a>
    </div>
  );
}
