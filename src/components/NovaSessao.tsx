/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from 'react';
import { ViewType, DISCIPLINES } from '../types';

interface NovaSessaoProps {
  selectedFile: File | null;
  selectedFileBase64: string;
  onSelectFile: (file: File | null, base64: string) => void;
  onGenerateSummary: (disciplina: string, tips: string) => void;
  onGenerateTest: (
    disciplina: string, 
    nomeTeste: string, 
    tips: string, 
    numI: number, 
    numII: number, 
    numIII: number
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
  const [disciplina, setDisciplina] = useState(DISCIPLINES[0]);
  const [outroDisciplina, setOutroDisciplina] = useState('');
  const [nomeTeste, setNomeTeste] = useState('');
  const [professorTips, setProfessorTips] = useState('');

  // Sliders configuration
  const [numMultipla, setNumMultipla] = useState(5);
  const [numDesenvolvimento, setNumDesenvolvimento] = useState(3);
  const [numCodigo, setNumCodigo] = useState(2);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);

  // Alteration 2 Local Upload States
  const [pdfBase64, setPdfBase64] = useState(selectedFileBase64);
  const [pdfName, setPdfName] = useState(selectedFile ? selectedFile.name : '');
  const [uploadStatusState, setUploadStatusState] = useState<'idle' | 'loading' | 'success' | 'error'>(() => {
    return selectedFile ? 'success' : 'idle';
  });
  const [errorMessage, setErrorMessage] = useState('');

  // Sync state with parent components
  useEffect(() => {
    if (selectedFile) {
      setPdfName(selectedFile.name);
      setPdfBase64(selectedFileBase64);
      setUploadStatusState('success');
    } else {
      setPdfName('');
      setPdfBase64('');
      setUploadStatusState('idle');
    }
  }, [selectedFile, selectedFileBase64]);

  // Compute live aggregates
  const totalPreguntas = numMultipla + numDesenvolvimento + numCodigo;
  const duracaoEstimada = Math.round(numMultipla * 2 + numDesenvolvimento * 10 + numCodigo * 15);

  const activeDisciplina = disciplina === 'Outra' ? outroDisciplina : disciplina;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      processFile(files[0]);
    }
  };

  // Alteration 2 - File processing and Validation
  const processFile = (file: File) => {
    // 5. Validar que o ficheiro é PDF antes de aceitar. Limite de 10MB com mensagem de erro clara.
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

    // 1. Leitura com FileReader
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
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const triggerGenerateSummary = () => {
    if (!selectedFileBase64) {
      alert('Por favor, carrega primeiro um ficheiro PDF de slides.');
      return;
    }
    const finalDiscp = activeDisciplina.trim();
    if (!finalDiscp) {
      alert('Por favor, especifica o nome da disciplina.');
      return;
    }
    onGenerateSummary(finalDiscp, professorTips);
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
      numCodigo
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

          {/* Alteration 2 - Multi-colored Explicit Upload Status Bar */}
          <div className="flex flex-col gap-1.5 pt-1">
            <label className="text-[10px] uppercase font-bold text-[#a09abb] tracking-wider">Estado do Ficheiro</label>
            
            {uploadStatusState === 'idle' && (
              <div id="upload-status-idle" className="p-3 bg-[#12121a] border border-[#2a2a3f] rounded-xl text-xs text-[#a09abb] font-semibold flex items-center gap-2">
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
