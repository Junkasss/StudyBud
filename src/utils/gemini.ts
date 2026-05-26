/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { TestQuestions, AICorrectionResult, TestAnswers } from '../types';

// Hardcoded API Key as requested in Alteration 1
const GEMINI_API_KEY = "AIzaSyDlRly44lILQn2aRT1BQaO5fcwnjLZGxho";

// Model name as specified
const MODEL_NAME = 'gemini-1.5-flash';

// Global instances
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

// Helper to remove data URI headers from base64 strings
function getPureBase64(base64: string): string {
  if (base64.includes(',')) {
    return base64.split(',')[1];
  }
  return base64;
}

// Simple JSON extraction helper to clean any text wraps (such as markdown ```json ... ```)
function extractJson(responseStr: string): string {
  let cleaned = responseStr.trim();
  if (cleaned.startsWith('```json')) {
    cleaned = cleaned.substring(7);
  } else if (cleaned.startsWith('```')) {
    cleaned = cleaned.substring(3);
  }
  if (cleaned.endsWith('```')) {
    cleaned = cleaned.substring(0, cleaned.length - 3);
  }
  return cleaned.trim();
}

/**
 * FUNÇÃO 1 — GERAR RESUMO
 * Analyzes the PDF and outputs a structured Markdown summary.
 */
export async function generateSummary(
  pdfBase64: string,
  disciplina: string,
  professorTips?: string,
  onLoadingStatus?: (status: string) => void
): Promise<string> {
  const pureBase64 = getPureBase64(pdfBase64);

  if (onLoadingStatus) onLoadingStatus('A IA está a ler o teu PDF...');

  const pdfPart = {
    inlineData: {
      mimeType: 'application/pdf',
      data: pureBase64,
    },
  };

  const tipsPrompt = professorTips?.trim()
    ? `\n\nAtenção especial aos seguintes tópicos indicados pelo professor: ${professorTips}`
    : '';

  const mainPrompt = `Analisa este PDF de slides universitários da disciplina de [${disciplina}].
Gera um resumo de estudo EXTREMAMENTE COMPLETO e DETALHADO em português de Portugal (pt-PT).${tipsPrompt}

O resumo DEVE ter obrigatoriamente esta estrutura em Markdown:

# Resumo de Estudo — [${disciplina}]

## 1. Resumo Executivo
[2-3 parágrafos com os conceitos centrais do documento]

## 2. Índice de Tópicos
[lista numerada de todos os tópicos abordados no PDF]

## 3. Conteúdo Detalhado por Tópico
[Para CADA tópico do PDF:
### 3.X Nome do Tópico
- Explicação detalhada
- Exemplos concretos
- Fórmulas ou código se aplicável
- Comparações com outros conceitos se relevante]

## 4. Tabelas Comparativas
[Tabelas Markdown para comparar conceitos semelhantes encontrados no PDF]

## 5. Pontos-Chave para Exame
[lista bullet com os 10-15 pontos mais importantes e prováveis de sair em exame]

## 6. Glossário
[Termo: Definição, para todos os termos técnicos do PDF]

## 7. Perguntas de Auto-Avaliação
[5 perguntas rápidas com resposta para o estudante se testar]

IMPORTANTE: Baseia-te EXCLUSIVAMENTE no conteúdo do PDF fornecido. Não inventes conteúdo que não esteja nos slides.`;

  if (onLoadingStatus) onLoadingStatus('A identificar conceitos-chave...');
  
  try {
    if (onLoadingStatus) onLoadingStatus('A estruturar o resumo...');
    const result = await model.generateContent([
      pdfPart,
      { text: mainPrompt }
    ]);
    
    if (onLoadingStatus) onLoadingStatus('A finalizar...');
    const response = await result.response;
    return response.text() || '';
  } catch (error: any) {
    console.error('generateSummary error:', error);
    throw error;
  }
}

