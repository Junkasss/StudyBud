/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { HistoricalTest, SavedSummary } from '../types';

interface PerfilProps {
  history: HistoricalTest[];
  summaries: SavedSummary[];
}

export function Perfil({ history, summaries }: PerfilProps) {
  // Username management
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('studybud_username') || 'Estudante';
  });
  const [isEditingName, setIsEditingName] = useState(false);
  const [nameInput, setNameInput] = useState(username);

  // SVG Chart Tooltip State
  const [chartTooltip, setChartTooltip] = useState<{
    x: number;
    y: number;
    score: number;
    date: string;
    name: string;
  } | null>(null);

  // Sync username changes
  const saveUsername = () => {
    const trimmed = nameInput.trim();
    if (trimmed) {
      setUsername(trimmed);
      localStorage.setItem('studybud_username', trimmed);
    }
    setIsEditingName(false);
  };

  // 1. Calculate Initials
  const getInitials = (nameStr: string) => {
    const parts = nameStr.trim().split(' ').filter(Boolean);
    if (parts.length === 0) return 'E';
    if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase().slice(0, 2);
  };

  // 2. Level Criteria
  const nTestes = history.length;
  let levelBadge = { emoji: '🌱', title: 'Iniciante', color: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20' };
  if (nTestes >= 3 && nTestes <= 9) {
    levelBadge = { emoji: '📖', title: 'Estudante', color: 'bg-indigo-500/15 text-[#6c63ff] border-[#6c63ff]/20' };
  } else if (nTestes >= 10 && nTestes <= 19) {
    levelBadge = { emoji: '🎯', title: 'Dedicado', color: 'bg-amber-500/15 text-amber-400 border-amber-500/20' };
  } else if (nTestes >= 20 && nTestes <= 29) {
    levelBadge = { emoji: '🏆', title: 'Expert', color: 'bg-purple-500/15 text-purple-400 border-purple-500/20' };
  } else if (nTestes >= 30) {
    levelBadge = { emoji: '🚀', title: 'Mestre', color: 'bg-red-500/15 text-red-400 border-red-500/20' };
  }

  // 3. Start Date
  const getStartDate = () => {
    if (history.length === 0) return 'Novo Hoje';
    // Get the oldest date from the chronological history list
    const dates = history.map(t => new Date(t.date).getTime());
    const oldestMs = Math.min(...dates);
    return new Date(oldestMs).toLocaleDateString('pt-PT', { day: 'numeric', month: 'long', year: 'numeric' });
  };

  // 4. STAT CORNER CALCULATIONS
  const totalTests = history.length;
  const totalSummaries = summaries.length;
  
  const averageScore = history.length > 0 
    ? (history.reduce((sum, t) => sum + t.score, 0) / history.length).toFixed(1)
    : '0.0';

  const bestScore = history.length > 0
    ? Math.max(...history.map(t => t.score)).toFixed(1)
    : '0.0';

  const recentScore = history.length > 0
    ? history[0].score.toFixed(1)
    : '—';

  // Total study hours / minutes estimation Sum
  const totalStudyMinutes = history.reduce((sum, t) => {
    const mult = t.questions?.partI?.length || 0;
    const des = t.questions?.partII?.length || 0;
    const cod = t.questions?.partIII?.length || 0;
    return sum + (mult * 2 + des * 10 + cod * 15);
  }, 0);

  const formattedStudyTime = totalStudyMinutes >= 60 
    ? `${Math.floor(totalStudyMinutes / 60)}h ${totalStudyMinutes % 60}m`
    : `${totalStudyMinutes} mins`;

  // 5. WEEKLY REPORT CARD (SECÇÃO 6)
  const calculateWeeklyReport = () => {
    const nowMs = Date.now();
    const oneDayMs = 24 * 60 * 60 * 1000;
    const sevenDaysMs = 7 * oneDayMs;
    const fourteenDaysMs = 14 * oneDayMs;

    const thisWeekTests = history.filter(t => (nowMs - new Date(t.date).getTime()) <= sevenDaysMs);
    const lastWeekTests = history.filter(t => {
      const diff = nowMs - new Date(t.date).getTime();
      return diff > sevenDaysMs && diff <= fourteenDaysMs;
    });

    const thisWeekAvg = thisWeekTests.length > 0 
      ? thisWeekTests.reduce((sum, t) => sum + t.score, 0) / thisWeekTests.length
      : 0;

    const lastWeekAvg = lastWeekTests.length > 0
      ? lastWeekTests.reduce((sum, t) => sum + t.score, 0) / lastWeekTests.length
      : 0;

    const diff = thisWeekAvg - lastWeekAvg;
    const trendSymbol = diff >= 0 ? '▲' : '▼';
    const trendColor = diff >= 0 ? 'text-[#22c55e]' : 'text-[#ef4444]';
    const formattedDiff = `${trendSymbol} ${diff >= 0 ? '+' : ''}${diff.toFixed(1)} pontos`;

    return {
      thisWeekCount: thisWeekTests.length,
      thisWeekAverage: thisWeekAvg.toFixed(1),
      lastWeekAverage: lastWeekAvg.toFixed(1),
      trendText: formattedDiff,
      trendColor,
      hasHistoricalContext: lastWeekTests.length > 0
    };
  };

  const weekReport = calculateWeeklyReport();

  // 6. DISCIPLINE PERFORMANCE ACCRUAL (SECÇÃO 4)
  const getDisciplinePerformance = () => {
    const map: Record<string, { count: number; sum: number; best: number }> = {};
    history.forEach((t) => {
      const disc = t.discipline;
      if (!map[disc]) {
        map[disc] = { count: 0, sum: 0, best: 0 };
      }
      map[disc].count++;
      map[disc].sum += t.score;
      if (t.score > map[disc].best) {
        map[disc].best = t.score;
      }
    });

    return Object.entries(map).map(([name, stat]) => {
      const avg = stat.sum / stat.count;
      return {
        name,
        count: stat.count,
        average: avg,
        best: stat.best,
        isApproved: avg >= 10,
      };
    });
  };

  const disciplinesStats = getDisciplinePerformance();

  // 7. ACCOMPLISHMENTS LEAGUE TRACKER (SECÇÃO 5)
  const getStreakConquered = () => {
    if (history.length < 3) return false;
    // History is chronological descending. Let's reverse to check forward chronology streaks.
    const reversed = [...history].reverse();
    let consecutiveCount = 0;
    for (let i = 0; i < reversed.length; i++) {
      if (reversed[i].score >= 14) {
        consecutiveCount++;
        if (consecutiveCount >= 3) return true;
      } else {
        consecutiveCount = 0;
      }
    }
    return false;
  };

  const uniqueDays = new Set(history.map(t => t.date.split('T')[0])).size;
  const uniqueDisciplines = new Set(history.map(t => t.discipline)).size;

  const achievements = [
    {
      id: 'first_test',
      title: 'Primeiro Teste',
      desc: 'Realiza o teu primeiro teste com simulação IA.',
      emoji: '🎯',
      unlocked: history.length >= 1
    },
    {
      id: 'avid_reader',
      title: 'Leitor Ávido',
      desc: 'Gera 5 resumos em Markdown estruturados por IA.',
      emoji: '📚',
      unlocked: summaries.length >= 5
    },
    {
      id: 'approved_ones',
      title: 'Aprovado!',
      desc: 'Tira uma nota superior ou igual a 10 valores (≥10).',
      emoji: '✅',
      unlocked: history.some(t => t.score >= 10)
    },
    {
      id: 'excellent_rating',
      title: 'Excelente!',
      desc: 'Tira um excelente académico com nota maior ou igual a 18.',
      emoji: '🌟',
      unlocked: history.some(t => t.score >= 18)
    },
    {
      id: 'fire_streak',
      title: 'Em Chamas',
      desc: 'Faz 3 testes seguidos com nota maior ou igual a 14.',
      emoji: '🔥',
      unlocked: getStreakConquered()
    },
    {
      id: 'encyclopedia',
      title: 'Enciclopédia',
      desc: 'Mapeia e avalia o teu desempenho em 5 disciplinas diferentes.',
      emoji: '🧠',
      unlocked: uniqueDisciplines >= 5
    },
    {
      id: 'perfectionist',
      title: 'Perfecionista',
      desc: 'Alcança o expoente máximo universitário com uma nota de 20/20.',
      emoji: '💯',
      unlocked: history.some(t => t.score === 20)
    },
    {
      id: 'consistent_student',
      title: 'Consistente',
      desc: 'Executa testes em 5 dias de calendário diferentes.',
      emoji: '📅',
      unlocked: uniqueDays >= 5
    }
  ];

  // 8. EVOLUTION GRAPH PURE SVG LAYOUT ENGINE (SECÇÃO 3)
  const drawEvolutionChart = () => {
    // Take the last 10 tests and show chronologically (oldest to newest)
    const reversedHistory = [...history].slice(0, 10).reverse();
    if (reversedHistory.length < 2) return null;

    // SVG sizes
    const svgWidth = 600;
    const svgHeight = 260;
    const paddingLeft = 40;
    const paddingRight = 40;
    const paddingTop = 20;
    const paddingBottom = 40;

    const graphWidth = svgWidth - paddingLeft - paddingRight;
    const graphHeight = svgHeight - paddingTop - paddingBottom;

    // Map Y: 0 -> 20 values
    // y_px = paddingTop + graphHeight - (score / 20) * graphHeight
    const getY = (score: number) => {
      const ratio = score / 20;
      return paddingTop + graphHeight - ratio * graphHeight;
    };

    // Map X: index -> scale
    const getX = (idx: number) => {
      if (reversedHistory.length === 1) return paddingLeft + graphWidth / 2;
      return paddingLeft + (idx / (reversedHistory.length - 1)) * graphWidth;
    };

    // Pass Line Y coordinate
    const passY = getY(10);

    // Build line path
    const pointsCoordinates = reversedHistory.map((t, idx) => ({
      x: getX(idx),
      y: getY(t.score),
      score: t.score,
      date: new Date(t.date).toLocaleDateString('pt-PT', { day: '2-digit', month: '2-digit' }),
      name: t.name
    }));

    let pathD = '';
    pointsCoordinates.forEach((pt, idx) => {
      if (idx === 0) {
        pathD = `M ${pt.x} ${pt.y}`;
      } else {
        pathD += ` L ${pt.x} ${pt.y}`;
      }
    });

    return {
      svgWidth,
      svgHeight,
      paddingLeft,
      paddingRight,
      paddingTop,
      paddingBottom,
      graphWidth,
      graphHeight,
      passY,
      pointsCoordinates,
      pathD,
      reversedHistory
    };
  };

  const chartData = drawEvolutionChart();

  return (
    <div className="space-y-8 pb-10 select-text">
      
      {/* SECÇÃO 1 — CABEÇALHO DO PERFIL */}
      <div className="bg-[#12121a] border border-[#2a2a3f] p-6 sm:p-8 rounded-2xl shadow-[0_4px_24px_rgba(108,99,255,0.08)] flex flex-col sm:flex-row items-center gap-6">
        
        {/* Dynamic initials avatar */}
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#6c63ff] to-[#a78bfa] flex items-center justify-center text-3xl font-bold text-white shadow-xl flex-shrink-0 border-2 border-indigo-500/20">
          {getInitials(username)}
        </div>

        {/* Info Column */}
        <div className="flex-1 text-center sm:text-left space-y-2">
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 justify-center sm:justify-start">
            {isEditingName ? (
              <div className="flex items-center gap-2 max-w-sm justify-center sm:justify-start">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') saveUsername();
                    if (e.key === 'Escape') {
                      setNameInput(username);
                      setIsEditingName(false);
                    }
                  }}
                  className="px-3 py-1 bg-[#0a0a0f] border border-[#6c63ff] rounded-lg text-white font-bold font-display text-lg focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={saveUsername}
                  className="px-2 py-1.5 bg-[#6c63ff] text-white rounded-lg hover:bg-[#7c74ff] text-xs font-bold cursor-pointer transition-colors"
                >
                  ✓
                </button>
                <button
                  onClick={() => {
                    setNameInput(username);
                    setIsEditingName(false);
                  }}
                  className="px-2 py-1.5 bg-[#2a2a3f] text-[#a09abb] rounded-lg hover:bg-slate-700 text-xs font-bold cursor-pointer transition-colors"
                >
                  ✕
                </button>
              </div>
            ) : (
              <h2 
                onClick={() => { setNameInput(username); setIsEditingName(true); }}
                className="text-2xl font-bold font-display text-white cursor-pointer hover:text-[#7c74ff] transition-colors flex items-center gap-2 justify-center sm:justify-start"
                title="Clica para editar nome de estudante"
              >
                {username}
                <span className="text-sm opacity-50 cursor-pointer">✏️</span>
              </h2>
            )}

            {/* Level badge */}
            <span className={`px-3 py-0.5 text-xs font-bold rounded-full border ${levelBadge.color} inline-flex items-center gap-1 w-max mx-auto sm:mx-0`}>
              <span>{levelBadge.emoji}</span> {levelBadge.title}
            </span>
          </div>

          <p className="text-[#a09abb] text-sm">
            🎓 Licenciatura em Engenharia Informática <span className="opacity-70 text-xs font-mono">(LEI)</span>
          </p>
          <p className="text-xs text-slate-500 font-medium">
            📅 Integrado na plataforma em: {getStartDate()}
          </p>
        </div>
      </div>

      {/* SECÇÃO 2 — CARDS DE ESTATÍSTICAS GERAIS */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
        
        <div className="bg-[#12121a] border border-[#2a2a3f] p-5 rounded-2xl shadow-[0_4px_24px_rgba(108,99,255,0.08)]">
          <span className="text-2xl block mb-2">📝</span>
          <span className="text-xs text-[#a09abb] font-bold uppercase tracking-wider block">Testes Realizados</span>
          <p className="text-3xl font-bold text-white mt-1">{totalTests}</p>
        </div>

        <div className="bg-[#12121a] border border-[#2a2a3f] p-5 rounded-2xl shadow-[0_4px_24px_rgba(108,99,255,0.08)]">
          <span className="text-2xl block mb-2">📚</span>
          <span className="text-xs text-[#a09abb] font-bold uppercase tracking-wider block">Resumos Gerados</span>
          <p className="text-3xl font-bold text-white mt-1">{totalSummaries}</p>
        </div>

        <div className="bg-[#12121a] border border-[#2a2a3f] p-5 rounded-2xl shadow-[0_4px_24px_rgba(108,99,255,0.08)]">
          <span className="text-2xl block mb-2">⭐</span>
          <span className="text-xs text-[#a09abb] font-bold uppercase tracking-wider block">Média Geral</span>
          <p className="text-3xl font-bold text-[#6c63ff] mt-1">{averageScore}<span className="text-xs text-slate-500 font-sans font-medium">/20</span></p>
        </div>

        <div className="bg-[#12121a] border border-[#2a2a3f] p-5 rounded-2xl shadow-[0_4px_24px_rgba(108,99,255,0.08)]">
          <span className="text-2xl block mb-2">🏆</span>
          <span className="text-xs text-[#a09abb] font-bold uppercase tracking-wider block">Melhor Nota</span>
          <p className="text-3xl font-bold text-[#22c55e] mt-1">{bestScore}<span className="text-xs text-slate-500 font-sans font-medium">/20</span></p>
        </div>

        <div className="bg-[#12121a] border border-[#2a2a3f] p-5 rounded-2xl shadow-[0_4px_24px_rgba(108,99,255,0.08)]">
          <span className="text-2xl block mb-2">📈</span>
          <span className="text-xs text-[#a09abb] font-bold uppercase tracking-wider block">Nota Recente</span>
          <p className="text-3xl font-bold text-white mt-1">{recentScore}{recentScore !== '—' && <span className="text-xs text-slate-500 font-sans">/20</span>}</p>
        </div>

        <div className="bg-[#12121a] border border-[#2a2a3f] p-5 rounded-2xl shadow-[0_4px_24px_rgba(108,99,255,0.08)] col-span-2 md:col-span-1">
          <span className="text-2xl block mb-2">⏱️</span>
          <span className="text-xs text-[#a09abb] font-bold uppercase tracking-wider block">Tempo de Estudo Est.</span>
          <p className="text-3xl font-bold text-white mt-1">{formattedStudyTime}</p>
        </div>

      </div>

      {/* Grid containing Evolution Chart & Week Summary */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* SECÇÃO 3 — GRÁFICO DE EVOLUÇÃO (LINHA SVG PURO) */}
        <div className="lg:col-span-2 bg-[#12121a] border border-[#2a2a3f] p-6 rounded-2xl shadow-[0_4px_24px_rgba(108,99,255,0.08)] space-y-4">
          <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
            <span className="w-2 h-5 bg-[#6c63ff] rounded-full inline-block"></span> Evolução de Notas (Últimos 10 exames)
          </h3>

          {chartData ? (
            <div className="relative overflow-visible pt-2">
              <svg 
                viewBox={`0 0 ${chartData.svgWidth} ${chartData.svgHeight}`} 
                className="w-full h-auto overflow-visible"
              >
                {/* Y Axis Grid lines */}
                {[0, 5, 10, 15, 20].map((val) => {
                  const ratio = val / 20;
                  const y = chartData.paddingTop + chartData.graphHeight - ratio * chartData.graphHeight;
                  return (
                    <g key={val} className="opacity-40">
                      <line 
                        x1={chartData.paddingLeft} 
                        y1={y} 
                        x2={chartData.svgWidth - chartData.paddingRight} 
                        y2={y} 
                        stroke="#2a2a3f" 
                        strokeWidth="1" 
                      />
                      <text 
                        x={chartData.paddingLeft - 10} 
                        y={y + 4} 
                        fill="#a09abb" 
                        fontSize="10" 
                        fontFamily="monospace"
                        textAnchor="end"
                      >
                        {val}
                      </text>
                    </g>
                  );
                })}

                {/* Dashed Approval Line (10.0 scale) */}
                <line 
                  x1={chartData.paddingLeft} 
                  y1={chartData.passY} 
                  x2={chartData.svgWidth - chartData.paddingRight} 
                  y2={chartData.passY} 
                  stroke="#ef4444" 
                  strokeWidth="1.5" 
                  strokeDasharray="4 4"
                  className="opacity-70"
                />
                
                <text 
                  x={chartData.svgWidth - chartData.paddingRight - 4} 
                  y={chartData.passY - 6} 
                  fill="#ef4444" 
                  fontSize="8" 
                  fontFamily="monospace"
                  textAnchor="end"
                  className="font-bold opacity-80"
                >
                  Meta de Aprovação (10.0)
                </text>

                {/* Line joining point arrays */}
                <path 
                  d={chartData.pathD} 
                  fill="none" 
                  stroke="#6c63ff" 
                  strokeWidth="3.5" 
                  strokeLinecap="round" 
                  strokeLinejoin="round"
                />

                {/* Data point circles with mouse event callbacks for interactive Tooltip */}
                {chartData.pointsCoordinates.map((pt, idx) => (
                  <circle
                    key={idx}
                    cx={pt.x}
                    cy={pt.y}
                    r="6"
                    fill="#12121a"
                    stroke="#6c63ff"
                    strokeWidth="3"
                    className="cursor-pointer hover:scale-130 transition-transform"
                    onMouseEnter={() => setChartTooltip(pt)}
                    onMouseLeave={() => setChartTooltip(null)}
                  />
                ))}
              </svg>

              {/* Dynamic Interactive Tooltip Render Box */}
              {chartTooltip && (
                <div 
                  className="absolute bg-[#1a1a27] border border-[#2a2a3f] p-2.5 rounded-lg shadow-xl text-center z-40 space-y-0.5 animate-fade-in text-[11px] pointer-events-none"
                  style={{
                    left: `${(chartTooltip.x / chartData.svgWidth) * 100}%`,
                    top: `${(chartTooltip.y / chartData.svgHeight) * 100 - 30}%`,
                    transform: 'translate(-50%, -100%)'
                  }}
                >
                  <p className="font-bold text-white truncate max-w-[120px]">{chartTooltip.name}</p>
                  <p className="text-[#a09abb] font-mono text-[10px]">{chartTooltip.date}</p>
                  <p className="font-bold text-[#6c63ff] font-mono text-xs">Nota: {chartTooltip.score.toFixed(1)} / 20</p>
                </div>
              )}
            </div>
          ) : (
            <div className="h-44 flex items-center justify-center text-[#a09abb] text-xs max-w-md mx-auto text-center border border-dashed border-[#2a2a3f] rounded-xl bg-[#0a0a0f]">
              Precisas de realizar pelo menos 2 simuladores de exame para calibrar o gráfico de evolução.
            </div>
          )}
        </div>

        {/* SECÇÃO 6 — RESUMO DA SEMANA */}
        <div className="bg-[#12121a] border border-[#2a2a3f] p-6 rounded-2xl shadow-[0_4px_24px_rgba(108,99,255,0.08)] flex flex-col justify-between space-y-4">
          <div className="space-y-4">
            <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
              <span className="w-2 h-5 bg-[#6c63ff] rounded-full inline-block"></span> Resumo da Semana
            </h3>

            <div className="space-y-3 pt-2">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#a09abb] tracking-wider block">Frequências efetuadas</span>
                <p className="text-2xl font-bold text-white font-mono mt-0.5">{weekReport.thisWeekCount} exames</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[#a09abb] tracking-wider block">Média Semanal</span>
                <p className="text-2xl font-bold text-[#6c63ff] font-mono mt-0.5">{weekReport.thisWeekAverage} / 20.0</p>
              </div>

              <div>
                <span className="text-[10px] uppercase font-bold text-[#a09abb] tracking-wider block">Comparação Progressiva</span>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className={`font-bold font-mono text-sm ${weekReport.trendColor}`}>
                    {weekReport.trendText}
                  </span>
                  <span className="text-[10px] text-slate-500 font-medium">vs. semana anterior</span>
                </div>
              </div>
            </div>
          </div>

          <div className="p-3 bg-[#6c63ff]/5 border border-[#6c63ff]/15 rounded-xl text-[11px] text-[#a09abb] leading-relaxed">
            ✏️ Estudas com as tónicas corretas em relação à semana precedente! {weekReport.thisWeekCount > 0 ? 'Bom ritmo!' : 'Efetua um simulador para acelerar.'}
          </div>
        </div>

      </div>

      {/* SECÇÃO 4 — DESEMPENHO POR DISCIPLINA */}
      <div className="space-y-4">
        <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
          <span className="w-2 h-5 bg-[#6c63ff] rounded-full inline-block"></span> Aproveitamento Modular por Disciplina
        </h3>

        {disciplinesStats.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {disciplinesStats.map((stat, idx) => (
              <div 
                key={idx} 
                className="bg-[#12121a] border border-[#2a2a3f] p-5 rounded-2xl shadow-[0_4px_24px_rgba(108,99,255,0.08)] space-y-4 hover:border-indigo-500/20 transition-all"
              >
                <div>
                  <h4 className="font-bold text-white text-sm line-clamp-1 truncate" title={stat.name}>
                    {stat.name}
                  </h4>
                  <p className="text-[11px] text-[#a09abb]">{stat.count} {stat.count === 1 ? 'teste realizado' : 'testes realizados'}</p>
                </div>

                {/* Progress bar and scale */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#a09abb]">Média Académica</span>
                    <span className={`font-bold font-mono ${stat.isApproved ? 'text-[#22c55e]' : 'text-[#ef4444]'}`}>
                      {stat.average.toFixed(1)} / 20
                    </span>
                  </div>

                  {/* HTML ProgressBar */}
                  <div className="w-full bg-[#0a0a0f] h-2 rounded-full overflow-hidden border border-[#2a2a3f]">
                    <div 
                      className={`h-full rounded-full transition-all duration-300 ${stat.isApproved ? 'bg-[#22c55e]' : 'bg-[#ef4444]'}`}
                      style={{ width: `${(stat.average / 20) * 100}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-[11px] border-t border-[#2a2a3f] pt-3">
                  <span className="text-slate-500">Melhor nota:</span>
                  <span className="font-bold font-mono text-white">{stat.best.toFixed(1)} Valores</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-[#12121a] border border-[#2a2a3f] rounded-2xl p-10 text-center text-[#a09abb] max-w-xl mx-auto">
            🎨 Sem disciplinas avaliadas no momento. Inicia um simulador para veres as tuas métricas e performance modular organizadas aqui de forma analítica.
          </div>
        )}
      </div>

      {/* SECÇÃO 5 — CONQUISTAS (gaming gamification league) */}
      <div className="space-y-4">
        <h3 className="text-base font-bold font-display text-white flex items-center gap-2">
          <span className="w-2 h-5 bg-[#6c63ff] rounded-full inline-block"></span> Liga de Conquistas Académicas
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={`p-5 rounded-2xl border transition-all ${
                ach.unlocked
                  ? 'bg-[#12121a] border-[#6c63ff]/30 shadow-[0_4px_24px_rgba(108,99,255,0.08)]'
                  : 'bg-[#12121a]/40 border-[#2a2a3f] opacity-50'
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-3xl">{ach.emoji}</span>
                <span>
                  {ach.unlocked ? (
                    <span className="text-[10px] uppercase font-bold text-[#22c55e] bg-[#22c55e]/10 px-2 py-0.5 rounded-full border border-[#22c55e]/20">✓ Ativa</span>
                  ) : (
                    <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">🔒 Bloqueada</span>
                  )}
                </span>
              </div>

              <h4 className={`font-bold text-sm ${ach.unlocked ? 'text-white' : 'text-[#a09abb]'}`}>
                {ach.title}
              </h4>
              <p className="text-[11px] text-[#a09abb] mt-1 leading-relaxed">
                {ach.desc}
              </p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
