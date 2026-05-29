/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { ViewType, DISCIPLINES } from '../types';

const detectDisciplineFromFilename = (filename: string): string => {
  const name = filename.toLowerCase().replace(/[_\-\.]/g, ' ');
  
  const mappings: { keywords: string[], discipline: string }[] = [
    { keywords: ['cm', 'computacao movel', 'computação móvel', 'mobile'], discipline: 'Computação Móvel' },
    { keywords: ['atad', 'algoritmos', 'tipos abstratos', 'abstract'], discipline: 'Algoritmos e Tipos Abstratos de Dados' },
    { keywords: ['cbd', 'complementos bd', 'complementos bases dados', 'bases de dados'], discipline: 'Complementos de Bases de Dados' },
    { keywords: ['cpd', 'paralela', 'distribuida', 'distribuída', 'paralelo'], discipline: 'Computação Paralela e Distribuída' },
    { keywords: ['dv', 'videojogos', 'video jogos', 'games', 'jogos'], discipline: 'Desenvolvimento de Videojogos' },
    { keywords: ['ipm', 'interacao', 'interação', 'pessoa maquina', 'pessoa máquina', 'hci'], discipline: 'Interação Pessoa-Máquina' },
    { keywords: ['md', 'matematica discreta', 'matemática discreta', 'discreta'], discipline: 'Matemática Discreta' },
    { keywords: ['mat1', 'matematica1', 'matematica i', 'matemática i', 'mat i'], discipline: 'Matemática I' },
    { keywords: ['me', 'metodos estatisticos', 'métodos estatísticos', 'estatistica', 'estatística'], discipline: 'Métodos Estatísticos' },
    { keywords: ['pa', 'programacao avancada', 'programação avançada', 'avancada'], discipline: 'Programação Avançada' },
    { keywords: ['poo', 'orientada objetos', 'orientada por objetos', 'oop'], discipline: 'Programação Orientada por Objetos' },
    { keywords: ['pw', 'web', 'programacao web', 'programação web'], discipline: 'Programação para a Web' },
    { keywords: ['so', 'sistemas operativos', 'operating systems', 'os'], discipline: 'Sistemas Operativos' },
  ];

  for (const mapping of mappings) {
    for (const keyword of mapping.keywords) {
      if (name.includes(keyword)) {
        return mapping.discipline;
      }
    }
  }
  
  return ''; // retorna vazio se não detetar
};

const gerarNomeTeste = (disciplina: string, historico: any[]): string => {
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
  const abrev = abrevs[disciplina] || (disciplina ? disciplina.substring(0, 4).toUpperCase().replace(/\s/g, '') : 'DISC');
  const testsDaDisciplina = historico.filter(h => h.discipline === disciplina);
  const numero = testsDaDisciplina.length + 1;
  return `Teste${numero}_${abrev}`;
};

interface NovaSessaoProps {
  selectedFile: File | null;
  selectedFileBase64: string;
  onSelectFile: (file: File | null, base64: string) => void;
  onGenerateSummary: (disciplina: string, nomeTeste: string, tips: string) => void;
  onGenerateTest: (
    disciplina: string, 
    nomeTeste: string, 
    tips: string, 
    numI: number, 
    numII: number, 
    numIII: number,
    previousTestPdfBase64?: string,
    usePreviousTest?: boolean,
    numeroTeste?: string
  ) => void;
  initialMode?: 'summary' | 'test';
}

