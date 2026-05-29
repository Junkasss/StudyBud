/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  ViewType, 
  HistoricalTest, 
  SavedSummary, 
  TestQuestions, 
  TestAnswers, 
  AICorrectionResult 
} from './types';
import { Sidebar } from './components/Sidebar';
import { BottomNav } from './components/BottomNav';
import { Dashboard } from './components/Dashboard';
import { NovaSessao } from './components/NovaSessao';
import { Resumos } from './components/Resumos';
import { TesteRealizacao } from './components/TesteRealizacao';
import { ResultadosCorrecao } from './components/ResultadosCorrecao';
import { Historico } from './components/Historico';
import { generateSummary, generateQuestions, gradeAnswers } from './utils/gemini';
import { Perfil } from './components/Perfil';

const abreviarDisciplina = (nome: string): string => {
  const palavras = nome.split(' ').filter(p => p.length > 2 && !['dos', 'das', 'para', 'com', 'por', 'uma', 'web'].includes(p.toLowerCase()));
  if (palavras.length === 0) return 'DISC';
  return palavras.map(p => p.substring(0, 3).toUpperCase()).join('');
};

const gerarNomeResumo = (disciplina: string, resumosExistentes: any[]): string => {
  const abrevs: {[key: string]: string} = {
    'Algoritmos e Tipos Abstratos de Dados': 'ATAD',
    'Complementos de Bases de Dados': 'CBD',
    'Computação Móvel': 'CM',
    'Computação Paralela e Distribuída': 'CPD',
    'Desenvolvimento de Videojogos': 'DV',
    'Interação Pessoa-Máquina': 'IPM',
    'Matemática Discreta': 'MD',
    'Matemática I': 'MAT1',
    'Métodos Estatísticos': 'ME',
    'Programação Avançada': 'PA',
    'Programação Orientada por Objetos': 'POO',
    'Programação para a Web': 'PW',
    'Sistemas Operativos': 'SO',
  };
  const abrev = abrevs[disciplina] || disciplina.substring(0, 4).toUpperCase();
  
  // Conta quantos resumos já existem para esta disciplina
  const resumosDaDisciplina = resumosExistentes.filter(r => r.discipline === disciplina);
  const numero = resumosDaDisciplina.length + 1;
  
  return `Resumo${numero}_${abrev}`;
};