/**
 * FUNÇÃO 2 — GERAR PERGUNTAS
 * Analyzes the PDF and outputs a JSON response with randomized assessment questions.
 */
export async function generateQuestions(
  pdfBase64: string,
  disciplina: string,
  numMultipla: number,
  numDesenvolvimento: number,
  numCodigo: number,
  professorTips?: string,
  nomeTeste?: string,
  onLoadingStatus?: (status: string) => void
): Promise<TestQuestions> {
  const pureBase64 = getPureBase64(pdfBase64);

  if (onLoadingStatus) onLoadingStatus('A analisar os slides do PDF...');

  const pdfPart = {
    inlineData: {
      mimeType: 'application/pdf',
      data: pureBase64,
    },
  };

  const tipsPrompt = professorTips?.trim()
    ? `\n\nSiga o estilo de perguntas indicado: ${professorTips}`
    : '';

  const mainPrompt = `Analisa este PDF de slides da disciplina [${disciplina}] e gera um teste de avaliação académico intitulado "${nomeTeste || 'Teste'}" em português de Portugal.
${tipsPrompt}

Gera EXACTAMENTE:
- ${numMultipla} perguntas de escolha múltipla (Parte I)
- ${numDesenvolvimento} perguntas de desenvolvimento (Parte II)
- ${numCodigo} perguntas de código/programação (Parte III)

REGRAS OBRIGATÓRIAS:
1. TODAS as perguntas devem basear-se EXCLUSIVAMENTE no conteúdo do PDF fornecido.
2. NÃO repitas perguntas semelhantes — cada pergunta deve ser única e sobre um tópico diferente.
3. Varia o nível de dificuldade (fácil, médio, difícil).
4. As perguntas de código devem especificar a linguagem (Java, Python, C, C++, Javascript, etc.) conforme os slides.

Devolve um JSON válido com esta estrutura exata:
{
  "partI": [
    {
      "id": "q1_mc",
      "question": "texto da pergunta",
      "options": {
        "A": "opção A",
        "B": "opção B",
        "C": "opção C",
        "D": "opção D"
      },
      "correctAnswer": "A",
      "explanation": "explicação detalhada de porquê A é a resposta correta e porquê as outras estão erradas"
    }
  ],
  "partII": [
    {
      "id": "q1_dev",
      "question": "enunciado completo da pergunta de desenvolvimento",
      "modelAnswer": "resposta modelo completa e detalhada",
      "keyPoints": ["ponto chave 1", "ponto chave 2", "ponto chave 3"],
      "maxScore": 5
    }
  ],
  "partIII": [
    {
      "id": "q1_code",
      "question": "enunciado completo do problema de código",
      "language": "Java",
      "starterCode": "// código inicial se aplicável",
      "modelAnswer": "código solução completo",
      "explanation": "explicação do que o código faz e conceitos envolvidos",
      "maxScore": 5
    }
  ]
}

Devolve APENAS o JSON, sem texto adicional, sem blocos de markdown.`;

  if (onLoadingStatus) onLoadingStatus('A criar perguntas variadas...');

  try {
    const result = await model.generateContent([
      pdfPart,
      { text: mainPrompt }
    ]);

    if (onLoadingStatus) onLoadingStatus('A validar estrutura e formato...');
    const response = await result.response;
    const textOutput = response.text() || '';
    const cleanJson = extractJson(textOutput);
    return JSON.parse(cleanJson) as TestQuestions;
  } catch (error: any) {
    console.error('generateQuestions initial failed, retrying once as required:', error);
    try {
      // Retry once to fulfill 'JSON inválido da IA: tentar novamente automaticamente 1 vez antes de mostrar erro'
      if (onLoadingStatus) onLoadingStatus('A corrigir formato do exame...');
      const resultRetry = await model.generateContent([
        pdfPart,
        { text: mainPrompt + '\n\nATENÇÃO: Devolve estritamente o objeto JSON descodificável!' }
      ]);
      const responseRetry = await resultRetry.response;
      const cleanJsonRetry = extractJson(responseRetry.text() || '');
      return JSON.parse(cleanJsonRetry) as TestQuestions;
    } catch (retryError) {
      console.error('generateQuestions retry also failed:', retryError);
      throw error; // Throw original error
    }
  }
}