export function NovaSessao({
  selectedFile,
  selectedFileBase64,
  onSelectFile,
  onGenerateSummary,
  onGenerateTest,
  initialMode
}: NovaSessaoProps) {
  const [disciplina, setDisciplina] = useState<string>(() => {
    return sessionStorage.getItem('studybud_session_discipline') || DISCIPLINES[0];
  });
  const [outroDisciplina, setOutroDisciplina] = useState('');
  const [nomeTeste, setNomeTeste] = useState<string>(() => {
    return sessionStorage.getItem('studybud_session_nomeTeste') || '';
  });
  const [professorTips, setProfessorTips] = useState('');
  const [autoDetected, setAutoDetected] = useState(false);

  // Estados para PDF de Teste Anterior (CORREÇÃO 4)
  const prevFileInputRef = useRef<HTMLInputElement>(null);
  const [previousTestPdfBase64, setPreviousTestPdfBase64] = useState<string>('');
  const [previousTestPdfName, setPreviousTestPdfName] = useState<string>('');
  const [usePreviousTest, setUsePreviousTest] = useState<boolean>(false);

  // Estado para Número do Teste (CORREÇÃO 8)
  const [numeroTeste, setNumeroTeste] = useState<string>('Teste 1');

  // Sliders configuration
  const [numMultipla, setNumMultipla] = useState(5);
  const [numDesenvolvimento, setNumDesenvolvimento] = useState(3);
  const [numCodigo, setNumCodigo] = useState(2);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // Local Upload States
  const [pdfBase64, setPdfBase64] = useState(selectedFileBase64);
  const [pdfName, setPdfName] = useState<string>(() => {
    return selectedFile 
      ? selectedFile.name 
      : (sessionStorage.getItem('studybud_session_pdfName') || '');
  });
  const [uploadStatusState, setUploadStatusState] = useState<'idle' | 'loading' | 'success' | 'error'>(() => {
    return selectedFile ? 'success' : (sessionStorage.getItem('studybud_session_pdfName') ? 'idle' : 'idle');
  });
  const [errorMessage, setErrorMessage] = useState('');

  // Sync state with parent components
  useEffect(() => {
    if (selectedFile) {
      setPdfName(selectedFile.name);
      setPdfBase64(selectedFileBase64);
      setUploadStatusState('success');
    } else {
      // If we have pdfName from sessionStorage but no file in memory
      const hasStoredName = sessionStorage.getItem('studybud_session_pdfName');
      if (hasStoredName) {
        setPdfName(hasStoredName);
        setPdfBase64('');
        setUploadStatusState('idle');
      } else {
        setPdfName('');
        setPdfBase64('');
        setUploadStatusState('idle');
        setAutoDetected(false);
      }
    }
  }, [selectedFile, selectedFileBase64]);

  // Sempre que mudam, guarda no sessionStorage (CORREÇÃO 2)
  useEffect(() => {
    sessionStorage.setItem('studybud_session_discipline', disciplina);
  }, [disciplina]);

  useEffect(() => {
    sessionStorage.setItem('studybud_session_nomeTeste', nomeTeste);
  }, [nomeTeste]);

  useEffect(() => {
    if (pdfName) {
      sessionStorage.setItem('studybud_session_pdfName', pdfName);
    }
  }, [pdfName]);

  const pdfIsMissingFromMemory = !selectedFileBase64 && !!pdfName;

  // Compute live aggregates
  const totalPreguntas = numMultipla + numDesenvolvimento + numCodigo;
  const duracaoEstimada = Math.round(numMultipla * 2 + numDesenvolvimento * 10 + numCodigo * 15);

  const activeDisciplina = disciplina === 'Outra' ? outroDisciplina : disciplina;

  // Handlers para o PDF de Teste Anterior (CORREÇÃO 4)
  const handlePrevFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
        alert('Apenas são aceites ficheiros em formato PDF (.pdf) para o teste anterior.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        alert('O tamanho do teste anterior excede o limite máximo de 10MB.');
        return;
      }

      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => {
        try {
          const resultStr = reader.result as string;
          const base64Str = resultStr.split(',')[1];
          setPreviousTestPdfBase64(base64Str);
          setPreviousTestPdfName(file.name);
          setUsePreviousTest(true);
        } catch (e) {
          alert('Falha ao processar o PDF do teste anterior.');
        }
      };
    }
  };

  const removePrevFile = () => {
    setPreviousTestPdfBase64('');
    setPreviousTestPdfName('');
    setUsePreviousTest(false);
    if (prevFileInputRef.current) {
      prevFileInputRef.current.value = '';
    }
  };

  // Sugestão automática do teste (CORREÇÃO 8) & Nome automático do teste (CORREÇÃO 3)
  useEffect(() => {
    let historico: any[] = [];
    try {
      const storedHistory = localStorage.getItem('studybud_history');
      if (storedHistory) historico = JSON.parse(storedHistory);
    } catch {
      // Ignora erro
    }
    
    // 1. Número do teste sugerido
    const resultadosDaDisciplina = historico.filter((h: any) => h.discipline === activeDisciplina);
    if (resultadosDaDisciplina.length === 0) {
      setNumeroTeste('Teste 1');
    } else if (resultadosDaDisciplina.length < 3) {
      setNumeroTeste('Teste 2');
    } else {
      setNumeroTeste('Teste 3');
    }

    // 2. Nome do teste preenchido automaticamente
    const nomeAuto = gerarNomeTeste(activeDisciplina, historico);
    setNomeTeste(nomeAuto);
  }, [activeDisciplina, pdfName]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  // File processing and Validation
  const processFile = (file: File) => {
    // Validar que o ficheiro é PDF antes de aceitar. Limite de 10MB com mensagem de erro clara.
    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      setUploadStatusState('error');
      setErrorMessage('Apenas são aceites ficheiros em formato PDF (.pdf).');
      onSelectFile(null, '');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setUploadStatusState('error');
      setErrorMessage('O tamanho do ficheiro excede o limite máximo de 10MB.');
      onSelectFile(null, '');
      return;
    }

    setUploadStatusState('loading');
    setErrorMessage('');

    // Leitura com FileReader
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      try {
        const resultStr = reader.result as string;
        const base64Str = resultStr.split(',')[1]; // remover o prefixo "data:application/pdf;base64,"
        
        setPdfBase64(base64Str);
        setPdfName(file.name);
        setUploadStatusState('success');
        
        // Pass base64 back to core parent to keep state model updated
        onSelectFile(file, base64Str);

        // Deteção automática da disciplina
        const detectedDiscipline = detectDisciplineFromFilename(file.name);
        if (detectedDiscipline) {
          setDisciplina(detectedDiscipline);
          setAutoDetected(true);
        } else {
          setAutoDetected(false);
        }
      } catch (e) {
        setUploadStatusState('error');
        setErrorMessage('Falha ao descompactar e extrair o base64 do PDF.');
        onSelectFile(null, '');
      }
    };
    reader.onerror = () => {
      setUploadStatusState('error');
      setErrorMessage('Erro ao ler dados físicos do ficheiro.');
      onSelectFile(null, '');
    };
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  const removeFile = () => {
    onSelectFile(null, '');
    setPdfBase64('');
    setPdfName('');
    setUploadStatusState('idle');
    setErrorMessage('');
    setAutoDetected(false);
    sessionStorage.removeItem('studybud_session_pdfName');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerGenerateSummary = () => {
    if (!selectedFileBase64) {
      alert('Por favor, carrega primeiro um ficheiro PDF de slides. O ficheiro deve estar em memória para podermos processar o seu conteúdo.');
      return;
    }
    const finalDiscp = activeDisciplina.trim();
    if (!finalDiscp) {
      alert('Por favor, especifica o nome da disciplina.');
      return;
    }
    onGenerateSummary(finalDiscp, nomeTeste, professorTips);
  };

  const triggerGenerateTest = () => {
    if (!selectedFileBase64) {
      alert('Por favor, carrega primeiro um ficheiro PDF de slides.');
      return;
    }
    const finalDiscp = activeDisciplina.trim();
    if (!finalDiscp) {
      alert('Por favor, especifica o nome da disciplina.');
      return;
    }
    const finalTestName = nomeTeste.trim() || `Teste Prático - ${finalDiscp}`;
    onGenerateTest(
      finalDiscp,
      finalTestName,
      professorTips,
      numMultipla,
      numDesenvolvimento,
      numCodigo,
      previousTestPdfBase64,
      usePreviousTest,
      numeroTeste
    );
  };

  return (
    <div className="space-y-6 pb-10">
      {/* Title with open book SVG */}
      <div>
        <h2 className="text-2xl sm:text-3xl font-bold font-display tracking-tight text-white mb-1 flex items-center gap-2">
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="inline-block flex-shrink-0">
            <path d="M16 6 C16 6, 8 4, 4 6 L4 26 C8 24, 16 26, 16 26" stroke="#6c63ff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M16 6 C16 6, 24 4, 28 6 L28 26 C24 24, 16 26, 16 26" stroke="#6c63ff" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round"/>
            <line x1="16" y1="6" x2="16" y2="26" stroke="#6c63ff" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
          Nova Sessão de Estudo
        </h2>
        <p className="text-[#a09abb] text-sm">
          Carrega os teus slides teóricos para converter automaticamente em resumos de exame ou para criar guiões de auto-avaliação interativos.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Painel Esquerdo: File Upload (PDF) */}
        <div className="lg:col-span-5 bg-[#12121a] border border-[#2a2a3f] p-6 rounded-2xl shadow-[0_4px_24px_rgba(108,99,255,0.08)] space-y-4">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-2 h-5 bg-[#6c63ff] rounded-full inline-block"></span> Upload do PDF de Slides
          </h3>

          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all duration-200 select-none ${
              dragOver
                ? 'border-[#6c63ff] bg-[#6c63ff]/10'
                : 'border-[#2a2a3f] hover:border-[#6c63ff] bg-[#0a0a0f] hover:bg-[#1a1a27]'
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf"
              className="hidden"
            />
            <span className="text-4xl block mb-3">📂</span>
            <p className="font-bold text-sm text-[#f1f0ff]">
              Arrasta o teu PDF aqui
            </p>
            <p className="text-xs text-[#a09abb] mt-1">
              ou clica para selecionar no teu computador
            </p>
            <div className="mt-3.5 inline-block px-2.5 py-1 bg-[#6c63ff]/10 text-indigo-300 rounded border border-[#6c63ff]/20 text-[10px] font-semibold tracking-wider uppercase">
              Limite de 10MB
            </div>
          </div>

          {/* Explicit Upload Status Bar */}
          <div className="flex flex-col gap-1.5 pt-1">
            <label className="text-[10px] uppercase font-bold text-[#a09abb] tracking-wider">Estado do Ficheiro</label>
            
            {pdfIsMissingFromMemory ? (
              <div id="upload-status-missing" className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-500 font-semibold space-y-1 text-left animate-fade-in">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                  <span>⚠️ O ficheiro PDF foi removido da memória. Por favor carrega-o novamente.</span>
                </div>
                <p className="text-[10px] text-amber-500/70 ml-4 font-mono">Ficheiro selecionado anteriormente: {pdfName}</p>
              </div>
            ) : uploadStatusState === 'idle' && (
              <div id="upload-status-idle" className="p-3 bg-[#12121a] border border-[#2a2a3f] rounded-xl text-xs text-[#a09abb] font-semibold flex items-center gap-2 animate-fade-in">
                <span className="w-2 h-2 rounded-full bg-slate-500"></span>
                Nenhum ficheiro selecionado
              </div>
            )}

            {uploadStatusState === 'loading' && (
              <div id="upload-status-loading" className="p-3 bg-[#2b2512] border border-amber-500/25 rounded-xl text-xs text-amber-400 font-semibold flex items-center gap-2 animate-pulse">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                A carregar ficheiro...
              </div>
            )}

            {uploadStatusState === 'success' && (
              <div id="upload-status-success" className="p-3 bg-[#112419] border border-[#22c55e]/35 rounded-xl text-xs text-[#22c55e] font-semibold flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-[#22c55e]"></span>
                  <span className="truncate">✅ {pdfName} ({(selectedFile ? selectedFile.size : 0) / (1024 * 1024) ? ((selectedFile ? selectedFile.size : 0) / (1024 * 1024)).toFixed(2) : '0.00'} MB) — pronto</span>
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFile();
                  }}
                  className="text-xs text-red-400 hover:text-red-300 font-extrabold cursor-pointer transition-colors px-1"
                >
                  ✕
                </button>
              </div>
            )}

            {uploadStatusState === 'error' && (
              <div id="upload-status-error" className="p-3 bg-[#291415] border border-[#ef4444]/35 rounded-xl text-xs text-[#ef4444] font-semibold space-y-1">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#ef4444]"></span>
                  <span>❌ Erro ao carregar. Tenta novamente.</span>
                </div>
                {errorMessage && <p className="text-[10px] text-[#ef4444]/80 ml-4 leading-relaxed font-mono">{errorMessage}</p>}
              </div>
            )}
          </div>

          {/* PDF de Teste Anterior (CORREÇÃO 4) */}
          <div className="p-4 bg-[#0a0a0f]/60 border border-[#2a2a3f] rounded-xl space-y-3">
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
                📋 PDF de Teste Anterior <span className="text-[10px] text-indigo-400 font-bold uppercase tracking-wider">(Opcional)</span>
              </h4>
              <p className="text-[10.5px] text-[#a09abb] leading-relaxed">
                Carrega um PDF de um teste anterior para a IA criar perguntas com o mesmo estilo, tipo e estrutura.
              </p>
            </div>

            <div
              onClick={() => prevFileInputRef.current?.click()}
              className={`border border-dashed rounded-lg p-4 text-center cursor-pointer transition-all duration-150 select-none ${
                previousTestPdfName
                  ? 'border-[#22c55e]/40 bg-[#22c55e]/5'
                  : 'border-[#2a2a3f] hover:border-[#6c63ff]/60 bg-[#0a0a0f]/80'
              }`}
            >
              <input
                type="file"
                ref={prevFileInputRef}
                onChange={handlePrevFileChange}
                accept=".pdf"
                className="hidden"
              />
              {previousTestPdfName ? (
                <div className="space-y-1">
                  <p className="text-xs font-bold text-[#22c55e] truncate">
                    ✅ {previousTestPdfName}
                  </p>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removePrevFile();
                    }}
                    className="text-[10px] text-red-100 hover:text-red-400 font-bold"
                  >
                    Remover ficheiro
                  </button>
                </div>
              ) : (
                <div className="space-y-0.5 font-sans">
                  <span className="text-xl block">📄</span>
                  <p className="text-xs font-bold text-[#f1f0ff]">
                    Carregar PDF de teste anterior
                  </p>
                  <p className="text-[10px] text-[#a09abb] mt-0.5">
                    Clica para selecionar no computador
                  </p>
                </div>
              )}
            </div>

            {previousTestPdfName && (
              <label className="flex items-center gap-2 cursor-pointer pt-1.5 select-none text-left">
                <input
                  type="checkbox"
                  checked={usePreviousTest}
                  onChange={(e) => setUsePreviousTest(e.target.checked)}
                  className="rounded bg-[#0a0a0f] border-[#2a2a3f] text-[#6c63ff] focus:ring-0 w-3.5 h-3.5 cursor-pointer"
                />
                <span className="text-xs font-semibold text-[#f1f0ff] hover:text-[#6c63ff] transition-colors leading-snug">
                  Usar este teste como referência de estilo
                </span>
              </label>
            )}
          </div>

          {/* Info Badge */}
          <div className="p-3.5 bg-[#6c63ff]/5 border border-[#6c63ff]/20 rounded-xl space-y-1">
            <h4 className="text-[11px] font-bold text-indigo-400 tracking-wide uppercase">Capacidade Multivariada</h4>
            <p className="text-[11px] text-[#a09abb] leading-relaxed">
              Os slides universitários carregados serão lidos na íntegra pela Inteligência Artificial e convertidos em resumos ou testes realistas.
            </p>
          </div>
        </div>

        {/* Painel Direito: Configurações */}
        <div className="lg:col-span-7 bg-[#12121a] border border-[#2a2a3f] p-6 rounded-2xl shadow-[0_4px_24px_rgba(108,99,255,0.08)] space-y-5">
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <span className="w-2 h-5 bg-[#6c63ff] rounded-full inline-block"></span> Configurações da Sessão
          </h3>

          <div className="space-y-4">
            {/* Disciplina dropdown */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#a09abb] uppercase tracking-wider">Selecionar Disciplina</label>
              <select
                value={disciplina}
                onChange={(e) => {
                  setDisciplina(e.target.value);
                  setOutroDisciplina('');
                  setAutoDetected(false); // Clear if user manually changes
                }}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0a0f] border border-[#2a2a3f] text-white text-sm font-medium focus:outline-none focus:border-[#6c63ff]"
              >
                {DISCIPLINES.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
                <option value="Outra">Outra (Especificar)...</option>
              </select>
              {autoDetected && (
                <div className="text-xs text-[#22c55e] font-semibold flex items-center gap-1.5 mt-1 animate-fade-in" id="auto-detected-badge">
                  <span>✅ Disciplina detetada automaticamente a partir do nome do ficheiro</span>
                </div>
              )}
            </div>

            {/* Custom fields when selection is 'Outra' */}
            {disciplina === 'Outra' && (
              <div className="flex flex-col gap-1.5 animate-fade-in">
                <label className="text-xs font-bold text-[#a09abb] uppercase tracking-wider">Nome da Disciplina Ad-hoc</label>
                <input
                  type="text"
                  placeholder="Ex: Circuitos Eletrónicos..."
                  value={outroDisciplina}
                  onChange={(e) => setOutroDisciplina(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0a0f] border border-[#2a2a3f] text-white text-sm focus:outline-none focus:border-[#6c63ff]"
                />
              </div>
            )}

            {/* Test name input */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#a09abb] uppercase tracking-wider">Nome do Teste / Simulador</label>
              <input
                type="text"
                placeholder="Ex: Teste Prático 1, Frequência Teórica..."
                value={nomeTeste}
                onChange={(e) => setNomeTeste(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0a0f] border border-[#2a2a3f] text-white text-sm focus:outline-none focus:border-[#6c63ff] placeholder-slate-600"
              />
            </div>

            {/* Este teste corresponde a (CORREÇÃO 8) */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-[#a09abb] uppercase tracking-wider">🎯 Este teste corresponde a:</label>
              <div className="flex flex-wrap gap-2 text-left justify-start">
                {['Teste 1', 'Teste 2', 'Teste 3', 'Exame Final', 'Outra avaliação'].map((opc) => (
                  <button
                    key={opc}
                    type="button"
                    onClick={() => setNumeroTeste(opc)}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border cursor-pointer ${
                      numeroTeste === opc
                        ? 'bg-[#6c63ff] border-[#6c63ff] text-white shadow-md shadow-[#6c63ff]/20'
                        : 'bg-[#0a0a0f] border-[#2a2a3f] text-slate-400 hover:text-white hover:border-[#6c63ff]/40'
                    }`}
                  >
                    {opc}
                  </button>
                ))}
              </div>
            </div>

            {/* Professor tips input */}
            <div className="flex flex-col gap-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-[#a09abb] uppercase tracking-wider">Dicas do Professor (Opcional)</label>
                <span className="text-[10px] text-slate-500 font-medium">Formato livre</span>
              </div>
              <textarea
                placeholder="Cola aqui ementas, estilo de perguntas de anos anteriores, tópicos preferidos do docente ou áreas chave..."
                value={professorTips}
                onChange={(e) => setProfessorTips(e.target.value)}
                rows={3}
                className="w-full px-3.5 py-2.5 rounded-xl bg-[#0a0a0f] border border-[#2a2a3f] text-white text-sm focus:outline-none focus:border-[#6c63ff] placeholder-slate-600 resize-none"
              />
              <p className="text-[10px] text-[#a09abb] opacity-80 leading-relaxed">
                A IA analisará estas dicas para influenciar a tónica dos resumos e o formato das avaliações.
              </p>
            </div>

            {/* Sliders para Configuração das Questões */}
            <div className="p-4 bg-[#0a0a0f] border border-[#2a2a3f] rounded-xl space-y-4">
              <h4 className="text-xs font-bold text-[#6c63ff] uppercase tracking-wider">Estrutura do Teste</h4>
              
              <div className="space-y-4">
                {/* Slider I: Escolha Múltipla */}
                <div>
                  <div className="flex justify-between items-center text-xs ml-1 mb-1">
                    <span className="font-bold text-[#f1f0ff]">Parte I — Escolha Múltipla (🅐)</span>
                    <span className="font-semibold text-[#6c63ff] font-mono text-[13px]">{numMultipla} perguntas</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={numMultipla}
                    onChange={(e) => setNumMultipla(parseInt(e.target.value))}
                    className="w-full accent-[#6c63ff] h-1 bg-[#2a2a3f] rounded-lg cursor-pointer animate-none"
                  />
                </div>

                {/* Slider II: Desenvolvimento */}
                <div>
                  <div className="flex justify-between items-center text-xs ml-1 mb-1">
                    <span className="font-bold text-[#f1f0ff]">Parte II — Desenvolvimento (✍️)</span>
                    <span className="font-semibold text-[#6c63ff] font-mono text-[13px]">{numDesenvolvimento} perguntas</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={numDesenvolvimento}
                    onChange={(e) => setNumDesenvolvimento(parseInt(e.target.value))}
                    className="w-full accent-[#6c63ff] h-1 bg-[#2a2a3f] rounded-lg cursor-pointer"
                  />
                </div>

                {/* Slider III: Código */}
                <div>
                  <div className="flex justify-between items-center text-xs ml-1 mb-1">
                    <span className="font-bold text-[#f1f0ff]">Parte III — Código/Programação (💻)</span>
                    <span className="font-semibold text-[#6c63ff] font-mono text-[13px]">{numCodigo} perguntas</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="10"
                    value={numCodigo}
                    onChange={(e) => setNumCodigo(parseInt(e.target.value))}
                    className="w-full accent-[#6c63ff] h-1 bg-[#2a2a3f] rounded-lg cursor-pointer"
                  />
                </div>
              </div>

              {/* Total & ESTIMATED duration box */}
              <div className="pt-3 border-t border-[#2a2a3f] flex items-center justify-between text-xs font-semibold">
                <div className="text-[#a09abb]">
                  Total: <span className="text-white font-mono font-bold text-[13px]">{totalPreguntas}</span> perguntas
                </div>
                <div className="text-[#a09abb]">
                  ⏱️ Duração esperada: <span className="text-white font-mono font-bold text-[13px]">{duracaoEstimada} min</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
              <button
                onClick={triggerGenerateSummary}
                disabled={!selectedFileBase64 || uploadStatusState !== 'success'}
                className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all text-center cursor-pointer ${
                  selectedFileBase64 && uploadStatusState === 'success'
                    ? 'bg-gradient-to-br from-[#6c63ff] to-[#a78bfa] hover:brightness-110 text-white shadow-lg'
                    : 'bg-[#12121a] text-slate-500 cursor-not-allowed border border-[#2a2a3f]'
                }`}
              >
                📚 Gerar Resumo da Matéria
              </button>

              <button
                onClick={triggerGenerateTest}
                disabled={!selectedFileBase64 || totalPreguntas === 0 || uploadStatusState !== 'success'}
                className={`w-full py-3 px-4 rounded-xl font-bold text-sm transition-all text-center border cursor-pointer ${
                  selectedFileBase64 && totalPreguntas > 0 && uploadStatusState === 'success'
                    ? 'border-[#6c63ff] text-indigo-300 hover:bg-[#6c63ff]/10'
                    : 'border-[#2a2a3f] text-slate-500 cursor-not-allowed'
                }`}
              >
                📝 Gerar e Iniciar Teste
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