export default function App() {
  // Navigation View
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [sessionInitialMode, setSessionInitialMode] = useState<'summary' | 'test'>('summary');

  // Local storage structures
  const [history, setHistory] = useState<HistoricalTest[]>([]);
  const [summaries, setSummaries] = useState<SavedSummary[]>([]);

  // Active uploads
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedFileBase64, setSelectedFileBase64] = useState<string>('');
  const [apiError, setApiError] = useState<string | null>(null);

  // Universal loading
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');

  // Active test metrics
  const [activeTestQuestions, setActiveTestQuestions] = useState<TestQuestions | null>(() => {
    try {
      const stored = sessionStorage.getItem('studybud_active_test_questions');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });
  const [activeTestName, setActiveTestName] = useState(() => {
    return sessionStorage.getItem('studybud_active_test_name') || '';
  });
  const [activeTestDiscipline, setActiveTestDiscipline] = useState(() => {
    return sessionStorage.getItem('studybud_active_test_discipline') || '';
  });
  const [activeTestNumeroTeste, setActiveTestNumeroTeste] = useState<string>(() => {
    return sessionStorage.getItem('studybud_active_test_numero_teste') || 'Teste 1';
  });
  const [activeAnswers, setActiveAnswers] = useState<TestAnswers | null>(null);
  const [activeCorrection, setActiveCorrection] = useState<AICorrectionResult | null>(null);
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [hasSavedActiveTest, setHasSavedActiveTest] = useState(false);

  // Sync hasSavedActiveTest on view changes or test changes
  useEffect(() => {
    const hasActive = sessionStorage.getItem('studybud_teste_em_curso') !== null;
    setHasSavedActiveTest(hasActive);
  }, [currentView, activeTestQuestions]);

  // Sync active test states with sessionStorage (CORREÇÃO 5)
  useEffect(() => {
    if (activeTestQuestions) {
      sessionStorage.setItem('studybud_active_test_questions', JSON.stringify(activeTestQuestions));
    } else {
      sessionStorage.removeItem('studybud_active_test_questions');
    }
  }, [activeTestQuestions]);

  useEffect(() => {
    if (activeTestName) {
      sessionStorage.setItem('studybud_active_test_name', activeTestName);
    } else {
      sessionStorage.removeItem('studybud_active_test_name');
    }
  }, [activeTestName]);

  useEffect(() => {
    if (activeTestDiscipline) {
      sessionStorage.setItem('studybud_active_test_discipline', activeTestDiscipline);
    } else {
      sessionStorage.removeItem('studybud_active_test_discipline');
    }
  }, [activeTestDiscipline]);

  useEffect(() => {
    if (activeTestNumeroTeste) {
      sessionStorage.setItem('studybud_active_test_numero_teste', activeTestNumeroTeste);
    } else {
      sessionStorage.removeItem('studybud_active_test_numero_teste');
    }
  }, [activeTestNumeroTeste]);

  // No warning modals needed since API Key is integrated hardcoded server/client-side

  // Custom light/dark theme tracking
  const [isLightMode, setIsLightMode] = useState(() => {
    return localStorage.getItem('studybud_theme') === 'light';
  });

  // Initial load
  useEffect(() => {
    // 1. Theme Configuration
    if (isLightMode) {
      document.documentElement.classList.add('light');
    } else {
      document.documentElement.classList.remove('light');
    }

    // Dynamic Inline Favicon (Alteration 4)
    const svgString = `
      <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 6 C16 6, 8 4, 4 6 L4 26 C8 24, 16 26, 16 26" stroke="#6c63ff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <path d="M16 6 C16 6, 24 4, 28 6 L28 26 C24 24, 16 26, 16 26" stroke="#6c63ff" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round"/>
        <line x1="16" y1="6" x2="16" y2="26" stroke="#6c63ff" stroke-width="1.5" stroke-linecap="round"/>
      </svg>
    `;
    const blob = new Blob([svgString], { type: 'image/svg+xml' });
    const url = URL.createObjectURL(blob);
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement('link');
      (link as any).rel = 'icon';
      document.head.appendChild(link);
    }
    (link as any).href = url;

    // Clear removed API key according to Alteration 1 instructions
    localStorage.removeItem('studybud_apiKey');

    // 2. Read LocalStorage arrays
    try {
      const storedHistory = localStorage.getItem('studybud_history');
      if (storedHistory) {
         setHistory(JSON.parse(storedHistory) as HistoricalTest[]);
      }
    } catch (e) {
      console.error('Failed reading studybud_history from localStorage:', e);
    }

    try {
      const storedSummaries = localStorage.getItem('studybud_summaries');
      if (storedSummaries) {
         setSummaries(JSON.parse(storedSummaries) as SavedSummary[]);
      }
    } catch (e) {
      console.error('Failed reading studybud_summaries from localStorage:', e);
    }
  }, []);

  // Sync theme
  const toggleTheme = () => {
    setIsLightMode((prev) => {
      const next = !prev;
      localStorage.setItem('studybud_theme', next ? 'light' : 'dark');
      if (next) {
        document.documentElement.classList.add('light');
      } else {
        document.documentElement.classList.remove('light');
      }
      return next;
    });
  };

  // No key confirmation functions needed (Alteration 1)

  // Nav helper with optional modes
  const handleNavigate = (view: ViewType, options?: { mode?: 'summary' | 'test' }) => {
    if (options?.mode) {
      setSessionInitialMode(options.mode);
    }
    setCurrentView(view);
  };

  // Deletion functions
  const handleDeleteSummary = (id: number) => {
    const nextList = summaries.filter((s) => s.id !== id);
    setSummaries(nextList);
    localStorage.setItem('studybud_summaries', JSON.stringify(nextList));
  };

  const handleClearHistory = () => {
    setHistory([]);
    localStorage.removeItem('studybud_history');
  };

  const handleSaveTestToHistory = (newRecord: HistoricalTest) => {
    // Check if test id already exists in history array to avoid duplicates
    if (history.some((t) => t.id === newRecord.id)) return;
    
    const nextHistory = [newRecord, ...history];
    setHistory(nextHistory);
    localStorage.setItem('studybud_history', JSON.stringify(nextHistory));
  };

  // Reviewing past test action
  const handleReviewTest = (test: HistoricalTest) => {
    setActiveTestName(test.name);
    setActiveTestDiscipline(test.discipline);
    setActiveTestQuestions(test.questions);
    setActiveAnswers(test.answers);
    setActiveCorrection(test.grades);
    setIsReviewMode(true);
    setCurrentView('resultados');
  };

  // 1. GENERATE SUMMARY ACTION
  const handleGenerateSummary = async (disciplineName: string, testNameInput: string, tipsPrompt: string) => {
    if (!selectedFileBase64 || selectedFileBase64.trim().length === 0) {
      setApiError('Ficheiro PDF em falta ou vazio. Por favor, carrega um ficheiro PDF válido antes de avançar.');
      return;
    }

    setIsLoading(true);
    setLoadingStatus('Inicializando conexões ao Gemini...');
    setApiError(null);

    console.log('handleGenerateSummary: Iniciando geração de resumo com Gemini...');
    try {
      const generatedMarkdown = await generateSummary(
        selectedFileBase64,
        disciplineName,
        tipsPrompt,
        (progressText) => setLoadingStatus(progressText)
      );

      console.log('handleGenerateSummary: Resumo gerado com sucesso.');

      // Calculate localized customized title as per CORREÇÃO 2
      const finalTitle = testNameInput.trim() || gerarNomeResumo(disciplineName, summaries);

      const newSummaryRecord: SavedSummary = {
        id: Date.now(),
        discipline: disciplineName,
        nomeTeste: finalTitle,
        pdfName: selectedFile ? selectedFile.name : 'ficheiro.pdf',
        date: new Date().toISOString(),
        content: generatedMarkdown,
      };

      const updatedSummaries = [newSummaryRecord, ...summaries];
      setSummaries(updatedSummaries);
      localStorage.setItem('studybud_summaries', JSON.stringify(updatedSummaries));

      setIsLoading(false);
      alert('Resumo gerado com sucesso! Redirecionando para a tua biblioteca.');
      setCurrentView('resumos');
    } catch (err: any) {
      setIsLoading(false);
      console.error(err);
      
      const errMsg = err?.message || '';
      if (err?.status === 429 || errMsg.includes('429')) {
        setApiError('A quota diária da API de teste foi atingida (Erro 429 - Quota Exceeded). Por favor tente novamente amanhã.');
      } else if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid') || errMsg.includes('403')) {
        setApiError('A chave API fornecida não é válida (Erro 403 - Forbidden). Por favor verifique a configuração do seu token.');
      } else if (errMsg.includes('404')) {
        setApiError('O modelo solicitado não foi encontrado (Erro 404 - Not Found). Por favor confirme o nome do modelo.');
      } else {
        setApiError(`Ocorreu um erro ao comunicar com a IA. Confirma a validade do teu PDF ou tenta novamente. Detalhe: ${errMsg}`);
      }
    }
  };

  // 2. GENERATE AND LAUNCH TEST ACTION
  const handleGenerateAndStartTest = async (
    disciplineName: string, 
    testTitle: string, 
    tipsPrompt: string, 
    numI: number, 
    numII: number, 
    numIII: number,
    previousTestPdfBase64?: string,
    usePreviousTest?: boolean,
    numeroTesteVal?: string
  ) => {
    if (!selectedFileBase64 || selectedFileBase64.trim().length === 0) {
      setApiError('Ficheiro PDF em falta ou vazio. Por favor, carrega um ficheiro PDF válido antes de avançar.');
      return;
    }

    setIsLoading(true);
    setLoadingStatus('Esboçando perguntas universitárias...');
    setApiError(null);

    console.log('handleGenerateAndStartTest: Iniciando geração de teste com Gemini...');
    try {
      const questionsData = await generateQuestions(
        selectedFileBase64,
        disciplineName,
        numI,
        numII,
        numIII,
        tipsPrompt,
        testTitle,
        (progressText) => setLoadingStatus(progressText),
        previousTestPdfBase64,
        usePreviousTest
      );

      console.log('handleGenerateAndStartTest: Teste gerado com sucesso.');
      setActiveTestName(testTitle);
      setActiveTestDiscipline(disciplineName);
      setActiveTestNumeroTeste(numeroTesteVal || 'Teste 1');
      setActiveTestQuestions(questionsData);
      
      setIsLoading(false);
      setCurrentView('teste_realizacao');
    } catch (err: any) {
      setIsLoading(false);
      console.error(err);
      
      const errMsg = err?.message || '';
      if (err?.status === 429 || errMsg.includes('429')) {
        setApiError('A quota diária da API de teste foi atingida (Erro 429 - Quota Exceeded). Por favor tente novamente amanhã.');
      } else if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid') || errMsg.includes('403')) {
        setApiError('A chave API fornecida não é válida (Erro 403 - Forbidden). Por favor verifique a configuração do seu token.');
      } else if (errMsg.includes('404')) {
        setApiError('O modelo solicitado não foi encontrado (Erro 404 - Not Found). Por favor confirme o nome do modelo.');
      } else {
        setApiError(`Erro ao extrair as perguntas dos slides. Confirma a tua API Key ou tenta com uma configuração menor. Detalhe: ${errMsg}`);
      }
    }
  };

  // 3. COMPLETE AND SEMANTIC GRADE TEST ACTION
  const handleFinishTakingTest = async (userAnswers: TestAnswers) => {
    if (!activeTestQuestions) return;

    setIsLoading(true);
    setLoadingStatus('A enviar respostas para correção...');
    setApiError(null);

    console.log('handleFinishTakingTest: Iniciando correção de teste de avaliação...');
    try {
      const correctionData = await gradeAnswers(
        activeTestQuestions,
        userAnswers,
        activeTestDiscipline,
        (progressText) => setLoadingStatus(progressText)
      );

      console.log('handleFinishTakingTest: Correção concluída com sucesso.');

      // Calculate finalScoreScaled
      let partIAnswersCorrect = 0;
      const partITotal = activeTestQuestions.partI.length;
      activeTestQuestions.partI.forEach((q) => {
        const studentChoice = userAnswers.partI[q.id];
        if (studentChoice === q.correctAnswer) {
          partIAnswersCorrect++;
        }
      });
      const partIWeightScore = partITotal > 0 ? (partIAnswersCorrect / partITotal) * 7 : 0;

      let partIIGradeSum = 0;
      const partIITotalMax = activeTestQuestions.partII.length * 5;
      correctionData.developmentGrades.forEach((g) => {
        partIIGradeSum += g.score;
      });
      const partIIWeightScore = partIITotalMax > 0 ? (partIIGradeSum / partIITotalMax) * 7 : 0;

      let partIIIGradeSum = 0;
      const partIIITotalMax = activeTestQuestions.partIII.length * 5;
      correctionData.codeGrades.forEach((g) => {
        partIIIGradeSum += g.score;
      });
      const partIIIWeightScore = partIIITotalMax > 0 ? (partIIIGradeSum / partIIITotalMax) * 6 : 0;

      const totalScoreRaw = partIWeightScore + partIIWeightScore + partIIIWeightScore;
      const finalScoreScaled = Math.round(totalScoreRaw * 10) / 10;

      const record: HistoricalTest = {
        id: Date.now(),
        name: activeTestName,
        discipline: activeTestDiscipline,
        numeroTeste: activeTestNumeroTeste || 'Teste 1',
        date: new Date().toISOString(),
        score: finalScoreScaled,
        totalQuestions: partITotal + activeTestQuestions.partII.length + activeTestQuestions.partIII.length,
        partI: { correct: partIAnswersCorrect, total: partITotal },
        partII: { score: partIIGradeSum, total: partIITotalMax },
        partIII: { score: partIIIGradeSum, total: partIIITotalMax },
        questions: activeTestQuestions,
        answers: userAnswers,
        grades: correctionData
      };

      // Save to general history immediately without duplicated loop risk
      setHistory((prevHistory) => {
        const nextHistory = [record, ...prevHistory];
        localStorage.setItem('studybud_history', JSON.stringify(nextHistory));
        return nextHistory;
      });

      // Clear active test state from sessionStorage to indicate test is over
      sessionStorage.removeItem('studybud_teste_em_curso');
      sessionStorage.removeItem('studybud_active_test_answers');
      setHasSavedActiveTest(false);

      // Save to academic profile
      try {
        const storedProfiles = localStorage.getItem('studybud_test_profiles');
        const parsedProfiles = storedProfiles ? JSON.parse(storedProfiles) : {};
        
        let currentProfile = parsedProfiles[activeTestDiscipline];
        
        // Seed default profile for discipline if missing
        if (!currentProfile) {
          currentProfile = {
            numTestes: 2,
            testes: [
              { numero: 1, nome: "Teste 1", resultados: [] },
              { numero: 2, nome: "Teste 2", resultados: [] }
            ]
          };
        }
        
        // Extract the test number index from activeTestNumeroTeste (e.g. "Teste 3" -> 3)
        const match = activeTestNumeroTeste.match(/\d+/);
        const testNum = match ? parseInt(match[0], 10) : 1;
        
        // Auto-expand/increment number of tests in the profile if needed
        if (testNum > currentProfile.numTestes) {
          currentProfile.numTestes = testNum;
          const updatedTestes = [...currentProfile.testes];
          for (let i = updatedTestes.length + 1; i <= testNum; i++) {
            updatedTestes.push({ numero: i, nome: `Teste ${i}`, resultados: [] });
          }
          currentProfile.testes = updatedTestes;
        }
        
        // Find correct test slot and associate result
        const foundTest = currentProfile.testes.find((t: any) => t.numero === testNum);
        if (foundTest) {
          if (!foundTest.resultados) {
            foundTest.resultados = [];
          }
          foundTest.resultados.push({
            id: record.id,
            date: record.date,
            score: finalScoreScaled
          });
        }
        
        parsedProfiles[activeTestDiscipline] = currentProfile;
        localStorage.setItem('studybud_test_profiles', JSON.stringify(parsedProfiles));
        console.log(`Auto-associated test to Academic Profile: ${activeTestDiscipline} Test ${testNum} with score ${finalScoreScaled}`);
      } catch (profileErr) {
        console.error('Failed to auto-associate with test profiles:', profileErr);
      }

      setActiveAnswers(userAnswers);
      setActiveCorrection(correctionData);
      setIsReviewMode(false);
      
      setIsLoading(false);
      setCurrentView('resultados');
    } catch (err: any) {
      setIsLoading(false);
      console.error(err);
      
      const errMsg = err?.message || '';
      if (err?.status === 429 || errMsg.includes('429')) {
        setApiError('A quota diária da API de teste foi atingida (Erro 429 - Quota Exceeded). Por favor tente novamente amanhã.');
      } else if (errMsg.includes('API_KEY_INVALID') || errMsg.includes('API key not valid') || errMsg.includes('403')) {
        setApiError('A chave API fornecida não é válida (Erro 403 - Forbidden). Por favor verifique a configuração do seu token.');
      } else if (errMsg.includes('404')) {
        setApiError('O modelo solicitado não foi encontrado (Erro 404 - Not Found). Por favor confirme o nome do modelo.');
      } else {
        setApiError(`Não foi possível processar a correção pela IA. Tenta formular as respostas de forma simples ou verifica os limites da tua chave. Detalhe: ${errMsg}`);
      }
    }
  };

  return (
    <div className="min-h-screen sb-bg-main text-slate-100 flex transition-colors duration-200">
      
      {/* 1. SIDEBAR DESKTOP */}
      <Sidebar 
        currentView={currentView} 
        onNavigate={handleNavigate} 
      />

      {/* 2. CORE CONTENT WRAPPER */}
      <div className="flex-1 flex flex-col md:pl-[240px] min-h-screen pb-20 md:pb-6">
        
        {/* MOBILE HEADER TOP-BAR */}
        <header id="sb-header" className="sticky top-0 z-15 bg-[#12121a] border-b border-[#2a2a3f] px-5 py-3.5 flex items-center justify-between shadow-xs md:shadow-none bg-opacity-95 backdrop-blur-md">
          <div className="flex items-center gap-2 md:hidden">
            {/* Custom open-book SVG logo (Alteration 4) */}
            <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="flex-shrink-0">
              <path d="M16 6 C16 6, 8 4, 4 6 L4 26 C8 24, 16 26, 16 26" stroke="#6c63ff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <path d="M16 6 C16 6, 24 4, 28 6 L28 26 C24 24, 16 26, 16 26" stroke="#6c63ff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
              <line x1="16" y1="6" x2="16" y2="26" stroke="#6c63ff" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <div>
              <h1 className="font-display font-bold text-[20px] text-[#f1f0ff] leading-none mb-0.5">StudyBud</h1>
              <p className="text-[9px] text-indigo-400 font-semibold font-sans tracking-wide leading-none">LEI Edition</p>
            </div>
          </div>
          
          <div className="hidden md:block">
            {/* Context breadcrumb or indicator */}
            <span className="text-xs font-semibold text-slate-500 font-mono select-none">STUDYBUD PLATFORM // CONTROLS</span>
          </div>

          <div className="flex items-center gap-2">
            {/* Dark/Light theme selector */}
            <button
              id="btn-theme-toggle"
              onClick={toggleTheme}
              className="w-9 h-9 rounded-xl border border-[#2a2a3f] bg-[#12121a] hover:bg-slate-800 text-sm flex items-center justify-center transition-colors cursor-pointer"
              title="Alternar Tema Estético"
            >
              {isLightMode ? '🌙' : '☀️'}
            </button>
          </div>
        </header>

        {/* Banner de Teste em Curso (CORREÇÃO 5) */}
        {hasSavedActiveTest && currentView !== 'teste_realizacao' && currentView !== 'resultados' && (
          <div className="bg-[#6c63ff]/10 border-b border-[#6c63ff]/20 px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 animate-fade-in text-left">
            <div className="flex items-center gap-2 text-sm text-slate-200">
              <span className="text-[#6c63ff] font-bold">📝 Teste em Curso:</span>
              <span>Tens um teste em curso da disciplina <strong className="text-white">{activeTestDiscipline}</strong> ({activeTestName}).</span>
            </div>
            <button
              onClick={() => setCurrentView('teste_realizacao')}
              className="px-4 py-1.5 bg-[#6c63ff] hover:bg-[#7c74ff] text-white text-xs font-bold rounded-xl shadow-md shadow-[#6c63ff]/15 transition-all text-center self-start sm:self-center cursor-pointer"
            >
              Retomar Teste
            </button>
          </div>
        )}

        {/* MAIN PANEL CONTENT PORT */}
        <main id="sb-content-pane" className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          
          {apiError && (
            <div className="mb-6 p-4 bg-red-900/40 border-l-4 border-red-500 rounded-lg text-slate-100 flex items-start justify-between gap-3 shadow-md animate-fade-in" id="api-error-banner">
              <div className="flex gap-2">
                <span className="text-xl">⚠️</span>
                <div>
                  <h4 className="font-bold text-red-100 font-display">Erro na Chamada do Gemini API</h4>
                  <p className="text-sm text-red-200 mt-1 font-sans">{apiError}</p>
                </div>
              </div>
              <button 
                onClick={() => setApiError(null)}
                className="text-red-300 hover:text-white font-bold px-2 py-1 rounded hover:bg-red-800 transition-colors cursor-pointer"
                title="Fechar"
                id="btn-close-error"
              >
                ✕
              </button>
            </div>
          )}

          {/* Reroute matching view controllers */}
          {currentView === 'dashboard' && (
            <Dashboard 
              history={history} 
              summaries={summaries} 
              onNavigate={handleNavigate}
              onReviewTest={handleReviewTest}
            />
          )}

          {currentView === 'nova_sessao' && (
            <NovaSessao
              selectedFile={selectedFile}
              selectedFileBase64={selectedFileBase64}
              onSelectFile={(f, b) => { setSelectedFile(f); setSelectedFileBase64(b); }}
              onGenerateSummary={handleGenerateSummary}
              onGenerateTest={handleGenerateAndStartTest}
              initialMode={sessionInitialMode}
            />
          )}

          {currentView === 'resumos' && (
            <Resumos 
              summaries={summaries} 
              onDeleteSummary={handleDeleteSummary}
            />
          )}

          {currentView === 'teste_realizacao' && activeTestQuestions && (
            <TesteRealizacao
              name={activeTestName}
              discipline={activeTestDiscipline}
              questions={activeTestQuestions}
              onFinish={handleFinishTakingTest}
              onCancel={() => {
                setActiveTestQuestions(null);
                setActiveTestName('');
                setActiveTestDiscipline('');
                setActiveTestNumeroTeste('Teste 1');
                setCurrentView('nova_sessao');
              }}
              setResultados={(res: any) => {
                setActiveAnswers(res.userAnswers);
                setActiveCorrection(res.aiGrades);
                setIsReviewMode(false);

                // Build academic test historical entry
                const partITotal = res.partI.total;
                const partIAnswersCorrect = res.partI.correct;
                const partIIGradeSum = res.partII.grades ? res.partII.grades.reduce((sum: number, g: any) => sum + (g.score || 0), 0) : 0;
                const partIITotalMax = res.partII.total * 5;
                const partIIIGradeSum = res.partIII.grades ? res.partIII.grades.reduce((sum: number, g: any) => sum + (g.score || 0), 0) : 0;
                const partIIITotalMax = res.partIII.total * 5;

                const record: HistoricalTest = {
                  id: Date.now(),
                  name: res.nomeTeste,
                  discipline: res.disciplina,
                  numeroTeste: res.numeroTeste || 'Teste 1',
                  date: res.date || new Date().toISOString(),
                  score: res.score,
                  totalQuestions: partITotal + res.partII.total + res.partIII.total,
                  partI: { correct: partIAnswersCorrect, total: partITotal },
                  partII: { score: partIIGradeSum, total: partIITotalMax },
                  partIII: { score: partIIIGradeSum, total: partIIITotalMax },
                  questions: activeTestQuestions || res.questions || { partI: [], partII: [], partIII: [] },
                  answers: res.userAnswers,
                  grades: res.aiGrades
                };

                // Save to general history immediately without duplicate list risk
                setHistory((prevHistory) => {
                  if (prevHistory.some((t) => t.id === record.id)) return prevHistory;
                  const nextHistory = [record, ...prevHistory];
                  localStorage.setItem('studybud_history', JSON.stringify(nextHistory));
                  return nextHistory;
                });

                // Clear active test state from sessionStorage to indicate test is over
                sessionStorage.removeItem('studybud_teste_em_curso');
                sessionStorage.removeItem('studybud_active_test_answers');
                setHasSavedActiveTest(false);

                // Save to academic profile
                try {
                  const storedProfiles = localStorage.getItem('studybud_test_profiles');
                  const parsedProfiles = storedProfiles ? JSON.parse(storedProfiles) : {};
                  
                  let currentProfile = parsedProfiles[res.disciplina];
                  
                  // Seed default profile for discipline if missing
                  if (!currentProfile) {
                    currentProfile = {
                      numTestes: 2,
                      testes: [
                        { numero: 1, nome: "Teste 1", resultados: [] },
                        { numero: 2, nome: "Teste 2", resultados: [] }
                      ]
                    };
                  }
                  
                  // Extract the test number index from activeTestNumeroTeste (e.g. "Teste 3" -> 3)
                  const match = (res.numeroTeste || 'Teste 1').match(/\d+/);
                  const testNum = match ? parseInt(match[0], 10) : 1;
                  
                  // Auto-expand/increment number of tests in the profile if needed
                  if (testNum > currentProfile.numTestes) {
                    currentProfile.numTestes = testNum;
                    const updatedTestes = [...currentProfile.testes];
                    for (let i = updatedTestes.length + 1; i <= testNum; i++) {
                      updatedTestes.push({ numero: i, nome: `Teste ${i}`, resultados: [] });
                    }
                    currentProfile.testes = updatedTestes;
                  }
                  
                  // Find correct test slot and associate result
                  const foundTest = currentProfile.testes.find((t: any) => t.numero === testNum);
                  if (foundTest) {
                    if (!foundTest.resultados) {
                      foundTest.resultados = [];
                    }
                    if (!foundTest.resultados.some((r: any) => r.id === record.id)) {
                      foundTest.resultados.push({
                        id: record.id,
                        date: record.date,
                        score: res.score
                      });
                    }
                  }
                  
                  parsedProfiles[res.disciplina] = currentProfile;
                  localStorage.setItem('studybud_test_profiles', JSON.stringify(parsedProfiles));
                  console.log(`Auto-associated test to Academic Profile via setResultados: ${res.disciplina} Test ${testNum} with score ${res.score}`);
                } catch (profileErr) {
                  console.error('Failed to auto-associate with test profiles inside setResultados:', profileErr);
                }
              }}
              setCurrentView={setCurrentView}
              numeroTeste={activeTestNumeroTeste}
            />
          )}

          {currentView === 'resultados' && activeTestQuestions && activeAnswers && activeCorrection && (
            <ResultadosCorrecao
              testName={activeTestName}
              discipline={activeTestDiscipline}
              numeroTeste={activeTestNumeroTeste}
              questions={activeTestQuestions}
              answers={activeAnswers}
              grades={activeCorrection}
              onSaveHistory={handleSaveTestToHistory}
              onRestart={() => setCurrentView('historico')}
              isHistoricalReview={isReviewMode}
            />
          )}

          {currentView === 'historico' && (
            <Historico 
              history={history} 
              onReviewTest={handleReviewTest}
              onClearHistory={handleClearHistory}
            />
          )}

          {currentView === 'perfil' && (
            <Perfil 
              history={history}
              summaries={summaries}
            />
          )}

        </main>
      </div>

      {/* 3. MOBILE PERSISTENT BOTTOMBAR */}
      <BottomNav currentView={currentView} onNavigate={setCurrentView} />

      {/* 4. MODAL LOADING OVERLAY - Multimodal progressive status tracker */}
      {isLoading && (
        <div id="loading-overlay" className="fixed inset-0 z-50 bg-[#0a0a0f]/85 backdrop-blur-md flex flex-col items-center justify-center p-6 text-center select-none animate-fade-in">
          {/* Animated custom micro spinner */}
          <div className="relative mb-6">
            <div className="w-16 h-16 rounded-full border-4 border-slate-800 border-t-indigo-500 animate-spin" />
            <div className="absolute inset-0 flex items-center justify-center">
              <svg width="24" height="24" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="animate-pulse">
                <path d="M16 6 C16 6, 8 4, 4 6 L4 26 C8 24, 16 26, 16 26" stroke="#6c63ff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 6 C16 6, 24 4, 28 6 L28 26 C24 24, 16 26, 16 26" stroke="#6c63ff" strokeWidth="2.5" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
                <line x1="16" y1="6" x2="16" y2="26" stroke="#6c63ff" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          <h3 className="text-lg font-bold font-display text-white mb-2 animate-pulse">
            Processamento em Curso...
          </h3>
          <p className="text-indigo-400 font-mono text-xs sm:text-sm tracking-wide bg-indigo-600/5 px-4 py-1.5 border border-indigo-500/10 rounded-full animate-pulse-slow">
            {loadingStatus}
          </p>
          <p className="text-[10px] text-slate-500 mt-4 max-w-xs leading-relaxed">
            Isto pode demorar cerca de 15 a 30 segundos dependendo do tamanho dos slides teóricos.
          </p>
        </div>
      )}

      {/* 5. API KEY WARNING REMOVED AS HARDCODED API KEY IS INTEGRATED */}

    </div>
  );
}