/**
 * FUNÇÃO 3 — AVALIAR RESPOSTAS
 * Corrects long essays and programming answers semantically.
 */
export async function gradeAnswers(
  questions: TestQuestions,
  userAnswers: TestAnswers,
  disciplina: string,
  onLoadingStatus?: (status: string) => void
): Promise<AICorrectionResult> {
  if (onLoadingStatus) onLoadingStatus('A enviar respostas para correção...');

  // Format relevant developer evaluation details for both Part II and Part III
  const formattedAnswers = {
    disciplina,
    developmentQuestions: questions.partII.map((q) => ({
      questionId: q.id,
      question: q.question,
      modelAnswer: q.modelAnswer,
      keyPoints: q.keyPoints,
      studentAnswer: userAnswers.partII[q.id] || 'Sem resposta.'
    })),
    codeQuestions: questions.partIII.map((q) => ({
      questionId: q.id,
      question: q.question,
      language: q.language,
      modelAnswer: q.modelAnswer,
      studentAnswer: userAnswers.partIII[q.id] || 'Sem resposta.'
    })),
  };

  const mainPrompt = `És um professor universitário a corrigir um teste de [${disciplina}].

Avalia as seguintes respostas de desenvolvimento e programação do aluno de Engenharia Informática e devolve um JSON com a correção detalhada.

REGRAS DE AVALIAÇÃO:
- Perguntas de desenvolvimento (Part II): 0 a 5 pontos (avalia a corretude semântica, não palavras exatas)
- Perguntas de código (Part III): 0 a 5 pontos (avalia se a lógica está correta, mesmo com sintaxe diferente, comentários ou formatações separadas)
- Para desenvolvimento e código: aceitar respostas corretas mesmo com formulação diferente do modelo.

Dados a corrigir:
${JSON.stringify(formattedAnswers, null, 2)}

Devolve JSON com esta estrutura exata:
{
  "developmentGrades": [
    {
      "questionId": "q1_dev",
      "score": 4,
      "feedback": "feedback detalhado em português de Portugal sobre o que estava bem e o que faltou na resposta do aluno",
      "strengths": ["ponto positivo da resposta"],
      "improvements": ["o que podia melhorar"]
    }
  ],
  "codeGrades": [
    {
      "questionId": "q1_code",
      "score": 3,
      "feedback": "avaliação detalhada se a lógica está correta, correções ou bugs sugeridos",
      "isLogicCorrect": true,
      "issues": ["problema encontrado se existir, ou vazio se correto"]
    }
  ]
}

Devolve APENAS o JSON, sem texto adicional, de forma limpa.`;

  if (onLoadingStatus) onLoadingStatus('A avaliar respostas semanticamente...');

  try {
    const result = await model.generateContent([
      { text: mainPrompt }
    ]);

    if (onLoadingStatus) onLoadingStatus('A compilar notas finais...');
    const response = await result.response;
    const textOutput = response.text() || '';
    const cleanJson = extractJson(textOutput);
    return JSON.parse(cleanJson) as AICorrectionResult;
  } catch (error: any) {
    console.error('gradeAnswers initial failed, retrying once:', error);
    try {
      if (onLoadingStatus) onLoadingStatus('A recalcular notas...');
      const resultRetry = await model.generateContent([
        { text: mainPrompt + '\n\nATENÇÃO: Retorna estritamente o JSON válido!' }
      ]);
      const responseRetry = await resultRetry.response;
      const cleanJsonRetry = extractJson(responseRetry.text() || '');
      return JSON.parse(cleanJsonRetry) as AICorrectionResult;
    } catch (retryError) {
      console.error('gradeAnswers retry also failed:', retryError);
      throw error;
    }
  }
}
