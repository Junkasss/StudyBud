/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { TestQuestions, TestAnswers, AICorrectionResult, HistoricalTest } from '../types';

interface ResultadosCorrecaoProps {
  testName: string;
  discipline: string;
  numeroTeste?: string;
  questions: TestQuestions;
  answers: TestAnswers;
  grades: AICorrectionResult;
  onSaveHistory: (test: HistoricalTest) => void;
  onRestart: () => void;
  isHistoricalReview?: boolean; // If review mode, hide save buttons
}

export function ResultadosCorrecao({
  testName,
  discipline,
  numeroTeste,
  questions,
  answers,
  grades,
  onSaveHistory,
  onRestart,
  isHistoricalReview = false,
}: ResultadosCorrecaoProps) {
  const [hasSaved, setHasSaved] = useState(isHistoricalReview);
  const [hasAssociated, setHasAssociated] = useState(false);

  // 1. Calculate Part I Score (MCQ)
  let partIAnswersCorrect = 0;
  const partITotal = questions.partI.length;
  
  questions.partI.forEach((q) => {
    const studentChoice = answers.partI[q.id];
    if (studentChoice === q.correctAnswer) {
      partIAnswersCorrect++;
    }
  });

  const partIWeightScore = partITotal > 0 
    ? (partIAnswersCorrect / partITotal) * 7 
    : 0;

  // 2. Calculate Part II Score (Essay)
  let partIIGradeSum = 0;
  let partIITotalMax = questions.partII.length * 5;
  
  grades.developmentGrades.forEach((g) => {
    partIIGradeSum += g.score;
  });

  const partIIWeightScore = partIITotalMax > 0
    ? (partIIGradeSum / partIITotalMax) * 7
    : 0;

  // 3. Calculate Part III Score (Programming)
  let partIIIGradeSum = 0;
  let partIIITotalMax = questions.partIII.length * 5;
  
  grades.codeGrades.forEach((g) => {
    partIIIGradeSum += g.score;
  });

  const partIIIWeightScore = partIIITotalMax > 0
    ? (partIIIGradeSum / partIIITotalMax) * 6
    : 0;

  // Final scale 0-20 score calculation as per prompt:
  // - MCQ: 35% weight (7 points max)
  // - Essay: 35% weight (7 points max)
  // - Code: 30% weight (6 points max)
  // - Round to 1 decimal place
  const totalScoreRaw = partIWeightScore + partIIWeightScore + partIIIWeightScore;
  const finalScoreScaled = Math.round(totalScoreRaw * 10) / 10;

  // Badge classification as requested
  const getClassificationBadge = (score: number) => {
    if (score >= 18) return { label: 'Excelente 🌟', style: 'bg-green-500/10 text-green-400 border border-green-500/20' };
    if (score >= 16) return { label: 'Muito Bom ✨', style: 'bg-blue-500/10 text-blue-400 border border-blue-500/20' };
    if (score >= 14) return { label: 'Bom 📚', style: 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' };
    if (score >= 10) return { label: 'Suficiente 👍', style: 'bg-amber-500/10 text-amber-400 border border-amber-500/20' };
    return { label: 'Insuficiente ❌', style: 'bg-red-500/10 text-red-500 border border-red-500/20' };
  };

  const badgeInfo = getClassificationBadge(finalScoreScaled);
  const isApproved = finalScoreScaled >= 10;

  return (
    <div className="space-y-8 pb-20 max-w-4xl mx-auto animate-fade-in select-text">
      
      {!isHistoricalReview && (
        <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 rounded-xl text-xs sm:text-sm text-left flex items-center gap-2.5 shadow-xs animate-fade-in">
          <span className="text-emerald-400 font-bold text-xl leading-none">✓</span>
          <span>Estudo concluído! Este teste de <strong>{discipline}</strong> foi guardado automaticamente no teu <strong>Histórico</strong> e associado ao <strong>{numeroTeste}</strong> no teu Perfil de Avaliação para cálculo imediato da média!</span>
        </div>
      )}
      
      {/* 1. SCORE SUMMARY PANEL HEADER */}
      <div className="bg-[#12121a] border border-[#2a2a3f] p-6 rounded-2xl shadow-[0_4px_24px_rgba(108,99,255,0.08)] flex flex-col md:flex-row items-center justify-between gap-6 transition-colors">
        <div className="space-y-3 text-center md:text-left">
          <div className="flex items-center gap-2 justify-center md:justify-start">
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
              <path d="M16 6 C16 6, 8 4, 4 6 L4 26 C8 24, 16 26, 16 26" stroke="#6c63ff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 6 C16 6, 24 4, 28 6 L28 26 C24 24, 16 26, 16 26" stroke="#6c63ff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="16" y1="6" x2="16" y2="26" stroke="#6c63ff" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <span className="px-2.5 py-0.5 bg-indigo-600/15 text-indigo-400 text-[10px] font-bold uppercase rounded border border-indigo-500/20">
              {discipline}
            </span>
            <span className={`px-2.5 py-0.5 text-[10px] font-bold rounded ${badgeInfo.style}`}>
              {badgeInfo.label}
            </span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
            Correção: {testName}
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md leading-relaxed">
            As tuas respostas teóricas e práticas foram inspecionadas pelo motor IA de forma semântica segundo critérios universitários.
          </p>
        </div>

        {/* Big circular or badge Grade scale */}
        <div className="flex-shrink-0 flex flex-col items-center justify-center p-6 bg-slate-900/40 rounded-2xl border sb-border text-center min-w-[170px]">
          <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Nota Final</span>
          <p className={`text-4xl sm:text-5xl font-bold font-display my-2 ${isApproved ? 'text-green-400' : 'text-red-500'}`}>
            {finalScoreScaled.toFixed(1)}
          </p>
          <span className="text-xs text-slate-500 font-medium">escala 0-20 valores</span>
        </div>
      </div>

      {/* 2. STAT BREAKDOWNS CHIPS */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl border sb-border sb-bg-panel/60 text-center font-medium">
          <p className="text-slate-500 text-[11px] uppercase font-semibold">Escolha Múltipla (Parte I)</p>
          <p className="text-lg font-bold font-display text-white mt-1">
            {partIAnswersCorrect} <span className="text-xs text-slate-500">/ {partITotal} certas</span>
          </p>
          <p className="text-[10px] text-indigo-400/80 mt-1">Soma ponderada: {partIWeightScore.toFixed(1)} / 7.0 val</p>
        </div>

        <div className="p-4 rounded-xl border sb-border sb-bg-panel/60 text-center font-medium">
          <p className="text-slate-500 text-[11px] uppercase font-semibold">Desenvolvimento (Parte II)</p>
          <p className="text-lg font-bold font-display text-white mt-1">
            {partIIGradeSum} <span className="text-xs text-slate-500">/ {partIITotalMax} pts</span>
          </p>
          <p className="text-[10px] text-indigo-400/80 mt-1">Soma ponderada: {partIIWeightScore.toFixed(1)} / 7.0 val</p>
        </div>

        <div className="p-4 rounded-xl border sb-border sb-bg-panel/60 text-center font-medium">
          <p className="text-slate-500 text-[11px] uppercase font-semibold">Programação (Parte III)</p>
          <p className="text-lg font-bold font-display text-white mt-1">
            {partIIIGradeSum} <span className="text-xs text-slate-500">/ {partIIITotalMax} pts</span>
          </p>
          <p className="text-[10px] text-indigo-400/80 mt-1">Soma ponderada: {partIIIWeightScore.toFixed(1)} / 6.0 val</p>
        </div>
      </div>

      {/* CORE CONTROL ROW */}
      <div className="flex items-center gap-4 justify-end flex-wrap">
        <button
          onClick={onRestart}
          className="px-5 py-2.5 bg-[#6c63ff] hover:bg-[#7c74ff] text-white font-bold text-xs sm:text-sm rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-2"
        >
          📈 Ver Meu Histórico Académico
        </button>
      </div>

      {/* 3. REVISÃO DETALHADA */}
      <div className="space-y-6">
        <h3 className="text-lg font-bold font-display text-white border-b sb-border pb-2 flex items-center gap-2 select-none">
          <span>🔍</span> Revisão Detalhada das Questões
        </h3>

        {/* MCQ CORRECTIVES */}
        {questions.partI.length > 0 && (
          <div className="space-y-5">
            <h4 className="text-xs uppercase tracking-wider font-extrabold text-slate-400 select-none">Parte I — Escolha Múltipla</h4>
            {questions.partI.map((q, idx) => {
              const studentChoice = answers.partI[q.id];
              const isCorrect = studentChoice === q.correctAnswer;
              return (
                <div key={q.id} className="sb-bg-panel border sb-border rounded-2xl p-5 sm:p-6 space-y-4">
                  {/* Card heading */}
                  <div className="flex items-center justify-between border-b border-slate-800/85 pb-2">
                    <span className="text-xs font-semibold text-slate-400">Questão {idx + 1}</span>
                    <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      isCorrect 
                        ? 'bg-green-500/10 text-green-400 border border-green-500/20' 
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {isCorrect ? '✅ Correto' : '❌ Errado'}
                    </span>
                  </div>

                  {/* Question body */}
                  <p className="font-bold text-white text-sm sm:text-base leading-relaxed">{q.question}</p>

                  {/* Options output */}
                  <div className="space-y-2">
                    {(Object.keys(q.options) as Array<'A' | 'B' | 'C' | 'D'>).map((opt) => {
                      const text = q.options[opt];
                      const isStudentSelected = studentChoice === opt;
                      const isCorrectOpt = q.correctAnswer === opt;
                      
                      let optStyle = 'sb-bg-inner border-slate-800/80 text-slate-300';
                      if (isStudentSelected && isCorrect) {
                        optStyle = 'bg-green-500/15 border-green-500/40 text-green-400 font-medium';
                      } else if (isStudentSelected && !isCorrect) {
                        optStyle = 'bg-red-500/15 border-red-500/40 text-red-400 font-medium';
                      } else if (isCorrectOpt) {
                        optStyle = 'bg-green-500/10 border-green-500/30 text-green-400/90';
                      }

                      return (
                        <div key={opt} className={`px-4 py-3 rounded-xl border text-xs sm:text-sm flex items-start gap-3.5 ${optStyle}`}>
                          <span className={`w-5 h-5 rounded font-mono font-bold text-[10px] flex items-center justify-center ${
                            isStudentSelected
                              ? isCorrect ? 'bg-green-500 text-black' : 'bg-red-500 text-white'
                              : isCorrectOpt ? 'bg-green-500/30 text-green-400' : 'bg-slate-800 text-slate-400'
                          }`}>
                            {opt}
                          </span>
                          <span className="leading-relaxed">{text}</span>
                        </div>
                      );
                    })}
                  </div>

                  {/* Explain box */}
                  <div className="p-4 bg-indigo-650/5 border border-indigo-505 border-indigo-500/10 rounded-xl space-y-1 mt-2">
                    <h5 className="text-[11px] font-extrabold text-indigo-400 uppercase tracking-widest">💡 Explicação da IA</h5>
                    <p className="text-xs text-slate-350 text-slate-300 leading-relaxed pr-1">{q.explanation}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ESSAY CORRECTIVES */}
        {questions.partII.length > 0 && (
          <div className="space-y-5">
            <h4 className="text-xs uppercase tracking-wider font-extrabold text-slate-400 select-none mt-4">Parte II — Desenvolvimento</h4>
            {questions.partII.map((q, idx) => {
              const feedback = grades.developmentGrades.find(g => g.questionId === q.id);
              const score = feedback?.score ?? 0;
              const studentText = answers.partII[q.id] || '(Sem resposta do aluno)';
              
              return (
                <div key={q.id} className="sb-bg-panel border sb-border rounded-2xl p-5 sm:p-6 space-y-4">
                  
                  {/* Card heading */}
                  <div className="flex items-center justify-between border-b border-slate-800/85 pb-2">
                    <span className="text-xs font-semibold text-slate-400">Questão {idx + 1}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-mono font-bold text-indigo-400">Score: {score} / 5</span>
                      <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                        <div className="h-full bg-indigo-550 bg-indigo-500" style={{ width: `${(score/5)*100}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Question description */}
                  <p className="font-bold text-white text-sm sm:text-base leading-relaxed">{q.question}</p>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* User's response */}
                    <div className="space-y-1.5">
                      <h5 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">A tua resposta:</h5>
                      <div className="p-4 rounded-xl border sb-border bg-slate-900/30 text-xs sm:text-sm text-slate-300 leading-relaxed min-h-[140px] whitespace-pre-wrap select-text">
                        {studentText}
                      </div>
                    </div>

                    {/* AI Model standard response */}
                    <div className="space-y-1.5">
                      <h5 className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Resposta Modelo da IA:</h5>
                      <div className="p-4 rounded-xl border border-indigo-500/10 bg-indigo-950/5 text-xs sm:text-sm text-indigo-300/90 leading-relaxed min-h-[140px] whitespace-pre-wrap select-text">
                        {q.modelAnswer}
                      </div>
                    </div>
                  </div>

                  {/* Key points badge matches */}
                  {q.keyPoints && q.keyPoints.length > 0 && (
                    <div className="space-y-1.5 pt-1">
                      <h5 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Lista de Tópicos Chave de Exame:</h5>
                      <div className="flex flex-wrap gap-1.5">
                        {q.keyPoints.map((kp, i) => (
                          <span key={i} className="px-2 py-1 bg-slate-850 bg-slate-800/80 hover:bg-slate-755 border sb-border rounded text-[10px] font-medium text-slate-400">
                            ✓ {kp}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Strengths & Improvements feedback breakdown */}
                  {feedback && (
                    <div className="space-y-3 pt-3 border-t border-slate-800/80">
                      <div className="p-4 bg-teal-500/5 border border-teal-550 border-teal-500/10 rounded-xl space-y-1.5">
                        <h5 className="text-[11px] font-extrabold text-teal-400 uppercase tracking-widest">📊 Feedback Global da IA</h5>
                        <p className="text-xs text-slate-300 leading-relaxed">{feedback.feedback}</p>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="p-4 bg-green-500/5 border border-green-550 border-green-500/10 rounded-xl">
                          <h6 className="text-[11px] font-bold text-green-400 uppercase tracking-widest mb-1.5">💪 Pontos Fortes</h6>
                          {feedback.strengths && feedback.strengths.length > 0 ? (
                            <ul className="list-disc pl-4 space-y-1 text-xs text-slate-300">
                              {feedback.strengths.map((st, i) => <li key={i}>{st}</li>)}
                            </ul>
                          ) : (
                            <p className="text-xs text-slate-500 italic">Nenhum aspeto positivo proeminente assinalado.</p>
                          )}
                        </div>

                        <div className="p-4 bg-amber-500/5 border border-amber-550 border-amber-500/10 rounded-xl">
                          <h6 className="text-[11px] font-bold text-amber-400 uppercase tracking-widest mb-1.5">📈 Aspetos a Melhorar</h6>
                          {feedback.improvements && feedback.improvements.length > 0 ? (
                            <ul className="list-disc pl-4 space-y-1 text-xs text-slate-350 text-slate-300 font-medium">
                              {feedback.improvements.map((imp, i) => <li key={i}>{imp}</li>)}
                            </ul>
                          ) : (
                            <p className="text-xs text-slate-500 italic">Nenhum ponto de melhoria crucial registado.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                  
                </div>
              );
            })}
          </div>
        )}

        {/* CODE CORRECTIVES */}
        {questions.partIII.length > 0 && (
          <div className="space-y-5">
            <h4 className="text-xs uppercase tracking-wider font-extrabold text-slate-400 select-none mt-4">Parte III — Código</h4>
            {questions.partIII.map((q, idx) => {
              const feedback = grades.codeGrades.find(g => g.questionId === q.id);
              const score = feedback?.score ?? 0;
              const studentCode = answers.partIII[q.id] || '// Sem código submetido\n';
              
              return (
                <div key={q.id} className="sb-bg-panel border sb-border rounded-2xl p-5 sm:p-6 space-y-4">
                  
                  {/* Card heading */}
                  <div className="flex items-center justify-between border-b border-slate-800/85 pb-2">
                    <span className="text-xs font-semibold text-slate-400">Questão {idx + 1}</span>
                    <div className="flex items-center gap-3">
                      <span className="px-2 py-0.5 bg-indigo-600/15 text-indigo-400 border border-indigo-500/20 text-[10px] font-extrabold rounded select-none">
                        {q.language}
                      </span>
                      <span className="text-xs font-mono font-bold text-indigo-400">Score: {score} / 5</span>
                      <div className="w-16 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/50">
                        <div className="h-full bg-indigo-550 bg-indigo-500" style={{ width: `${(score/5)*100}%` }} />
                      </div>
                    </div>
                  </div>

                  {/* Question description */}
                  <p className="font-bold text-white text-sm sm:text-base leading-relaxed select-text">{q.question}</p>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {/* User's code block */}
                    <div className="space-y-1.5">
                      <h5 className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">O teu código:</h5>
                      <div className="p-4 rounded-xl border border-[#30363d] bg-[#0d1117] text-xs font-mono text-[#e6edf3] leading-relaxed min-h-[140px] whitespace-pre select-x-auto select-text overflow-x-auto">
                        {studentCode}
                      </div>
                    </div>

                    {/* IA Model standard code block */}
                    <div className="space-y-1.5">
                      <h5 className="text-[10px] uppercase font-bold text-indigo-400 tracking-wider">Resposta de Referência da IA:</h5>
                      <div className="p-4 rounded-xl border border-indigo-500/20 bg-slate-950 text-xs font-mono text-indigo-300 leading-relaxed min-h-[140px] whitespace-pre select-x-auto select-text overflow-x-auto">
                        {q.modelAnswer}
                      </div>
                    </div>
                  </div>

                  {/* Code feedback breakdown */}
                  {feedback && (
                    <div className="pt-3 space-y-3.5 border-t border-slate-800/80">
                      <div className="p-4 bg-teal-500/5 border border-teal-550 border-teal-500/10 rounded-xl space-y-1.5">
                        <h5 className="text-[11px] font-extrabold text-[#319795] text-teal-400 uppercase tracking-widest">💻 Avaliação de Lógica & Compilação</h5>
                        <p className="text-xs text-slate-350 text-slate-300 leading-relaxed pr-1 select-text">{feedback.feedback}</p>
                      </div>

                      <div className="p-4 p-5 bg-indigo-650/5 border border-indigo-505 border-indigo-500/10 rounded-xl space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="text-sm">💡</span>
                          <h6 className="text-[11px] font-bold text-indigo-400 uppercase tracking-wider">Explicação Concetual dos Conceitos Envolvidos</h6>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed pr-1 select-text">{q.explanation}</p>
                      </div>

                      {feedback.issues && feedback.issues.length > 0 && (
                        <div className="p-4 bg-red-500/5 border border-red-500/10 rounded-xl space-y-1.5">
                          <h6 className="text-[11px] font-bold text-red-400 uppercase tracking-wider">⚠️ Problemas / Bugs Identificados</h6>
                          <ul className="list-disc pl-4 space-y-1 text-xs text-slate-300">
                            {feedback.issues.map((issue, i) => <li key={i}>{issue}</li>)}
                          </ul>
                        </div>
                      )}
                    </div>
                  )}

                </div>
              );
            })}
          </div>
        )}

      </div>

      {/* RESTART CONTROLS BOTTOM */}
      <div className="flex justify-end pt-4 border-t sb-border">
        <button
          onClick={onRestart}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm sm:text-base rounded-xl transition-all cursor-pointer shadow-indigo"
        >
          🔄 Voltar para um Novo Teste
        </button>
      </div>

    </div>
  );
}
