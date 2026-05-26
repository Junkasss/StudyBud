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

  // Universal loading
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatus, setLoadingStatus] = useState('');

  // Active test metrics
  const [activeTestQuestions, setActiveTestQuestions] = useState<TestQuestions | null>(null);
  const [activeTestName, setActiveTestName] = useState('');
  const [activeTestDiscipline, setActiveTestDiscipline] = useState('');
  const [activeAnswers, setActiveAnswers] = useState<TestAnswers | null>(null);
  const [activeCorrection, setActiveCorrection] = useState<AICorrectionResult | null>(null);
  const [isReviewMode, setIsReviewMode] = useState(false);

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
  const handleGenerateSummary = async (disciplineName: string, tipsPrompt: string) => {
    if (!selectedFileBase64) return;

    setIsLoading(true);
    setLoadingStatus('Inicializando conexões ao Gemini...');

    try {
      const generatedMarkdown = await generateSummary(
        selectedFileBase64,
        disciplineName,
        tipsPrompt,
        (progressText) => setLoadingStatus(progressText)
      );

      const newSummaryRecord: SavedSummary = {
        id: Date.now(),
        discipline: disciplineName,
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
      
      // Error routing according to specifications
      if (err?.status === 429 || err?.message?.includes('429')) {
        alert('Quota diária da API atingida. Tenta novamente amanhã.');
      } else {
        alert('Ocorreu um erro ao comunicar com a IA. Confirma a validade do teu PDF ou tenta novamente.');
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
    numIII: number
  ) => {
    if (!selectedFileBase64) return;

    setIsLoading(true);
    setLoadingStatus('Esboçando perguntas universitárias...');

    try {
      const questionsData = await generateQuestions(
        selectedFileBase64,
        disciplineName,
        numI,
        numII,
        numIII,
        tipsPrompt,
        testTitle,
        (progressText) => setLoadingStatus(progressText)
      );

      setActiveTestName(testTitle);
      setActiveTestDiscipline(disciplineName);
      setActiveTestQuestions(questionsData);
      
      setIsLoading(false);
      setCurrentView('teste_realizacao');
    } catch (err: any) {
      setIsLoading(false);
      console.error(err);
      
      if (err?.status === 429 || err?.message?.includes('429')) {
        alert('Quota diária da API atingida. Tenta novamente amanhã ou usa uma API key com billing ativado.');
      } else {
        alert('Erro ao extrair as perguntas dos slides. Confirma a tua API Key ou tenta com uma configuração menor.');
      }
    }
  };

  // 3. COMPLETE AND SEMANTIC GRADE TEST ACTION
  const handleFinishTakingTest = async (userAnswers: TestAnswers) => {
    if (!activeTestQuestions) return;

    setIsLoading(true);
    setLoadingStatus('A enviar respostas para correção...');

    try {
      const correctionData = await gradeAnswers(
        activeTestQuestions,
        userAnswers,
        activeTestDiscipline,
        (progressText) => setLoadingStatus(progressText)
      );

      setActiveAnswers(userAnswers);
      setActiveCorrection(correctionData);
      setIsReviewMode(false);
      
      setIsLoading(false);
      setCurrentView('resultados');
    } catch (err: any) {
      setIsLoading(false);
      console.error(err);
      alert('Não foi possível processar a correção pela IA. Tenta formular as respostas de forma simples ou verifica os limites da tua chave.');
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

        {/* MAIN PANEL CONTENT PORT */}
        <main id="sb-content-pane" className="flex-1 p-4 sm:p-6 md:p-8 max-w-7xl w-full mx-auto">
          
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
              onCancel={() => setCurrentView('nova_sessao')}
            />
          )}

          {currentView === 'resultados' && activeTestQuestions && activeAnswers && activeCorrection && (
            <ResultadosCorrecao
              testName={activeTestName}
              discipline={activeTestDiscipline}
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
