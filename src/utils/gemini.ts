/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { GoogleGenerativeAI } from '@google/generative-ai';
import { TestQuestions, AICorrectionResult, TestAnswers } from '../types';

// Hardcoded API Key as requested in Alteration 1
const GEMINI_API_KEY = (import.meta as any).env?.VITE_GEMINI_API_KEY || "AIzaSyDlRly44lILQn2aRT1BQaO5fcwnjLZGxho";

// Model name as specified
const MODEL_NAME = 'gemini-2.0-flash';

// Global instances
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
export const model = genAI.getGenerativeModel({ model: MODEL_NAME });

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

O teu objetivo é criar um GUIA DE ESTUDO COMPLETO e EXPLICATIVO em português de Portugal (pt-PT).
NÃO faças apenas uma lista do que está no PDF.
EXPLICA cada conceito como se fosses um professor a ensinar um aluno do zero.
Usa exemplos concretos, analogias simples e linguagem clara.
Usa emojis relevantes para tornar o conteúdo mais agradável e fácil de ler.
${professorTips ? `Atenção especial aos seguintes tópicos indicados pelo professor: ${professorTips}` : ''}

Estrutura obrigatória em Markdown:

# 📚 Guia de Estudo — ${disciplina}

## 🎯 1. Resumo Executivo
[3-4 parágrafos a explicar os conceitos MAIS IMPORTANTES do PDF de forma clara e acessível. 
Não listes tópicos — EXPLICA o que o estudante precisa mesmo de saber.]

## 📋 2. Índice de Tópicos
[Lista numerada de todos os tópicos abordados no PDF]

## 📖 3. Explicação Detalhada por Tópico
[Para CADA tópico importante do PDF:

### 🔹 3.X Nome do Tópico

**O que é?**
[Explicação clara do conceito em linguagem simples, como se explicasses a um colega]

**Como funciona?**
[Explicação do funcionamento com detalhes práticos]

**Exemplo concreto:**
[Exemplo real e prático que ilustra o conceito]

**Código de exemplo (se aplicável):**
\`\`\`linguagem
// código de exemplo comentado linha a linha
\`\`\`

**⚠️ Atenção / Erro comum:**
[O erro mais comum que os estudantes cometem neste tópico]

**💡 Dica de memorização:**
[Uma dica ou analogia para ajudar a memorizar o conceito]
]

## 🔄 4. Tabelas Comparativas
[Para cada conjunto de conceitos semelhantes, cria uma tabela Markdown clara e bem organizada com emojis nas colunas]

## 🎯 5. Pontos-Chave para o Exame
[Lista de 10-15 pontos com emojis, explicando brevemente PORQUÊ cada ponto é importante para o exame]

## 📝 6. Glossário Explicado
[Para cada termo técnico: **Termo** → Definição simples em 1-2 frases, com analogia se possível]

## 🧠 7. Perguntas de Auto-Avaliação
[8-10 perguntas variadas (teóricas e práticas) com as respetivas respostas detalhadas logo abaixo de cada pergunta]

## 🗺️ 8. Mapa Mental (em texto)
[Representação hierárquica dos conceitos principais usando indentação e emojis:
📌 Conceito Principal
  ├── 🔹 Sub-conceito 1
  │     ├── Detalhe A
  │     └── Detalhe B
  └── 🔹 Sub-conceito 2
]

REGRAS OBRIGATÓRIAS:
1. Baseia-te EXCLUSIVAMENTE no conteúdo do PDF fornecido
2. EXPLICA os conceitos, não te limites a listá-los
3. Usa emojis relevantes em títulos e pontos importantes
4. Usa linguagem clara e acessível, sem jargão desnecessário
5. O resumo deve ser LONGO e DETALHADO — qualidade acima de tudo
6. Cada explicação deve fazer sentido sozinha, sem precisar do PDF`;

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
  onLoadingStatus?: (status: string) => void,
  previousTestPdfBase64?: string,
  usePreviousTest?: boolean
): Promise<TestQuestions> {
  const pureBase64 = getPureBase64(pdfBase64);

  if (onLoadingStatus) onLoadingStatus('A analisar os slides do PDF...');

  const previousTestSection = previousTestPdfBase64 && usePreviousTest
    ? `
IMPORTANTE — ESTILO DO TESTE ANTERIOR:
O segundo PDF fornecido é um teste anterior desta disciplina.
Analisa o seu estilo, estrutura, tipo de perguntas, nível de 
dificuldade e tópicos abordados.
As tuas perguntas devem seguir o MESMO ESTILO e ESTRUTURA do 
teste anterior, mas com conteúdo diferente baseado no PDF da matéria.
As perguntas NÃO podem ser iguais às do teste anterior, apenas 
similares em formato e dificuldade.`
    : '';

  const prompt = `Analisa este PDF da disciplina ${disciplina} e gera um teste académico${nomeTeste ? ` intitulado "${nomeTeste}"` : ''}.${previousTestSection}
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
      "question": "enunciado do problem",
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
    const parts: any[] = [
      {
        inlineData: {
          mimeType: "application/pdf",
          data: pureBase64
        }
      }
    ];

    if (previousTestPdfBase64 && usePreviousTest) {
      const purePrevBase64 = getPureBase64(previousTestPdfBase64);
      parts.push({
        inlineData: {
          mimeType: "application/pdf",
          data: purePrevBase64
        }
      });
    }

    parts.push({ text: prompt });

    const result = await model.generateContent(parts);

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
