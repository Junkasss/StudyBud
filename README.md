<div align="center">

# 📚 StudyBud

### O teu assistente de estudo inteligente, alimentado por IA

[![Deploy](https://img.shields.io/badge/demo-live-brightgreen?style=for-the-badge&logo=github)](https://junkasss.github.io/StudyBud/)
[![TypeScript](https://img.shields.io/badge/TypeScript-98%25-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Gemini](https://img.shields.io/badge/Gemini_AI-powered-4285F4?style=for-the-badge&logo=google&logoColor=white)](https://ai.google.dev/)

<br/>

> Estuda mais, esforça-te menos. O StudyBud usa inteligência artificial para te ajudar a aprender de forma mais eficaz.

[🚀 Ver Demo](https://junkasss.github.io/StudyBud/) · [🐛 Reportar Bug](https://github.com/Junkasss/StudyBud/issues) · [✨ Sugerir Funcionalidade](https://github.com/Junkasss/StudyBud/issues)

</div>

---

## 📋 Índice

- [Sobre o Projeto](#-sobre-o-projeto)
- [Tecnologias](#-tecnologias)
- [Estrutura do Projeto](#-estrutura-do-projeto)
- [Usar a Aplicação](#-usar-a-aplicação)
- [Desenvolvimento Local](#-desenvolvimento-local)
- [Contribuir](#-contribuir)
- [Licença](#-licença)

---

## 📖 Sobre o Projeto

O **StudyBud** é uma aplicação web de assistente de estudo com inteligência artificial, desenvolvida com React e alimentada pelo modelo Gemini da Google. Pensado para estudantes universitários de Engenharia Informática que querem uma ferramenta moderna para apoio ao estudo, o StudyBud combina uma interface limpa com o poder generativo da IA.

**Principais funcionalidades:**

- 📄 **Resumos automáticos de PDFs** — Carrega os teus slides e recebe um resumo estruturado e completo gerado por IA
- 📝 **Geração de testes personalizados** — Escolha múltipla, desenvolvimento e código, calibrados com base nos teus slides
- ✅ **Correção semântica com feedback** — A IA avalia as respostas e explica o que acertaste e o que podes melhorar
- 📊 **Histórico e estatísticas** — Acompanha a tua evolução, médias por disciplina e conquistas desbloqueáveis
- 🎨 **Design moderno e responsivo** — Interface dark mode, fluida em desktop e mobile

---

## 🛠 Tecnologias

| Camada | Tecnologia |
|---|---|
| **Framework UI** | [React 19](https://react.dev/) |
| **Linguagem** | [TypeScript](https://www.typescriptlang.org/) |
| **Build Tool** | [Vite 6](https://vitejs.dev/) |
| **Estilos** | [Tailwind CSS 4](https://tailwindcss.com/) |
| **Animações** | [Motion](https://motion.dev/) |
| **Ícones** | [Lucide React](https://lucide.dev/) |
| **IA** | [Google Gemini API](https://ai.google.dev/) |
| **Deploy** | [GitHub Pages](https://pages.github.com/) |

---

## 🗂 Estrutura do Projeto

```
StudyBud/
├── .github/
│   └── workflows/          # CI/CD — deploy automático para GitHub Pages
├── assets/
│   └── .aistudio/          # Configurações do Google AI Studio
├── src/                    # Código fonte principal
│   ├── components/         # Componentes React reutilizáveis
│   ├── hooks/              # Custom hooks
│   ├── services/           # Integração com a API Gemini
│   └── main.tsx            # Ponto de entrada da aplicação
├── index.html              # Template HTML
├── vite.config.ts          # Configuração do Vite
├── tsconfig.json           # Configuração do TypeScript
└── package.json            # Dependências e scripts
```

---

## 🚀 Usar a Aplicação

Não é necessário instalar nada. Acede diretamente pelo browser:

**👉 [https://junkasss.github.io/StudyBud/](https://junkasss.github.io/StudyBud/)**

A aplicação corre integralmente no browser — sem servidores, sem configurações, sem conta.

---

## 💻 Desenvolvimento Local

Só necessário se quiseres modificar o código-fonte.

**Pré-requisito:** [Node.js](https://nodejs.org/) `>=18`

```bash
git clone https://github.com/Junkasss/StudyBud.git
cd StudyBud
npm install
npm run dev        # Abre em http://localhost:3000
```

```bash
npm run build      # Build de produção em /dist
npm run preview    # Pré-visualizar o build localmente
npm run lint       # Verificar erros de TypeScript
npm run clean      # Remover ficheiros de build
```

O deploy para GitHub Pages é automático via **GitHub Actions** a cada push para `main`.

---

## 🤝 Contribuir

Contribuições são bem-vindas! Se quiseres melhorar o StudyBud:

1. Faz **Fork** do projeto
2. Cria uma branch para a tua funcionalidade (`git checkout -b feature/nova-funcionalidade`)
3. Faz **commit** das tuas alterações (`git commit -m 'feat: adiciona nova funcionalidade'`)
4. Faz **push** para a branch (`git push origin feature/nova-funcionalidade`)
5. Abre um **Pull Request**

---

## 📄 Licença

Distribuído sob a licença MIT. Consulta o ficheiro `LICENSE` para mais informações.

---

<div align="center">

Feito com ❤️ por [Junkasss](https://github.com/Junkasss)

⭐ Se o projeto te foi útil, deixa uma estrela!

</div>