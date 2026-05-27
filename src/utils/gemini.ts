/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { TestQuestions, AICorrectionResult, TestAnswers } from '../types';

// Hardcoded API Key as requested in Alteration 1
const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "AIzaSyDlRly44lILQn2aRT1BQaO5fcwnjLZGxho";

// Model name as specified
const MODEL_NAME = 'gemini-2.0-flash';

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

  const prompt = `Analisa este PDF de slides universitários da disciplina de ${disciplina}.
Gera um resumo de estudo EXTREMAMENTE COMPLETO em português de Portugal (pt-PT).
${professorTips ? `Atenção especial aos seguintes tópicos: ${professorTips}` : ''}

Estrutura obrigatória em Markdown:
# Resumo de Estudo — ${disciplina}
## 1. Resumo Executivo
## 2. Índice de Tópicos
## 3. Conteúdo Detalhado por Tópico
## 4. Tabelas Comparativas
## 5. Pontos-Chave para Exame
## 6. Glossário
## 7. Perguntas de Auto-Avaliação

Baseia-te EXCLUSIVAMENTE no conteúdo do PDF.`;

  console.log('generateSummary: enviando chamada para a API do Gemini...', { disciplina });
  
  try {
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "application/pdf",
          data: pureBase64
        }
      },
      { text: prompt }
    ]);

    console.log('generateSummary: resposta da chamada recebida do Gemini.');
    const response = await result.response;
    return response.text() || '';
  } catch (error: any) {
    console.error("Erro Gemini generateSummary:", error);
    throw new Error(`Erro ao gerar resumo: ${error.message || error}`);
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

  const prompt = `Analisa este PDF da disciplina ${disciplina} e gera um teste académico${nomeTeste ? ` intitulado "${nomeTeste}"` : ''}.
${professorTips ? `Estilo de perguntas do professor: ${professorTips}` : ''}

Gera EXATAMENTE:
- ${numMultipla} perguntas de escolha múltipla
- ${numDesenvolvimento} perguntas de desenvolvimento
- ${numCodigo} perguntas de código

REGRAS:
1. Todas as perguntas baseadas EXCLUSIVAMENTE no PDF
2. Sem perguntas repetidas ou semelhantes
3. Varia dificuldade entre fácil, médio e difícil

Devolve APENAS este JSON sem markdown nem texto adicional:
{
  "partI": [
    {
      "id": "q1",
      "question": "texto da pergunta",
      "options": { "A": "opção A", "B": "opção B", "C": "opção C", "D": "opção D" },
      "correctAnswer": "A",
      "explanation": "explicação detalhada"
    }
  ],
  "partII": [
    {
      "id": "q1",
      "question": "enunciado",
      "modelAnswer": "resposta modelo completa",
      "keyPoints": ["ponto 1", "ponto 2"],
      "maxScore": 5
    }
  ],
  "partIII": [
    {
      "id": "q1",
      "question": "enunciado do problema",
      "language": "Java",
      "starterCode": "// escreve aqui",
      "modelAnswer": "código solução",
      "explanation": "explicação",
      "maxScore": 5
    }
  ]
}`;

  console.log('generateQuestions: enviando chamada para a API do Gemini...', { disciplina, numMultipla, numDesenvolvimento, numCodigo });

  try {
    const result = await model.generateContent([
      {
        inlineData: {
          mimeType: "application/pdf",
          data: pureBase64
        }
      },
      { text: prompt }
    ]);

    console.log('generateQuestions: resposta da chamada recebida do Gemini.');
    const response = await result.response;
    const text = response.text() || '';

    // Limpar possível markdown antes de fazer parse
    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned) as TestQuestions;
  } catch (error: any) {
    console.error("Erro Gemini generateQuestions:", error);
    throw new Error(`Erro ao gerar perguntas: ${error.message || error}`);
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

  const questionsForGrading = [
    ...questions.partII.map(q => ({
      id: q.id,
      type: 'development',
      question: q.question,
      modelAnswer: q.modelAnswer,
      keyPoints: q.keyPoints,
      userAnswer: userAnswers.partII[q.id] || ''
    })),
    ...questions.partIII.map(q => ({
      id: q.id,
      type: 'code',
      question: q.question,
      language: q.language,
      modelAnswer: q.modelAnswer,
      userAnswer: userAnswers.partIII[q.id] || ''
    }))
  ];

  const prompt = `És um professor universitário a corrigir um teste de ${disciplina}.

Avalia estas respostas do aluno (avaliação SEMÂNTICA, não literal):

${JSON.stringify(questionsForGrading, null, 2)}

Devolve APENAS este JSON sem markdown:
{
  "developmentGrades": [
    {
      "questionId": "q1",
      "score": 4,
      "feedback": "feedback detalhado",
      "strengths": ["ponto positivo"],
      "improvements": ["o que melhorar"]
    }
  ],
  "codeGrades": [
    {
      "questionId": "q1",
      "score": 3,
      "feedback": "feedback do código",
      "isLogicCorrect": true,
      "issues": ["problema se existir"]
    }
  ]
}`;

  console.log('gradeAnswers: enviando chamada para a API do Gemini...', { disciplina });

  try {
    const result = await model.generateContent(prompt);
    console.log('gradeAnswers: resposta da chamada recebida do Gemini.');
    const response = await result.response;
    const text = response.text() || '';

    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned) as AICorrectionResult;
  } catch (error: any) {
    console.error("Erro Gemini gradeAnswers:", error);
    throw new Error(`Erro ao avaliar respostas: ${error.message || error}`);
  }
}
