/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { HistoricalTest, DISCIPLINES } from '../types';

interface HistoricoProps {
  history: HistoricalTest[];
  onReviewTest: (test: HistoricalTest) => void;
  onClearHistory: () => void;
}

export function Historico({ history, onReviewTest, onClearHistory }: HistoricoProps) {
  // Filter states
  const [filterDiscipline, setFilterDiscipline] = useState<string>('all');
  const [filterGrade, setFilterGrade] = useState<'all' | 'approved' | 'failed'>('all');
  const [sortBy, setSortBy] = useState<'date_desc' | 'date_asc' | 'score_desc' | 'score_asc'>('date_desc');
  const [showClearConfirm, setShowClearConfirm] = useState<boolean>(false);

  // Convert dates
  const formatDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      const day = String(d.getDate()).padStart(2, '0');
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const year = d.getFullYear().toString().substring(2);
      const h = String(d.getHours()).padStart(2, '0');
      const m = String(d.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${h}:${m}`;
    } catch {
      return 'N/D';
    }
  };

  // Perform filters & sorting
  const filteredHistory = history
    .filter((test) => {
      if (filterDiscipline !== 'all' && test.discipline !== filterDiscipline) {
        return false;
      }
      if (filterGrade === 'approved' && test.score < 10) {
        return false;
      }
      if (filterGrade === 'failed' && test.score >= 10) {
        return false;
      }
      return true;
    })
    .sort((a, b) => {
      if (sortBy === 'date_desc') {
        return new Date(b.date).getTime() - new Date(a.date).getTime();
      }
      if (sortBy === 'date_asc') {
        return new Date(a.date).getTime() - new Date(b.date).getTime();
      }
      if (sortBy === 'score_desc') {
        return b.score - a.score;
      }
      if (sortBy === 'score_asc') {
        return a.score - b.score;
      }
      return 0;
    });

  // Calculate global historical aggregates
  const totalCompleted = history.length;
  const bestScore = totalCompleted > 0 
    ? Math.max(...history.map((t) => t.score))
    : 0;
  
  const averageScore = totalCompleted > 0
    ? (history.reduce((sum, t) => sum + t.score, 0) / totalCompleted).toFixed(1)
    : '0.0';

  return (
    <div className="space-y-6 pb-10">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-white mb-1 flex items-center gap-2">
            <span className="w-2 h-6 bg-[#6c63ff] rounded-full inline-block"></span> Histórico Académico
          </h2>
          <p className="text-[#a09abb] text-sm">
            Inspeciona a cronologia de todos os testes efetuados e acompanha o teu aproveitamento escolar.
          </p>
        </div>

        {totalCompleted > 0 && (
          <button
            onClick={() => setShowClearConfirm(true)}
            className="flex-shrink-0 px-4 py-2 bg-red-400/10 hover:bg-red-400/20 text-red-400 hover:text-red-300 font-semibold text-xs rounded-xl border border-red-500/25 transition-all cursor-pointer"
          >
            🗑️ Limpar Histórico
          </button>
        )}
      </div>

      {/* FILTER PANEL */}
      {totalCompleted > 0 && (
        <div className="bg-[#12121a] border border-[#2a2a3f] p-4 rounded-xl flex flex-col sm:flex-row items-center gap-4 text-xs sm:text-sm shadow-[0_4px_24px_rgba(108,99,255,0.08)]">
          {/* Discipline selector */}
          <div className="flex flex-col gap-1 w-full sm:w-auto sm:flex-1">
            <label className="text-[10px] sm:text-xs font-bold text-[#a09abb] uppercase">Filtrar Disciplina</label>
            <select
              value={filterDiscipline}
              onChange={(e) => setFilterDiscipline(e.target.value)}
              className="w-full px-3 py-2 rounded-lg bg-[#0a0a0f] border border-[#2a2a3f] text-white text-xs font-medium focus:outline-none"
            >
              <option value="all">Todas as Disciplinas</option>
              {DISCIPLINES.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>

          {/* Grade Selector */}
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-[10px] sm:text-xs font-bold text-[#a09abb] uppercase">Resultado</label>
            <select
              value={filterGrade}
              onChange={(e) => setFilterGrade(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg bg-[#0a0a0f] border border-[#2a2a3f] text-white text-xs font-medium focus:outline-none"
            >
              <option value="all">Todos os Resultados</option>
              <option value="approved">Aprovado (≥10)</option>
              <option value="failed">Reprovado (&lt;10)</option>
            </select>
          </div>

          {/* Sorter Selector */}
          <div className="flex flex-col gap-1 w-full sm:w-auto">
            <label className="text-[10px] sm:text-xs font-bold text-[#a09abb] uppercase">Ordenar Por</label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="w-full px-3 py-2 rounded-lg bg-[#0a0a0f] border border-[#2a2a3f] text-white text-xs font-medium focus:outline-none"
            >
              <option value="date_desc">Data: Recente primeiro</option>
              <option value="date_asc">Data: Antigo primeiro</option>
              <option value="score_desc">Nota: Maior primeiro</option>
              <option value="score_asc">Nota: Menor primeiro</option>
            </select>
          </div>
        </div>
      )}

      {/* HISTORICAL TABLE CONTAINER */}
      {filteredHistory.length > 0 ? (
        <div className="space-y-6 animate-fade-in">
          <div className="bg-[#12121a] border border-[#2a2a3f] rounded-xl overflow-hidden shadow-[0_4px_24px_rgba(108,99,255,0.08)]">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs sm:text-sm">
                <thead>
                  <tr className="bg-[#1a1a27] border-b border-[#2a2a3f] text-[#a09abb] select-none font-bold uppercase tracking-wider text-[10px] sm:text-xs">
                    <th className="px-5 py-4 w-12 text-center">#</th>
                    <th className="px-5 py-4">Nome do Teste</th>
                    <th className="px-5 py-4">Disciplina</th>
                    <th className="px-5 py-4">Data</th>
                    <th className="px-5 py-4 text-center">Nº Perguntas</th>
                    <th className="px-5 py-4 text-center">Nota / 20</th>
                    <th className="px-5 py-4 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#2a2a3f]">
                  {filteredHistory.map((test, idx) => {
                    const isPassed = test.score >= 10;
                    return (
                      <tr key={test.id} className="hover:bg-[#1a1a2755] transition-colors">
                        <td className="px-5 py-4 text-center font-mono text-[#a09abb] font-bold">
                          {idx + 1}
                        </td>
                        <td className="px-5 py-4 font-bold text-white truncate max-w-[150px]">
                          {test.name}
                        </td>
                        <td className="px-5 py-4 text-slate-300 truncate max-w-[150px]" title={test.discipline}>
                          {test.discipline}
                        </td>
                        <td className="px-5 py-4 text-[10px] text-[#a09abb] font-mono">
                          {formatDate(test.date)}
                        </td>
                        <td className="px-5 py-4 text-center text-[#a09abb]">
                          {test.totalQuestions}
                        </td>
                        <td className="px-5 py-4 text-center">
                          <span className={`font-mono font-extrabold text-sm sm:text-base ${isPassed ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                            {test.score.toFixed(1)}
                          </span>
                        </td>
                        <td className="px-5 py-4 text-right">
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

          {/* HISTORICAL SUMMARY LEDGER CARD */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 p-5 bg-[#12121a] border border-[#2a2a3f] rounded-xl shadow-[0_4px_24px_rgba(108,99,255,0.08)]">
            <div className="text-center sm:text-left">
              <span className="text-[#a09abb] text-[10px] uppercase font-bold tracking-wider">Total de Testes</span>
              <p className="text-xl sm:text-2xl font-bold font-display text-white mt-0.5">{filteredHistory.length} testes</p>
            </div>
            <div className="text-center sm:text-left">
              <span className="text-[#a09abb] text-[10px] uppercase font-bold tracking-wider">Média Académica</span>
              <p className={`text-xl sm:text-2xl font-bold font-display mt-0.5 ${parseFloat(averageScore) >= 10 ? 'text-[#22c55e]' : 'text-slate-200'}`}>
                {averageScore} <span className="text-xs text-[#a09abb]">/ 20.0</span>
              </p>
            </div>
            <div className="text-center sm:text-left">
              <span className="text-[#a09abb] text-[10px] uppercase font-bold tracking-wider">Melhor Lançamento</span>
              <p className="text-xl sm:text-2xl font-bold font-display text-[#22c55e] mt-0.5">{bestScore.toFixed(1)} / 20.0</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-[#12121a] border border-[#2a2a3f] rounded-2xl p-12 text-center text-[#a09abb] shadow-[0_4px_24px_rgba(108,99,255,0.08)]">
          <span className="text-5xl block mb-4">📊</span>
          <p className="text-white font-bold mb-1">Sem lançamentos correspondentes.</p>
          <p className="text-xs text-[#a09abb]">
            {totalCompleted === 0 
              ? "Ainda não fizeste nenhum teste de simulação com a IA." 
              : "Nenhum teste coincide com os critérios de filtragem selecionados acima."}
          </p>
        </div>
      )}

      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-fade-in">
          <div className="bg-[#12121a] border border-[#2a2a3f] rounded-2xl max-w-sm w-full p-6 shadow-2xl relative select-none">
            <h3 className="text-lg font-bold text-red-400 mb-2 flex items-center gap-2">
              <span>⚠️</span> Limpar Todo o Histórico
            </h3>
            <p className="text-sm text-[#a09abb] mb-6 leading-relaxed text-left">
              Tens a certeza absoluta que pretendes apagar todo o teu histórico de testes? Esta ação eliminará permanentemente todos os registos e notas associadas de forma irreversível.
            </p>
            <div className="flex items-center justify-end gap-3 font-semibold">
              <button
                onClick={() => setShowClearConfirm(false)}
                className="px-4 py-2 text-xs rounded-lg border border-[#2a2a3f] bg-[#0a0a0f] text-[#a09abb] hover:text-white transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onClearHistory();
                  setShowClearConfirm(false);
                }}
                className="px-4 py-2 text-xs rounded-lg bg-red-650 hover:bg-red-500 text-white transition-colors cursor-pointer"
              >
                Sim, Limpar Tudo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
