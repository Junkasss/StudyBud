/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { TestQuestions, TestAnswers, ChoiceQuestion, EssayQuestion, CodeQuestion } from '../types';

interface TesteRealizacaoProps {
  name: string;
  discipline: string;
  questions: TestQuestions;
  onFinish: (answers: TestAnswers) => void;
  onCancel: () => void;
}

export function TesteRealizacao({ name, discipline, questions, onFinish, onCancel }: TesteRealizacaoProps) {
  // Compute initial duration based on parameters
  const numI = questions.partI.length;
  const numII = questions.partII.length;
  const numIII = questions.partIII.length;
  const totalDurationMinutes = Math.round(numI * 1.5 + numII * 5 + numIII * 8);
  
  const [secondsLeft, setSecondsLeft] = useState(totalDurationMinutes * 60);

  // Answers State
  const [answers, setAnswers] = useState<TestAnswers>(() => {
    // Attempt to load from sessionStorage as per requirement 5
    const stored = sessionStorage.getItem('studybud_active_test_answers');
    if (stored) {
      try {
        return JSON.parse(stored) as TestAnswers;
      } catch {
        // Fallback below
      }
    }
    
    // Default initial empty responses
    const initialAnswers: TestAnswers = {
      partI: {},
      partII: {},
      partIII: {},
    };
    // Initialize Part III with starter codes if supplied
    questions.partIII.forEach((q) => {
      initialAnswers.partIII[q.id] = q.starterCode || `// Escreve o teu código em ${q.language} aqui\n`;
    });
    return initialAnswers;
  });

  // Active question pointers per section
  const [activePart, setActivePart] = useState<'I' | 'II' | 'III'>('I');
  const [activeIIdx, setActiveIIdx] = useState(0);
  const [activeIIIdx, setActiveIIIdx] = useState(0);
  const [activeIIIIdx, setActiveIIIIdx] = useState(0);

  // Ref to handle timer
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Time Countdown countdown
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          alert('O tempo terminou! O teste será submetido automaticamente para correção.');
          handleFinalize(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // 2. Autosave to sessionStorage every 10 seconds as per requirement 5
  useEffect(() => {
    const autosaveTimer = setInterval(() => {
      sessionStorage.setItem('studybud_active_test_answers', JSON.stringify(answers));
      console.log('StudyBud Autosave: Test answers persisted safely in sessionStorage.');
    }, 10000);

    return () => clearInterval(autosaveTimer);
  }, [answers]);

  // Handle prompt on leaving the active test as per requirement 6
  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = 'Tens a certeza? O progresso não guardado será perdido.';
      return e.returnValue;
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Helper to format remaining timer
  const formatTimer = () => {
    const mins = Math.floor(secondsLeft / 60);
    const secs = secondsLeft % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  // Determine timer threat class
  const getTimerClass = () => {
    if (secondsLeft <= 60) {
      return 'text-red-500 font-bold animate-pulse font-mono bg-red-500/10 border-red-500/20';
    } else if (secondsLeft <= 300) {
      return 'text-amber-500 font-bold font-mono bg-amber-500/10 border-amber-500/20';
    }
    return 'text-slate-350 text-slate-300 font-mono bg-slate-900 border-slate-800';
  };

  // Calculate percentage ratios
  const totalQuestions = numI + numII + numIII;
  const answeredCount = 
    Object.keys(answers.partI).length + 
    Object.keys(answers.partII).filter(k => answers.partII[k]?.trim()).length + 
    Object.keys(answers.partIII).filter(k => answers.partIII[k]?.trim()).length;
  
  const completionPercentage = totalQuestions > 0 ? (answeredCount / totalQuestions) * 100 : 0;

  const handleSelectOption = (qid: string, opt: 'A' | 'B' | 'C' | 'D') => {
    setAnswers((prev) => ({
      ...prev,
      partI: {
        ...prev.partI,
        [qid]: opt,
      },
    }));
  };

  const handleEssayChange = (qid: string, val: string) => {
    setAnswers((prev) => ({
      ...prev,
      partII: {
        ...prev.partII,
        [qid]: val,
      },
    }));
  };

  const handleCodeChange = (qid: string, val: string) => {
    setAnswers((prev) => ({
      ...prev,
      partIII: {
        ...prev.partIII,
        [qid]: val,
      },
    }));
  };

  // Prevent Tab focus switching in simulated code textareas
  const handleCodeTabPress = (e: React.KeyboardEvent<HTMLTextAreaElement>, qid: string) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const target = e.currentTarget;
      const start = target.selectionStart;
      const end = target.selectionEnd;
      const val = target.value;
      const updatedValue = val.substring(0, start) + '    ' + val.substring(end);
      handleCodeChange(qid, updatedValue);

      // Restore selections
      setTimeout(() => {
        target.selectionStart = target.selectionEnd = start + 4;
      }, 0);
    }
  };

  // Word counter helper
  const countWords = (text: string): number => {
    if (!text) return 0;
    const clean = text.trim();
    if (!clean) return 0;
    return clean.split(/\s+/).length;
  };

  const handleFinalize = (isAuto = false) => {
    if (!isAuto) {
      const confirmFinalization = confirm('Tens a certeza que pretendes finalizar o teste para correção? Não poderás alterar as tuas repostas.');
      if (!confirmFinalization) return;
    }
    // Clean up stored sessionStorage
    sessionStorage.removeItem('studybud_active_test_answers');
    onFinish(answers);
  };

  const handleExitWithConfirmation = () => {
    const confirmExit = confirm('Tens a certeza que queres desistir do teste? Todo o progresso recente será perdido.');
    if (confirmExit) {
      sessionStorage.removeItem('studybud_active_test_answers');
      onCancel();
    }
  };

  // Questions arrays
  const activeQuestionI: ChoiceQuestion | undefined = questions.partI[activeIIdx];
  const activeQuestionII: EssayQuestion | undefined = questions.partII[activeIIIdx];
  const activeQuestionIII: CodeQuestion | undefined = questions.partIII[activeIIIIdx];

  // Render the mini maps for each question dynamically
  const renderMiniMap = () => {
    return (
      <div className="flex flex-wrap items-center gap-1.5 p-3 sb-bg-inner border sb-border rounded-xl">
        <span className="text-[10px] uppercase font-bold text-slate-500 mr-2 select-none">Progresso:</span>
        
        {/* MCQ segment */}
        {questions.partI.map((q, idx) => {
          const isSelected = answers.partI[q.id] !== undefined;
          const isActive = activePart === 'I' && activeIIdx === idx;
          return (
            <button
              key={q.id}
              onClick={() => { setActivePart('I'); setActiveIIdx(idx); }}
              className={`w-5 h-5 rounded flex items-center justify-center font-mono text-[10px] font-bold transition-all ${
                isActive 
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900 shadow-md' 
                  : isSelected 
                    ? 'bg-green-600/20 text-green-400 border border-green-500/30' 
                    : 'bg-slate-800 text-slate-500 border border-slate-700/60 hover:border-slate-650'
              }`}
              title={`Escolha Múltipla Q${idx+1}`}
            >
              C{idx+1}
            </button>
          );
        })}

        {/* Essay segment */}
        {questions.partII.map((q, idx) => {
          const text = answers.partII[q.id] || '';
          const isSelected = text.trim().length > 0;
          const isActive = activePart === 'II' && activeIIIdx === idx;
          return (
            <button
              key={q.id}
              onClick={() => { setActivePart('II'); setActiveIIIdx(idx); }}
              className={`w-5 h-5 rounded flex items-center justify-center font-mono text-[10px] font-bold transition-all ${
                isActive 
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900 shadow-md' 
                  : isSelected 
                    ? 'bg-green-600/20 text-green-400 border border-green-500/30' 
                    : 'bg-slate-800 text-slate-500 border border-slate-700/60 hover:border-slate-650'
              }`}
              title={`Desenvolvimento Q${idx+1}`}
            >
              D{idx+1}
            </button>
          );
        })}

        {/* Code segment */}
        {questions.partIII.map((q, idx) => {
          const text = answers.partIII[q.id] || '';
          // Avoid just starter code count filter
          const isSelected = text.trim().length > 0 && !text.includes('// Escreve o teu código');
          const isActive = activePart === 'III' && activeIIIIdx === idx;
          return (
            <button
              key={q.id}
              onClick={() => { setActivePart('III'); setActiveIIIIdx(idx); }}
              className={`w-5 h-5 rounded flex items-center justify-center font-mono text-[10px] font-bold transition-all ${
                isActive 
                  ? 'bg-indigo-600 text-white ring-2 ring-indigo-400 ring-offset-2 ring-offset-slate-900 shadow-md' 
                  : isSelected 
                    ? 'bg-green-600/20 text-green-400 border border-green-500/30' 
                    : 'bg-slate-800 text-slate-500 border border-slate-700/60 hover:border-slate-650'
              }`}
              title={`Código Q${idx+1}`}
            >
              P{idx+1}
            </button>
          );
        })}
      </div>
    );
  };

  return (
    <div className="space-y-6 pb-20 max-w-4xl mx-auto animate-fade-in relative select-none">
      
      {/* FIXED METADATA HEADER ROW */}
      <div className="sticky top-0 z-30 sb-bg-panel border sb-border p-4 rounded-2xl sb-shadow flex flex-col md:flex-row md:items-center justify-between gap-4 transition-colors">
        <div className="space-y-1">
          <span className="px-2.5 py-0.5 bg-indigo-600/10 text-indigo-400 text-[10px] font-bold uppercase rounded border border-indigo-550 border-indigo-500/20">
            {discipline}
          </span>
          <h2 className="text-base sm:text-lg font-bold font-display text-white truncate max-w-sm sm:max-w-md">
            {name}
          </h2>
        </div>

        {/* STATS CONTROLS */}
        <div className="flex items-center gap-3.5 flex-wrap">
          
          {/* Progress feedback bar */}
          <div className="text-right space-y-1">
            <div className="text-xs text-slate-400 font-medium">
              Respondidas: <strong className="text-white font-mono">{answeredCount}</strong> de <strong className="text-white font-mono">{totalQuestions}</strong>
            </div>
            <div className="w-28 sm:w-36 h-2 bg-slate-800 rounded-full overflow-hidden border border-slate-700/40">
              <div 
                className="h-full bg-gradient-to-r from-indigo-500 to-indigo-400 transition-all duration-300" 
                style={{ width: `${completionPercentage}%` }}
              />
            </div>
          </div>

          {/* Countdown timer */}
          <div className={`px-4 py-2.5 border rounded-xl flex items-center gap-2 ${getTimerClass()}`}>
            <span className="text-base sm:text-lg">⏱️</span>
            <span className="font-bold font-mono tracking-wider text-sm sm:text-base">{formatTimer()}</span>
          </div>

          {/* Cancel button */}
          <button
            onClick={handleExitWithConfirmation}
            className="w-10 h-10 rounded-xl bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 text-red-400 hover:text-red-300 flex items-center justify-center text-sm transition-colors cursor-pointer"
            title="Sair do teste"
          >
            ✕
          </button>
        </div>
      </div>

      {/* QUESTION MAP ROW */}
      {renderMiniMap()}

      {/* SECTION NAV TABS */}
      <div className="flex border-b sb-border">
        {numI > 0 && (
          <button
            onClick={() => setActivePart('I')}
            className={`px-5 py-3 text-xs sm:text-sm font-bold font-display border-b-2 transition-all cursor-pointer ${
              activePart === 'I'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-450 text-slate-400 hover:text-slate-200'
            }`}
          >
            Parte I — Escolha Múltipla 🅐
          </button>
        )}
        {numII > 0 && (
          <button
            onClick={() => setActivePart('II')}
            className={`px-5 py-3 text-xs sm:text-sm font-bold font-display border-b-2 transition-all cursor-pointer ${
              activePart === 'II'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-450 text-slate-400 hover:text-slate-200'
            }`}
          >
            Parte II — Desenvolvimento ✍️
          </button>
        )}
        {numIII > 0 && (
          <button
            onClick={() => setActivePart('III')}
            className={`px-5 py-3 text-xs sm:text-sm font-bold font-display border-b-2 transition-all cursor-pointer ${
              activePart === 'III'
                ? 'border-indigo-500 text-indigo-400'
                : 'border-transparent text-slate-450 text-slate-400 hover:text-slate-200'
            }`}
          >
            Parte III — Código 💻
          </button>
        )}
      </div>

      {/* ACTIVE PANEL INNER WRAPPER */}
      <div className="sb-bg-panel border sb-border p-6 rounded-2xl sb-shadow space-y-6">

        {/* 1. SECTION MCQ PANEL */}
        {activePart === 'I' && activeQuestionI && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b sb-border pb-3">
              <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
                Questão {activeIIdx + 1} de {numI}
              </span>
              <span className="px-2 py-0.5 bg-slate-800 text-[10px] text-slate-400 font-mono font-bold rounded">
                Dificuldade Variada — Escolha Múltipla
              </span>
            </div>

            {/* Enunciado */}
            <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed select-text">
              {activeQuestionI.question}
            </h3>

            {/* Options grid */}
            <div className="grid grid-cols-1 gap-3.5 pt-2">
              {(Object.keys(activeQuestionI.options) as Array<'A' | 'B' | 'C' | 'D'>).map((opt) => {
                const text = activeQuestionI.options[opt];
                const isSelected = answers.partI[activeQuestionI.id] === opt;
                return (
                  <button
                    key={opt}
                    onClick={() => handleSelectOption(activeQuestionI.id, opt)}
                    className={`w-full text-left px-5 py-4 rounded-xl text-sm transition-all flex items-start gap-4 border cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/15 border-indigo-500 text-indigo-300 font-bold shadow-md'
                        : 'sb-bg-inner border-slate-800/80 hover:border-slate-700/60 text-slate-300 hover:text-white'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-lg font-mono font-bold flex items-center justify-center text-xs flex-shrink-0 ${
                      isSelected ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {opt}
                    </span>
                    <span className="leading-relaxed select-text">{text}</span>
                  </button>
                );
              })}
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-4 border-t sb-border">
              <button
                onClick={() => setActiveIIdx((prev) => Math.max(0, prev - 1))}
                disabled={activeIIdx === 0}
                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  activeIIdx === 0
                    ? 'border-slate-800/60 text-slate-650 text-slate-600 cursor-not-allowed'
                    : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                ← Anterior
              </button>
              <button
                onClick={() => setActiveIIdx((prev) => Math.min(numI - 1, prev + 1))}
                disabled={activeIIdx === numI - 1}
                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  activeIIdx === numI - 1
                    ? 'border-slate-800/60 text-slate-650 text-slate-600 cursor-not-allowed'
                    : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                Próxima →
              </button>
            </div>
          </div>
        )}

        {/* 2. SECTION ESSAY PANEL */}
        {activePart === 'II' && activeQuestionII && (
          <div className="space-y-6">
            <div className="flex items-center justify-between border-b sb-border pb-3">
              <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
                Questão {activeIIIdx + 1} de {numII}
              </span>
              <span className="px-2 py-0.5 bg-slate-800 text-[10px] text-slate-400 font-mono font-bold rounded">
                Dificuldade Académica — 5 Pontos Máx.
              </span>
            </div>

            {/* Enunciado */}
            <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed select-text">
              {activeQuestionII.question}
            </h3>

            {/* Textarea for answer input */}
            <div className="space-y-2">
              <textarea
                placeholder="Escreve a tua resposta fundamentada teoricamente aqui... Devem ser valorizados termos técnicos explícitos e formulação académica."
                value={answers.partII[activeQuestionII.id] || ''}
                onChange={(e) => handleEssayChange(activeQuestionII.id, e.target.value)}
                rows={10}
                className="w-full px-5 py-4 rounded-xl sb-bg-inner border sb-border text-white text-base focus:outline-none focus:border-indigo-500 placeholder-slate-600 leading-relaxed resize-none select-text"
                style={{ minHeight: '220px' }}
              />
              <div className="flex justify-between items-center text-xs text-slate-500 font-medium px-1 select-none">
                <span>Dica: Tenta cobrir os tópicos da pergunta de forma clara.</span>
                <span className="font-mono bg-slate-800/60 px-2 py-0.5 rounded border sb-border text-indigo-400">
                  {countWords(answers.partII[activeQuestionII.id] || '')} palavras
                </span>
              </div>
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-4 border-t sb-border">
              <button
                onClick={() => setActiveIIIdx((prev) => Math.max(0, prev - 1))}
                disabled={activeIIIdx === 0}
                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  activeIIIdx === 0
                    ? 'border-slate-800/60 text-slate-650 text-slate-600 cursor-not-allowed'
                    : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                ← Anterior
              </button>
              <button
                onClick={() => setActiveIIIdx((prev) => Math.min(numII - 1, prev + 1))}
                disabled={activeIIIdx === numII - 1}
                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  activeIIIdx === numII - 1
                    ? 'border-slate-800/60 text-slate-650 text-slate-600 cursor-not-allowed'
                    : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                Próxima →
              </button>
            </div>
          </div>
        )}

        {/* 3. SECTION CODE PANEL */}
        {activePart === 'III' && activeQuestionIII && (
          <div className="space-y-6 animate-fade-in">
            <div className="flex items-center justify-between border-b sb-border pb-3">
              <span className="text-xs uppercase font-extrabold tracking-wider text-slate-400">
                Questão {activeIIIIdx + 1} de {numIII}
              </span>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 text-[10px] font-bold uppercase rounded">
                  {activeQuestionIII.language}
                </span>
                <span className="px-2 py-0.5 bg-slate-800 text-[10px] text-slate-400 font-mono font-bold rounded">
                  Exercício Prático — 5 Pontos
                </span>
              </div>
            </div>

            {/* Enunciado */}
            <h3 className="text-base sm:text-lg font-bold text-white leading-relaxed select-text">
              {activeQuestionIII.question}
            </h3>

            {/* Monaco-style code editor structure */}
            <div className="rounded-lg overflow-hidden border border-slate-800 bg-[#0d1117] font-mono text-sm shadow-inner relative flex">
              
              {/* Line numbers simulated gutter */}
              <div className="bg-[#090d13] px-3 py-4 text-right text-[#57606a] border-r border-[#30363d] select-none flex flex-col font-mono text-xs leading-6 min-w-[40px]">
                {Array.from({ length: Math.max(8, (answers.partIII[activeQuestionIII.id] || '').split('\n').length) }).map((_, i) => (
                  <span key={i} className="block">{i + 1}</span>
                ))}
              </div>

              {/* Code TextArea */}
              <textarea
                value={answers.partIII[activeQuestionIII.id] || ''}
                onChange={(e) => handleCodeChange(activeQuestionIII.id, e.target.value)}
                onKeyDown={(e) => handleCodeTabPress(e, activeQuestionIII.id)}
                className="flex-1 bg-transparent p-4 outline-none text-[#e6edf3] font-mono text-sm leading-6 resize-none w-full select-text min-h-[220px]"
                placeholder="// Escreve a lógica do teu snippet de código aqui..."
                spellCheck="false"
              />
            </div>

            <div className="text-[10px] text-indigo-405 text-indigo-400 mt-1 select-none">
              💡 <strong>DICA DO TERMINAL:</strong> Podes pressionar <kbd className="bg-slate-800 px-1 py-0.5 rounded border border-slate-700">Tab</kbd> para indentar com recuo de 4 espaços perfeitamente.
            </div>

            {/* Navigation buttons */}
            <div className="flex items-center justify-between pt-4 border-t sb-border">
              <button
                onClick={() => setActiveIIIIdx((prev) => Math.max(0, prev - 1))}
                disabled={activeIIIIdx === 0}
                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  activeIIIIdx === 0
                    ? 'border-slate-800/60 text-slate-650 text-slate-600 cursor-not-allowed'
                    : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                ← Anterior
              </button>
              <button
                onClick={() => setActiveIIIIdx((prev) => Math.min(numIII - 1, prev + 1))}
                disabled={activeIIIIdx === numIII - 1}
                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  activeIIIIdx === numIII - 1
                    ? 'border-slate-800/60 text-slate-650 text-slate-600 cursor-not-allowed'
                    : 'border-slate-700 text-slate-300 hover:bg-slate-800'
                }`}
              >
                Próxima →
              </button>
            </div>
          </div>
        )}

      </div>

      {/* FOOTER DIRECT FINILIZE ACTIONS */}
      <div className="flex items-center justify-between border-t border-slate-800/90 pt-6">
        <span className="text-xs text-slate-500 font-mono">Autosave ativo (sessionStorage)</span>
        <button
          onClick={() => handleFinalize()}
          className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm sm:text-base rounded-xl transition-all cursor-pointer shadow-indigo"
        >
          🏁 Finalizar e Corrigir Teste
        </button>
      </div>

    </div>
  );
}
