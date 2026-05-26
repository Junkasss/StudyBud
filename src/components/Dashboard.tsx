/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { HistoricalTest, SavedSummary, ViewType } from '../types';

interface DashboardProps {
  history: HistoricalTest[];
  summaries: SavedSummary[];
  onNavigate: (view: ViewType, options?: { mode?: 'summary' | 'test' }) => void;
  onReviewTest: (test: HistoricalTest) => void;
}

export function Dashboard({ history, summaries, onNavigate, onReviewTest }: DashboardProps) {
  // Compute Stats
  const totalTests = history.length;
  
  const mediaGeral = totalTests > 0 
    ? (history.reduce((sum, test) => sum + test.score, 0) / totalTests).toFixed(1)
    : '0.0';

  const pdfsCount = summaries.length;

  // Get last 3 tests
  const recentTests = [...history]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 3);

  // Helper to format date
  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear();
      const hours = String(d.getHours()).padStart(2, '0');
      const minutes = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} às ${hours}:${minutes}`;
    } catch {
      return 'Data indisponível';
    }
  };

  return (
    <div className="space-y-8 pb-10">
      {/* Header Greeting */}
      <div>
        <h2 className="text-3xl font-bold font-display tracking-tight text-white mb-1">
          Olá, Estudante! 👋
        </h2>
        <p className="text-[#a09abb] text-sm">
          Pronto para dominar Engenharia Informática hoje? Prepara exames da LEI com apoio da IA.
        </p>
      </div>

      {/* Grid Estatísticas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-[#12121a] border border-[#2a2a3f] p-6 rounded-2xl shadow-[0_4px_24px_rgba(108,99,255,0.08)] flex flex-col justify-between hover:border-indigo-500/30 transition-all">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[#a09abb] text-xs font-bold uppercase tracking-wider">Total de Testes</span>
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M16 6 C16 6, 8 4, 4 6 L4 26 C8 24, 16 26, 16 26" stroke="#6c63ff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 6 C16 6, 24 4, 28 6 L28 26 C24 24, 16 26, 16 26" stroke="#6c63ff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="16" y1="6" x2="16" y2="26" stroke="#6c63ff" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
            <p className="text-4xl font-bold font-display text-white">{totalTests}</p>
          </div>
          <p className="text-xs text-indigo-400/80 mt-2 font-medium">Resolvidos e avaliados semanticamente</p>
        </div>

        <div className="bg-[#12121a] border border-[#2a2a3f] p-6 rounded-2xl shadow-[0_4px_24px_rgba(108,99,255,0.08)] flex flex-col justify-between hover:border-indigo-500/30 transition-all">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[#a09abb] text-xs font-bold uppercase tracking-wider">Média Geral</span>
              <span className="text-2xl">📊</span>
            </div>
            <p className={`text-4xl font-bold font-display ${
              parseFloat(mediaGeral) >= 10 ? 'text-[#22c55e]' : parseFloat(mediaGeral) > 0 ? 'text-[#ef4444]' : 'text-slate-400'
            }`}>
              {mediaGeral} <span className="text-sm font-sans font-medium text-slate-500">/20</span>
            </p>
          </div>
          <p className="text-xs text-[#a09abb] mt-2 font-medium">Fatores de correção académica universitária</p>
        </div>

        <div className="bg-[#12121a] border border-[#2a2a3f] p-6 rounded-2xl shadow-[0_4px_24px_rgba(108,99,255,0.08)] flex flex-col justify-between hover:border-indigo-500/30 transition-all">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-[#a09abb] text-xs font-bold uppercase tracking-wider">PDFs Processados</span>
              <span className="text-2xl">📚</span>
            </div>
            <p className="text-4xl font-bold font-display text-white">{pdfsCount}</p>
          </div>
          <p className="text-xs text-indigo-400/80 mt-2 font-medium">Resumos teóricos estruturados e salvos</p>
        </div>
      </div>

      {/* Início Rápido Section */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold font-display text-white flex items-center gap-2">
          <span className="w-2 h-6 bg-[#6c63ff] rounded-full"></span> Início Rápido
        </h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <button
            onClick={() => onNavigate('nova_sessao', { mode: 'summary' })}
            className="group relative overflow-hidden bg-gradient-to-br from-[#6c63ff] to-[#a78bfa] p-6 rounded-xl text-left flex items-center justify-between transition-all hover:scale-[1.01] cursor-pointer"
          >
            <div>
              <h4 className="text-xl font-bold text-white mb-1">📄 Gerar Resumo da Matéria</h4>
              <p className="text-[#f1f0ffaa] text-sm">
                Carrega os teus slides e deixa a IA resumir tudo.
              </p>
            </div>
            <span className="text-4xl group-hover:scale-110 transition-transform">📚</span>
          </button>

          <button
            onClick={() => onNavigate('nova_sessao', { mode: 'test' })}
            className="group bg-[#12121a] border-2 border-dashed border-[#2a2a3f] p-6 rounded-xl text-left flex items-center justify-between transition-all hover:border-[#6c63ff] hover:bg-[#1a1a27] hover:scale-[1.01] cursor-pointer"
          >
            <div>
              <h4 className="text-xl font-bold text-white mb-1">📝 Criar Teste Personalizado</h4>
              <p className="text-[#a09abb] text-sm">
                Gera perguntas de exame baseadas no teu PDF.
              </p>
            </div>
            <span className="text-4xl opacity-50 group-hover:opacity-100 transition-opacity">🖍️</span>
          </button>
        </div>
      </div>

      {/* Tabela dos Últimos Testes */}
      <div className="space-y-4">
        <h3 className="text-lg font-bold font-display text-white flex items-center gap-2">
          <span className="w-2 h-6 bg-[#6c63ff] rounded-full"></span> Atividade Recente
        </h3>
        
        {recentTests.length > 0 ? (
          <div className="bg-[#12121a] border border-[#2a2a3f] rounded-xl overflow-hidden shadow-[0_4px_24px_rgba(108,99,255,0.08)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="bg-[#1a1a27] border-b border-[#2a2a3f] text-[#a09abb] text-xs uppercase font-bold tracking-wider">
                    <th className="px-6 py-4">Disciplina</th>
                    <th className="px-6 py-4">Nome do Teste</th>
                    <th className="px-6 py-4">Data de Conclusão</th>
                    <th className="px-6 py-4 text-center">Nota</th>
                    <th className="px-6 py-4 text-center">Estado</th>
                    <th className="px-6 py-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2a3f]">
                  {recentTests.map((test) => {
                    const isApproved = test.score >= 10;
                    return (
                      <tr key={test.id} className="hover:bg-[#1a1a2755] transition-colors">
                        <td className="px-6 py-4 font-semibold text-white truncate max-w-[200px]" title={test.discipline}>
                          {test.discipline}
                        </td>
                        <td className="px-6 py-4 text-slate-300">
                          {test.name || 'Sem nome'}
                        </td>
                        <td className="px-6 py-4 text-xs text-[#a09abb]">
                          {formatDate(test.date)}
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`font-mono font-bold text-base ${isApproved ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                            {test.score.toFixed(1)}
                          </span>
                          <span className="text-xs text-slate-500 font-medium">/20</span>
                        </td>
                        <td className="px-6 py-4 text-center">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold leading-none ${
                            isApproved 
                              ? 'bg-green-500/10 text-[#22c55e] border border-green-500/20' 
                              : 'bg-red-500/10 text-[#ef4444] border border-red-500/20'
                          }`}>
                            {isApproved ? 'Aprovado' : 'Reprovado'}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right">
                          <button
                            onClick={() => onReviewTest(test)}
                            className="text-[#6c63ff] hover:text-[#7c74ff] text-sm font-bold cursor-pointer transition-colors"
                          >
                            Rever →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="sb-bg-panel border sb-border rounded-2xl p-8 text-center text-slate-500 sb-shadow">
            <span className="text-4xl block mb-3">🎓</span>
            <p className="text-sm font-medium">Ainda não realizaste nenhum teste de avaliação.</p>
            <p className="text-xs mt-1 text-slate-650 text-slate-400">
              Usa o Início Rápido acima para carregar o teu primeiro PDF e gerar um teste autónomo!
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
