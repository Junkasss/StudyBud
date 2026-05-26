/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { SavedSummary } from '../types';
import { MarkdownRenderer } from './MarkdownRenderer';

interface ResumosProps {
  summaries: SavedSummary[];
  onDeleteSummary: (id: number) => void;
}

export function Resumos({ summaries, onDeleteSummary }: ResumosProps) {
  const [selectedSummary, setSelectedSummary] = useState<SavedSummary | null>(null);

  // Helper to format date
  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear().toString().substring(2);
      return `${day}/${month}/${year}`;
    } catch {
      return 'N/D';
    }
  };

  // Helper to strip markdown and get plain snippet
  const getPlainSnippet = (markdown: string, limit: number) => {
    const withoutHeaders = markdown.replace(/[#*`\-]/g, ' ');
    const cleaned = withoutHeaders.replace(/\s+/g, ' ').trim();
    if (cleaned.length <= limit) return cleaned;
    return cleaned.substring(0, limit) + '...';
  };

  // Download .txt file in browser helper
  const handleExportTxt = (summary: SavedSummary) => {
    try {
      const element = document.createElement('a');
      const file = new Blob([summary.content], { type: 'text/plain;charset=utf-8' });
      element.href = URL.createObjectURL(file);
      
      const cleanDiscipline = summary.discipline.replace(/[^a-zA-Z0-9]/g, '_');
      const cleanPdfName = summary.pdfName.replace(/\s+/g, '_').replace(/\.pdf$/i, '');
      element.download = `StudyBud_Resumo_${cleanDiscipline}_${cleanPdfName}.txt`;
      
      document.body.appendChild(element);
      element.click();
      document.body.removeChild(element);
    } catch (e) {
      console.error('Export text failure:', e);
      alert('Erro ao exportar resumo. Tenta novamente.');
    }
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Title */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-white mb-1 flex items-center gap-2">
          <span className="w-2 h-6 bg-[#6c63ff] rounded-full inline-block"></span> Biblioteca de Resumos
        </h2>
        <p className="text-[#a09abb] text-sm">
          Acede a todos os resumos Markdown gerados pela IA a partir dos teus slides da Engenharia Informática.
        </p>
      </div>

      {summaries.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {summaries.map((summary) => (
            <div
              key={summary.id}
              className="bg-[#12121a] border border-[#2a2a3f] p-5 rounded-xl hover:border-[#6c63ff]/30 transition-all shadow-[0_4px_24px_rgba(108,99,255,0.08)] flex flex-col justify-between group"
            >
              <div className="space-y-3">
                {/* Meta Header */}
                <div className="flex items-start justify-between">
                  <span className="px-2.5 py-1 bg-[#6c63ff]/10 text-indigo-300 font-semibold text-xs rounded border border-[#6c63ff]/20 max-w-[80%] truncate" title={summary.discipline}>
                    {summary.discipline}
                  </span>
                  <span className="text-xs font-mono text-[#a09abb]">{formatDate(summary.date)}</span>
                </div>

                {/* File Attachment */}
                <div className="flex items-center gap-1.5 text-[11px] text-[#a09abb]">
                  <span>📎</span>
                  <span className="truncate max-w-[90%] font-medium" title={summary.pdfName}>{summary.pdfName}</span>
                </div>

                {/* Content snippet */}
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed block-ellipsis select-none h-16 overflow-hidden">
                  {getPlainSnippet(summary.content, 180)}
                </p>
              </div>

              {/* Action row */}
              <div className="flex items-center gap-3 pt-4 mt-2 border-t border-[#2a2a3f]">
                <button
                  onClick={() => setSelectedSummary(summary)}
                  className="flex-1 py-1.5 bg-[#6c63ff] hover:bg-[#7c74ff] text-white font-bold text-xs rounded-lg transition-all text-center cursor-pointer"
                >
                  Ver Completo
                </button>
                <button
                  onClick={() => handleExportTxt(summary)}
                  className="px-3 py-1.5 bg-[#0a0a0f] hover:bg-[#1a1a27] border border-[#2a2a3f] text-[#a09abb] hover:text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                  title="Descarregar resumo como .txt"
                >
                  📥 Exportar
                </button>
                <button
                  onClick={() => {
                    if (confirm('Tens a certeza que desejas apagar definitivamente este resumo?')) {
                      onDeleteSummary(summary.id);
                    }
                  }}
                  className="w-8 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/10 hover:border-red-500/20 flex items-center justify-center transition-colors text-sm cursor-pointer"
                  title="Eliminar resumo"
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="bg-[#12121a] border border-[#2a2a3f] rounded-2xl p-12 text-center text-[#a09abb] shadow-[0_4px_24px_rgba(108,99,255,0.08)] max-w-2xl mx-auto mt-6">
          <span className="text-5xl block mb-4">📚</span>
          <p className="text-white font-bold mb-1">A tua biblioteca está vazia.</p>
          <p className="text-xs text-[#a09abb] leading-relaxed max-w-md mx-auto">
            Ainda não processaste nenhum slide. Cria uma <strong>Nova Sessão</strong> clicando no menu à esquerda, faz o upload de um ficheiro PDF e pede para gerar o resumo.
          </p>
        </div>
      )}

      {/* DETAILED OVERLAY PANEL (MODAL) */}
      {selectedSummary && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm transition-opacity animate-fade-in">
          <div className="w-full max-w-3xl h-full bg-[#12121a] border-l border-[#2a2a3f] p-6 flex flex-col justify-between shadow-2xl animate-slide-left">
            
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-[#2a2a3f] pb-4">
              <div className="space-y-1 overflow-hidden pr-4">
                <span className="px-2 py-0.5 bg-[#6c63ff]/10 text-indigo-300 text-[10px] font-bold uppercase rounded border border-[#6c63ff]/20">
                  {selectedSummary.discipline}
                </span>
                <h3 className="text-lg font-bold font-display text-white truncate max-w-xl pr-2">
                  {selectedSummary.pdfName.replace(/\.pdf$/i, '')}
                </h3>
                <p className="text-xs text-[#a09abb] font-mono">
                  Gerado em: {new Date(selectedSummary.date).toLocaleString()}
                </p>
              </div>
              <button
                onClick={() => setSelectedSummary(null)}
                className="w-8 h-8 rounded-full bg-[#0a0a0f] border border-[#2a2a3f] text-[#a09abb] hover:text-white flex items-center justify-center text-sm font-bold shadow-sm transition-colors cursor-pointer hover:border-[#6c63ff]"
              >
                ✕
              </button>
            </div>

            {/* Modal Body (Scrollable container for Markdown) */}
            <div className="flex-1 overflow-y-auto my-5 space-y-4">
              <MarkdownRenderer content={selectedSummary.content} />
            </div>

            {/* Modal Footer (Controls) */}
            <div className="flex items-center gap-4 border-t border-[#2a2a3f] pt-4">
              <button
                onClick={() => handleExportTxt(selectedSummary)}
                className="flex-1 py-2.5 bg-gradient-to-br from-[#6c63ff] to-[#a78bfa] hover:brightness-110 text-white font-bold text-sm rounded-xl tracking-tight text-center cursor-pointer shadow-lg"
              >
                📥 Descarregar como Ficheiro .txt
              </button>
              <button
                onClick={() => setSelectedSummary(null)}
                className="px-6 py-2.5 bg-[#0a0a0f] hover:bg-[#1a1a27] border border-[#2a2a3f] text-slate-300 hover:text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer"
              >
                Fechar
              </button>
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
