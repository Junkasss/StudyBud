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
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Garante que o estado 'resumos' é inicializado assim as per CORREÇÃO 4
  const [resumos, setResumos] = useState<SavedSummary[]>(() => {
    try {
      const stored = localStorage.getItem('studybud_summaries');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Keep synced with parent and localStorage
  React.useEffect(() => {
    try {
      const stored = localStorage.getItem('studybud_summaries');
      if (stored) {
        setResumos(JSON.parse(stored));
      }
    } catch {}
  }, [summaries]);

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

  const exportToPDF = async (resumo: SavedSummary) => {
    // Converte Markdown para HTML manualmente
    const markdownToHTML = (md: string): string => {
      return md
        .replace(/^# (.*$)/gm, '<h1>$1</h1>')
        .replace(/^## (.*$)/gm, '<h2>$1</h2>')
        .replace(/^### (.*$)/gm, '<h3>$1</h3>')
        .replace(/^#### (.*$)/gm, '<h4>$1</h4>')
        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        .replace(/\*(.*?)\*/g, '<em>$1</em>')
        .replace(/`(.*?)`/g, '<code>$1</code>')
        .replace(/```[\w]*\n([\s\S]*?)```/g, '<pre><code>$1</code></pre>')
        .replace(/^\| (.+)/gm, (match) => {
          const cells = match.split('|').filter(c => c.trim());
          return '<tr>' + cells.map(c => `<td>${c.trim()}</td>`).join('') + '</tr>';
        })
        .replace(/^---$/gm, '<hr>')
        .replace(/^\- (.*$)/gm, '<li>$1</li>')
        .replace(/^\d+\. (.*$)/gm, '<li>$1</li>')
        .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
        .replace(/\n\n/g, '</p><p>')
        .replace(/^(?!<[h|u|p|l|c|p|h|t])(.*$)/gm, '<p>$1</p>');
    };

    const htmlContent = markdownToHTML(resumo.content);

    // Cria um elemento temporário invisível no DOM do browser
    const element = document.createElement('div');
    element.style.padding = '40px';
    element.style.color = '#1a1a2e';
    element.style.fontFamily = "'Inter', sans-serif";
    
    element.innerHTML = `
      <div style="background: linear-gradient(135deg, #6c63ff, #a78bfa); color: white; padding: 24px; margin-bottom: 24px; border-radius: 12px;">
        <h1 style="margin: 0; font-size: 24px; color: white; border: none; font-weight: 700;">📚 ${resumo.nomeTeste || 'Resumo'}</h1>
        <p style="margin: 6px 0 0 0; font-size: 13.5px; opacity: 0.9;">${resumo.discipline} &nbsp;•&nbsp; Gerado em ${new Date(resumo.date).toLocaleDateString('pt-PT')} &nbsp;•&nbsp; StudyBud</p>
      </div>
      <div class="pdf-content" style="line-height: 1.6; font-size: 14.5px;">
        ${htmlContent}
      </div>
    `;

    // Define os estilos CSS injetados no PDF
    const style = document.createElement('style');
    style.innerHTML = `
      h1 { font-size: 20px; color: #6c63ff; border-bottom: 2px solid #5b52e0; padding-bottom: 6px; margin-top: 24px; margin-bottom: 12px; font-weight: 700; }
      h2 { font-size: 16px; color: #5b52e0; margin-top: 20px; margin-bottom: 10px; padding-left: 8px; border-left: 4px solid #6c63ff; font-weight: 700; }
      h3 { font-size: 14px; color: #1a1a2e; margin-top: 16px; margin-bottom: 8px; font-weight: 600; }
      p { margin-bottom: 10px; text-align: justify; }
      ul, ol { margin-top: 8px; margin-bottom: 12px; padding-left: 20px; }
      li { margin-bottom: 4px; }
      code { background: #f0eeff; color: #6c63ff; padding: 2px 6px; border-radius: 4px; font-family: monospace; font-size: 12px; }
      pre { background: #1a1a2e; color: #e6edf3; padding: 14px; border-radius: 8px; overflow-x: auto; margin: 12px 0; font-family: monospace; font-size: 12px; }
      pre code { background: none; color: #e6edf3; padding: 0; }
      table { width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 13px; }
      th { background: #6c63ff; color: white; padding: 8px; text-align: left; }
      td { padding: 6px 8px; border-bottom: 1px solid #e0e0f0; }
      tr:nth-child(even) td { background: #f8f7ff; }
    `;
    element.appendChild(style);

    // Configuração do html2pdf.js
    const opt = {
      margin:       10,
      filename:     `${resumo.nomeTeste || 'Resumo'}-${resumo.discipline}.pdf`,
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true },
      jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    // Executa a conversão direta e faz o download sem abrir nova janela
    // @ts-ignore
    if (window.html2pdf) {
      // @ts-ignore
      window.html2pdf().from(element).set(opt).save();
    } else {
      alert('Erro: O exportador de PDF não está disponível. Recarrega a página.');
    }
  };

  // No componente de Resumos, a função de eliminar deve ser as per CORREÇÃO 4
  const handleDeleteResumo = (id: number) => {
    setDeleteConfirmId(id);
  };

  const confirmDeleteResumo = () => {
    if (deleteConfirmId === null) return;
    const id = deleteConfirmId;
    
    // Atualiza o estado local
    const novosResumos = resumos.filter(r => r.id !== id);
    setResumos(novosResumos);
    
    // Atualiza o localStorage
    localStorage.setItem('studybud_summaries', JSON.stringify(novosResumos));
    
    // Notifica o parent
    onDeleteSummary(id);
    
    setDeleteConfirmId(null);
  };

  return (
    <div className="space-y-6 pb-10 flex-1">
      {/* Title */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-white mb-1 flex items-center gap-2">
          <span className="w-2 h-6 bg-[#6c63ff] rounded-full inline-block"></span> Biblioteca de Resumos
        </h2>
        <p className="text-[#a09abb] text-sm text-left">
          Acede a todos os resumos Markdown gerados pela IA a partir dos teus slides da Engenharia Informática.
        </p>
      </div>

      {resumos.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {resumos.map((summary) => (
            <div
              key={summary.id}
              className="bg-[#12121a] border border-[#2a2a3f] p-5 rounded-xl hover:border-[#6c63ff]/30 transition-all shadow-[0_4px_24px_rgba(108,99,255,0.08)] flex flex-col justify-between group"
            >
              <div className="space-y-3">
                {/* Visual Title Header In Highlight as per CORREÇÃO 5 */}
                <div style={{fontWeight: 'bold', fontSize: '1.1rem', color: '#f1f0ff', marginBottom: '4px', textAlign: 'left'}}>
                  📄 {summary.nomeTeste || `Resumo_${summary.discipline}`}
                </div>
                <div style={{fontSize: '0.85rem', color: '#a09abb', marginBottom: '12px', textAlign: 'left'}}>
                  {summary.discipline} • {formatDate(summary.date)} • {summary.pdfName}
                </div>

                {/* Content snippet */}
                <p className="text-slate-300 text-xs sm:text-sm leading-relaxed block-ellipsis select-none h-16 overflow-hidden text-left">
                  {getPlainSnippet(summary.content, 180)}
                </p>
              </div>

              {/* Action row */}
              <div className="flex flex-col gap-3 pt-4 mt-2 border-t border-[#2a2a3f]">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedSummary(summary)}
                    className="flex-1 py-1.5 bg-[#6c63ff] hover:bg-[#7c74ff] text-white font-bold text-xs rounded-lg transition-all text-center cursor-pointer"
                  >
                    Ver Completo
                  </button>
                  <button
                    onClick={() => handleDeleteResumo(summary.id)}
                    className="w-10 h-8 rounded-lg bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/10 hover:border-red-500/20 flex items-center justify-center transition-colors text-sm cursor-pointer"
                    title="Eliminar resumo"
                  >
                    🗑️
                  </button>
                </div>
                <div className="flex flex-col items-stretch pt-1">
                  <button
                    onClick={() => exportToPDF(summary)}
                    className="w-full py-1.5 bg-[#0a0a0f] hover:bg-[#1a1a27] border border-[#2a2a3f] text-[#a09abb] hover:text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center justify-center gap-1"
                  >
                    📄 Exportar PDF
                  </button>
                </div>
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
              <div className="space-y-1 overflow-hidden pr-4 text-left">
                <span className="px-2 py-0.5 bg-[#6c63ff]/10 text-indigo-300 text-[10px] font-bold uppercase rounded border border-[#6c63ff]/20">
                  {selectedSummary.discipline}
                </span>
                <h3 className="text-lg font-bold font-display text-white truncate max-w-xl pr-2">
                  {selectedSummary.nomeTeste || selectedSummary.pdfName.replace(/\.pdf$/i, '')}
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
            <div className="flex-1 overflow-y-auto my-5 space-y-4 text-left select-text">
              <MarkdownRenderer content={selectedSummary.content} />
            </div>

            {/* Modal Footer (Controls) */}
            <div className="flex flex-col gap-3 border-t border-[#2a2a3f] pt-4">
              <div className="flex items-stretch gap-4 w-full">
                <div className="flex-1 flex flex-col items-stretch">
                  <button
                    onClick={() => exportToPDF(selectedSummary)}
                    className="w-full py-2.5 bg-gradient-to-br from-[#6c63ff] to-[#a78bfa] hover:brightness-110 text-white font-bold text-sm rounded-xl tracking-tight text-center cursor-pointer shadow-lg flex items-center justify-center gap-2"
                  >
                    📄 Exportar PDF
                  </button>
                </div>
                <button
                  onClick={() => setSelectedSummary(null)}
                  className="px-6 py-2.5 bg-[#0a0a0f] hover:bg-[#1a1a27] border border-[#2a2a3f] text-slate-300 hover:text-white font-semibold text-sm rounded-xl transition-colors cursor-pointer self-start"
                >
                  Fechar
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#12121a] border border-[#2a2a3f] rounded-2xl max-w-sm w-full p-6 shadow-2xl relative select-none">
            <h3 className="text-lg font-bold text-red-400 mb-2 flex items-center gap-2">
              <span>⚠️</span> Eliminar Resumo
            </h3>
            <p className="text-sm text-[#a09abb] mb-6 leading-relaxed text-left">
              Tens a certeza que pretendes eliminar este resumo da tua biblioteca? Esta ação não pode ser desfeita.
            </p>
            <div className="flex items-center justify-end gap-3 font-semibold">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 text-xs rounded-lg border border-[#2a2a3f] bg-[#0a0a0f] text-[#a09abb] hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={confirmDeleteResumo}
                className="px-4 py-2 text-xs rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer"
              >
                Sim, Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
