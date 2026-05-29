/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { TestQuestions, TestAnswers, ChoiceQuestion, EssayQuestion, CodeQuestion } from '../types';
import { gradeAnswers, model } from '../utils/gemini';
import { GoogleGenerativeAI } from '@google/generative-ai';

const GEMINI_API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY || "AIzaSyDlRly44lILQn2aRT1BQaO5fcwnjLZGxho";

interface TesteRealizacaoProps {
  name: string;
  discipline: string;
  questions: TestQuestions;
  onFinish: (answers: TestAnswers) => void;
  onCancel: () => void;
  setResultados: (res: any) => void;
  setCurrentView: (view: any) => void;
  numeroTeste?: string;
}

export function TesteRealizacao({ 
  name, 
  discipline, 
  questions, 
  onFinish, 
  onCancel,
  setResultados,
  setCurrentView,
  numeroTeste = 'Teste 1'
}: TesteRealizacaoProps) {
  // Compute initial duration based on parameters
  const numI = questions.partI.length;
  const numII = questions.partII.length;
  const numIII = questions.partIII.length;
  const totalDurationMinutes = Math.round(numI * 1.5 + numII * 5 + numIII * 8);
  
  // Load initial values from studybud_teste_em_curso if there's a saved session (CORREÇÃO 3)
  const savedSession = (() => {
    try {
      const stored = sessionStorage.getItem('studybud_teste_em_curso');
      return stored ? JSON.parse(stored) : null;
    } catch (e) {
      console.error('Erro ao ler studybud_teste_em_curso:', e);
      return null;
    }
  })();

  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (savedSession && typeof savedSession.tempoRestante === 'number') {
      return savedSession.tempoRestante;
    }
    return totalDurationMinutes * 60;
  });

  // Answers State
  const [answers, setAnswers] = useState<TestAnswers>(() => {
    if (savedSession && savedSession.userAnswers) {
      return savedSession.userAnswers;
    }
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
  const [activePart, setActivePart] = useState<'I' | 'II' | 'III'>(() => {
    if (savedSession && savedSession.currentPart) {
      return savedSession.currentPart;
    }
    return 'I';
  });
  const [activeIIdx, setActiveIIdx] = useState(() => {
    if (savedSession && savedSession.currentPart === 'I' && typeof savedSession.currentQuestionIndex === 'number') {
      return savedSession.currentQuestionIndex;
    }
    return 0;
  });
  const [activeIIIdx, setActiveIIIdx] = useState(() => {
    if (savedSession && savedSession.currentPart === 'II' && typeof savedSession.currentQuestionIndex === 'number') {
      return savedSession.currentQuestionIndex;
    }
    return 0;
  });
  const [activeIIIIdx, setActiveIIIIdx] = useState(() => {
    if (savedSession && savedSession.currentPart === 'III' && typeof savedSession.currentQuestionIndex === 'number') {
      return savedSession.currentQuestionIndex;
    }
    return 0;
  });

  // Ref to handle timer
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const [isGrading, setIsGrading] = useState(false);
  const [timerRunning, setTimerRunning] = useState(true);
  const [showConfirm, setShowConfirm] = useState(false);
  const [showExitConfirm, setShowExitConfirm] = useState(false);

  // We map local variables for the grade script to compile seamlessly:
  const userAnswers = answers;
  const disciplina = discipline;
  const nomeTeste = name;

  const handleFinalizarTeste = async (isAuto = false) => {
    console.log('=== handleFinalizarTeste INICIOU ===', { isAuto });
    
    // Verifica se já está a corrigir
    if (isGrading) {
      console.log('JÁ ESTÁ A CORRIGIR - saindo');
      return;
    }

    // Confirmação
    if (!isAuto) {
      let confirmou = true;
      try {
        confirmou = window.confirm(
          'Tens a certeza que queres finalizar o teste?'
        );
      } catch (e) {
        console.warn('window.confirm bloqueado ou falhou, assumindo true:', e);
      }
      console.log('Confirmação:', confirmou);
      if (!confirmou) return;
    }

    console.log('A definir isGrading = true');
    setIsGrading(true);
    setTimerRunning(false);

    try {
      console.log('PASSO 1: A corrigir Parte I...');
      
      // Corrige Parte I automaticamente
      const partIQuestions = questions?.partI || [];
      const partIResults = partIQuestions.map((q: any) => {
        const resposta = userAnswers?.partI?.[q.id] || '';
        const correta = resposta === q.correctAnswer;
        console.log(`Q${q.id}: resposta=${resposta}, correta=${q.correctAnswer}, certo=${correta}`);
        return {
          questionId: q.id,
          question: q.question,
          options: q.options,
          userAnswer: resposta,
          correctAnswer: q.correctAnswer,
          isCorrect: correta,
          explanation: q.explanation
        };
      });

      const partICorrect = partIResults.filter((r: any) => r.isCorrect).length;
      console.log(`Parte I: ${partICorrect}/${partIQuestions.length} corretas`);

      console.log('PASSO 2: A corrigir Parte II e III com IA...');

      // Prepara questões para a IA corrigir
      const partIIQuestions = questions?.partII || [];
      const partIIIQuestions = questions?.partIII || [];
      
      let aiGrades: any = { developmentGrades: [], codeGrades: [] };

      if (partIIQuestions.length > 0 || partIIIQuestions.length > 0) {
        const questoesParaCorrigir = [
          ...partIIQuestions.map((q: any) => ({
            id: q.id,
            type: 'development',
            question: q.question,
            modelAnswer: q.modelAnswer,
            keyPoints: q.keyPoints || [],
            userAnswer: userAnswers?.partII?.[q.id] || '(sem resposta)'
          })),
          ...partIIIQuestions.map((q: any) => ({
            id: q.id,
            type: 'code',
            question: q.question,
            language: q.language || 'Java',
            modelAnswer: q.modelAnswer,
            userAnswer: userAnswers?.partIII?.[q.id] || '(sem resposta)'
          }))
        ];

        console.log('Questões para IA:', questoesParaCorrigir.length);

        const promptCorrecao = `És um professor universitário. Corrige estas respostas de ${disciplina}.
Avaliação semântica: aceita respostas corretas com palavras diferentes.

${JSON.stringify(questoesParaCorrigir)}

Responde APENAS com JSON válido, sem markdown:
{
  "developmentGrades": [{"questionId":"q1","score":4,"maxScore":5,"feedback":"feedback","strengths":["ponto"],"improvements":["melhoria"]}],
  "codeGrades": [{"questionId":"q1","score":3,"maxScore":5,"feedback":"feedback","isLogicCorrect":true,"issues":[]}]
}`;

        console.log('A chamar API Gemini para correção...');
        
        const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
        const modelAI = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
        const result = await modelAI.generateContent(promptCorrecao);
        const responseText = result.response.text();
        
        console.log('Resposta da IA recebida:', responseText.substring(0, 200));
        
        const cleaned = responseText
          .replace(/```json\n?/g, '')
          .replace(/```\n?/g, '')
          .trim();
        
        aiGrades = JSON.parse(cleaned);
        console.log('aiGrades parsed:', aiGrades);
      }

      console.log('PASSO 3: A calcular nota final...');

      const partITotal = partIQuestions.length;
      const partIITotal = partIIQuestions.length;
      const partIIITotal = partIIIQuestions.length;
      const totalPartes = (partITotal > 0 ? 1 : 0) + (partIITotal > 0 ? 1 : 0) + (partIIITotal > 0 ? 1 : 0);

      let partIScore = 0;
      let partIIScore = 0;
      let partIIIScore = 0;

      if (totalPartes === 3) {
        if (partITotal > 0) partIScore = (partICorrect / partITotal) * 7;
        if (partIITotal > 0) {
          const soma = aiGrades.developmentGrades.reduce((s: number, g: any) => s + (g.score || 0), 0);
          partIIScore = (soma / (partIITotal * 5)) * 7;
        }
        if (partIIITotal > 0) {
          const soma = aiGrades.codeGrades.reduce((s: number, g: any) => s + (g.score || 0), 0);
          partIIIScore = (soma / (partIIITotal * 5)) * 6;
        }
      } else if (totalPartes === 2) {
        const peso = 10;
        if (partITotal > 0) partIScore = (partICorrect / partITotal) * peso;
        if (partIITotal > 0) {
          const soma = aiGrades.developmentGrades.reduce((s: number, g: any) => s + (g.score || 0), 0);
          partIIScore = (soma / (partIITotal * 5)) * peso;
        }
        if (partIIITotal > 0) {
          const soma = aiGrades.codeGrades.reduce((s: number, g: any) => s + (g.score || 0), 0);
          partIIIScore = (soma / (partIIITotal * 5)) * peso;
        }
      } else {
        if (partITotal > 0) partIScore = (partICorrect / partITotal) * 20;
        if (partIITotal > 0) {
          const soma = aiGrades.developmentGrades.reduce((s: number, g: any) => s + (g.score || 0), 0);
          partIIScore = (soma / (partIITotal * 5)) * 20;
        }
        if (partIIITotal > 0) {
          const soma = aiGrades.codeGrades.reduce((s: number, g: any) => s + (g.score || 0), 0);
          partIIIScore = (soma / (partIIITotal * 5)) * 20;
        }
      }

      const notaFinal = Math.min(20, Math.max(0, 
        Math.round((partIScore + partIIScore + partIIIScore) * 10) / 10
      ));

      console.log(`Nota final: ${notaFinal}/20`);

      const tempoTotal = totalDurationMinutes * 60;
      const tempoRestante = secondsLeft;

      const resultadosFinais = {
        score: notaFinal,
        partI: { results: partIResults, correct: partICorrect, total: partITotal, score: partIScore },
        partII: { grades: aiGrades.developmentGrades, questions: partIIQuestions, userAnswers: userAnswers?.partII || {}, total: partIITotal, score: partIIScore },
        partIII: { grades: aiGrades.codeGrades, questions: partIIIQuestions, userAnswers: userAnswers?.partIII || {}, total: partIIITotal, score: partIIIScore },
        disciplina,
        nomeTeste,
        numeroTeste: numeroTeste || 'Teste 1',
        date: new Date().toISOString(),
        tempoUsado: tempoTotal - tempoRestante,
        // compatibility fields so App.tsx's setResultados finds both:
        userAnswers,
        aiGrades
      };

      console.log('PASSO 4: A navegar para resultados...');
      
      sessionStorage.removeItem('studybud_teste_em_curso');
      sessionStorage.removeItem('studybud_active_test_answers');
      setResultados(resultadosFinais);
      setCurrentView('resultados');
      
      console.log('=== CONCLUÍDO COM SUCESSO ===');

    } catch (error: any) {
      console.error('=== ERRO NO handleFinalizarTeste ===', error);
      alert(`Erro ao corrigir o teste:\n${error.message}\n\nVê a consola do browser para mais detalhes.`);
      setTimerRunning(true);
    } finally {
      setIsGrading(false);
    }
  };

  // 1. Time Countdown countdown
  useEffect(() => {
    if (!timerRunning) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }
    timerRef.current = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timerRef.current!);
          alert('O tempo terminou! O teste será submetido automaticamente para correção.');
          handleFinalizarTeste(true);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [timerRunning]);

  // 2. Autosave with full state to studybud_teste_em_curso for resume capability (CORREÇÃO 3)
  useEffect(() => {
    const currentQuestionIndex = activePart === 'I' ? activeIIdx : activePart === 'II' ? activeIIIdx : activeIIIIdx;
    const autoSaveState = {
      questions,
      userAnswers: answers,
      disciplina: discipline,
      nomeTeste: name,
      numeroTeste: numeroTeste || 'Teste 1',
      tempoRestante: secondsLeft,
      currentPart: activePart,
      currentQuestionIndex,
      timestamp: Date.now()
    };
    sessionStorage.setItem('studybud_teste_em_curso', JSON.stringify(autoSaveState));
  }, [secondsLeft, answers, activePart, activeIIdx, activeIIIdx, activeIIIIdx, questions, discipline, name, numeroTeste]);

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

  const codeQuestionAltered = (qid: string): boolean => {
    const q = questions.partIII.find(item => item.id === qid);
    if (!q) return false;
    const currentCode = answers.partIII[qid] || '';
    const originalCode = q.starterCode || `// Escreve o teu código em ${q.language} aqui\n`;
    return currentCode.trim() !== originalCode.trim();
  };

  // Calculate percentage ratios
  const totalQuestions = numI + numII + numIII;
  const answeredCount = 
    Object.keys(answers.partI).length + 
    Object.keys(answers.partII).filter(k => answers.partII[k]?.trim()).length + 
    Object.keys(answers.partIII).filter(k => codeQuestionAltered(k)).length;
  
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



  const handleExitWithConfirmation = () => {
    setShowExitConfirm(true);
  };

  const handleNextFromI = () => {
    if (activeIIdx < numI - 1) {
      setActiveIIdx((prev) => prev + 1);
    } else {
      // Last question of Part I - automatic transition to Part II (if exists) or Part III
      if (numII > 0) {
        setActivePart('II');
        setActiveIIIdx(0);
      } else if (numIII > 0) {
        setActivePart('III');
        setActiveIIIIdx(0);
      }
    }
  };

  const handlePrevFromI = () => {
    if (activeIIdx > 0) {
      setActiveIIdx((prev) => Math.max(0, prev - 1));
    }
  };

  const handleNextFromII = () => {
    if (activeIIIdx < numII - 1) {
      setActiveIIIdx((prev) => prev + 1);
    } else {
      // Last question of Part II - automatic transition to Part III (if exists)
      if (numIII > 0) {
        setActivePart('III');
        setActiveIIIIdx(0);
      }
    }
  };

  const handlePrevFromII = () => {
    if (activeIIIdx > 0) {
      setActiveIIIdx((prev) => Math.max(0, prev - 1));
    } else {
      // First question of Part II - automatic back to last of Part I
      if (numI > 0) {
        setActivePart('I');
        setActiveIIdx(numI - 1);
      }
    }
  };

  const handleNextFromIII = () => {
    if (activeIIIIdx < numIII - 1) {
      setActiveIIIIdx((prev) => prev + 1);
    }
  };

  const handlePrevFromIII = () => {
    if (activeIIIIdx > 0) {
      setActiveIIIIdx((prev) => Math.max(0, prev - 1));
    } else {
      // First question of Part III - automatic back to last of Part II
      if (numII > 0) {
        setActivePart('II');
        setActiveIIIdx(numII - 1);
      } else if (numI > 0) {
        setActivePart('I');
        setActiveIIdx(numI - 1);
      }
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
          const isSelected = codeQuestionAltered(q.id);
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
    <div className="space-y-6 pb-32 max-w-4xl mx-auto animate-fade-in relative select-none">
      
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
                onClick={handlePrevFromI}
                disabled={activeIIdx === 0}
                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  activeIIdx === 0
                    ? 'border-slate-800/60 text-slate-600 cursor-not-allowed'
                    : 'border-slate-700 text-slate-200 hover:bg-slate-800'
                }`}
              >
                ← Anterior
              </button>
              <button
                onClick={handleNextFromI}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-700 text-slate-200 hover:bg-slate-805 hover:bg-slate-800 transition-colors cursor-pointer"
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
                onClick={handlePrevFromII}
                disabled={activeIIIdx === 0 && numI === 0}
                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  (activeIIIdx === 0 && numI === 0)
                    ? 'border-slate-800/60 text-slate-600 cursor-not-allowed'
                    : 'border-slate-700 text-slate-200 hover:bg-slate-800'
                }`}
              >
                ← Anterior
              </button>
              <button
                onClick={handleNextFromII}
                disabled={activeIIIdx === numII - 1 && numIII === 0}
                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  (activeIIIdx === numII - 1 && numIII === 0)
                    ? 'border-slate-800/60 text-slate-650 text-slate-600 cursor-not-allowed'
                    : 'border-slate-700 text-slate-200 hover:bg-slate-800'
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
                onClick={handlePrevFromIII}
                disabled={activeIIIIdx === 0 && numII === 0 && numI === 0}
                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-colors cursor-pointer ${
                  (activeIIIIdx === 0 && numII === 0 && numI === 0)
                    ? 'border-slate-800/60 text-slate-600 cursor-not-allowed'
                    : 'border-slate-700 text-slate-200 hover:bg-slate-800'
                }`}
              >
                ← Anterior
              </button>
              <button
                onClick={handleNextFromIII}
                disabled={activeIIIIdx === numIII - 1}
                className={`px-4 py-2 text-xs font-semibold rounded-lg border transition-all cursor-pointer ${
                  activeIIIIdx === numIII - 1
                    ? 'border-slate-800/60 text-slate-500 bg-slate-850/40 cursor-not-allowed'
                    : 'border-slate-700 text-slate-200 bg-indigo-600 hover:bg-indigo-500'
                }`}
              >
                Próxima →
              </button>
            </div>
          </div>
        )}

      </div>

      {/* FIXED STICKY FLOATING ACTION FOOTER (CORREÇÃO 1) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-[#0d0d12]/95 backdrop-blur-md border-t border-slate-800/70 py-4 px-6 shadow-[0_-8px_32px_rgba(0,0,0,0.5)]">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <span className="text-xs text-slate-400 font-mono flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse inline-block"></span>
            Autosave ativo (sessionStorage)
          </span>
          <button 
            onClick={() => {
              console.log('BOTÃO CLICADO - a abrir confirmação customizada');
              console.log('questions:', questions);
              console.log('userAnswers:', userAnswers);
              console.log('isGrading:', isGrading);
              console.log('disciplina:', disciplina);
              setShowConfirm(true);
            }}
            disabled={isGrading}
            className={`px-6 py-3 font-bold text-sm sm:text-base rounded-xl transition-all cursor-pointer shadow-indigo ${
              isGrading 
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-500 text-white'
            }`}
            style={{
              opacity: isGrading ? 0.5 : 1,
              cursor: isGrading ? 'not-allowed' : 'pointer',
              pointerEvents: 'all',
              zIndex: 9999,
              position: 'relative'
            }}
          >
            {isGrading ? '⏳ A corrigir...' : '✅ Finalizar e Corrigir Teste'}
          </button>
        </div>
      </div>

      {/* CONFIRMAÇÃO DIALOG DIRETA (EVITA WINDOW.CONFIRM BLOQUEADO NA IFRAME) */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#12121a] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative select-none">
            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
              <span className="text-indigo-400">📝</span> Finalizar e Corrigir Teste
            </h3>
            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              Tens a certeza que queres finalizar o teste? Não poderás alterar as tuas respostas depois de submeter.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowConfirm(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-700 bg-slate-850 text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  console.log('Confirmação aceita via modal customizada');
                  setShowConfirm(false);
                  handleFinalizarTeste(true);
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors cursor-pointer"
              >
                Sim, Finalizar e Corrigir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DIALOG DE CONFIRMAÇÃO PARA DESISTIR / SAIR DO TESTE */}
      {showExitConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4">
          <div className="bg-[#12121a] border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl relative select-none">
            <h3 className="text-lg font-bold text-red-400 mb-2 flex items-center gap-2">
              <span>⚠️</span> Desistir do Teste
            </h3>
            <p className="text-sm text-slate-300 mb-6 leading-relaxed">
              Tens a certeza que queres desistir do teste? Todo o progresso recente será perdido e a sessão será encerrada.
            </p>
            <div className="flex items-center justify-end gap-3">
              <button
                onClick={() => setShowExitConfirm(false)}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-700 bg-slate-850 text-slate-300 hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Voltar ao Teste
              </button>
              <button
                onClick={() => {
                  console.log('Saindo do teste confirmado via modal ');
                  setShowExitConfirm(false);
                  sessionStorage.removeItem('studybud_teste_em_curso');
                  sessionStorage.removeItem('studybud_active_test_answers');
                  onCancel();
                }}
                className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 hover:bg-red-500 text-white transition-colors cursor-pointer"
              >
                Sim, Desistir e Sair
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
