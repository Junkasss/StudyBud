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
- [Começar a Usar](#-começar-a-usar)
  - [Pré-requisitos](#pré-requisitos)
  - [Instalação](#instalação)
  - [Configuração](#configuração)
- [Desenvolvimento](#-desenvolvimento)
- [Deploy](#-deploy)
- [Contribuir](#-contribuir)
- [Licença](#-licença)

---

## 📖 Sobre o Projeto

O **StudyBud** é uma aplicação web de assistente de estudo com inteligência artificial, desenvolvida com React e alimentada pelo modelo Gemini da Google. Pensado para estudantes que querem uma ferramenta moderna e intuitiva para apoio ao estudo, o StudyBud combina uma interface limpa com o poder generativo da IA.

**Principais funcionalidades:**

- 🤖 **Chat com IA** — Faz perguntas sobre qualquer tema e recebe respostas detalhadas e pedagógicas
- 📝 **Apoio ao estudo** — Explicações, resumos, exercícios e muito mais
- ⚡ **Interface rápida** — Construída com Vite e React 19 para uma experiência fluida
- 🎨 **Design moderno** — UI responsiva com Tailwind CSS e animações suaves com Motion

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
| **Servidor** | [Express](https://expressjs.com/) |
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
├── .env.example            # Exemplo de variáveis de ambiente
├── vite.config.ts          # Configuração do Vite
├── tsconfig.json           # Configuração do TypeScript
└── package.json            # Dependências e scripts
```

---

## 🚀 Começar a Usar

### Pré-requisitos

Certifica-te de que tens instalado:

- **Node.js** `>=18.0.0` — [Download](https://nodejs.org/)
- **npm** (incluído com o Node.js)
- Uma **Gemini API Key** — [Obtém aqui gratuitamente](https://aistudio.google.com/app/apikey)

### Instalação

1. **Clona o repositório:**

```bash
git clone https://github.com/Junkasss/StudyBud.git
cd StudyBud
```

2. **Instala as dependências:**

```bash
npm install
```

### Configuração

3. **Cria o ficheiro de ambiente:**

```bash
cp .env.example .env.local
```

4. **Adiciona a tua Gemini API Key** ao ficheiro `.env.local`:

```env
GEMINI_API_KEY=a_tua_chave_api_aqui
```

> ⚠️ **Nunca** faças commit do teu `.env.local`. O ficheiro já está incluído no `.gitignore`.

---

## 💻 Desenvolvimento

Inicia o servidor de desenvolvimento:

```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:3000`.

**Outros comandos úteis:**

```bash
npm run build      # Cria a versão de produção em /dist
npm run preview    # Pré-visualiza o build de produção localmente
npm run lint       # Verifica erros de TypeScript
npm run clean      # Remove os ficheiros de build
```

---

## 🌐 Deploy

O projeto usa **GitHub Actions** para deploy automático no GitHub Pages sempre que há um push para a branch `main`.

Para fazer deploy manual:

```bash
npm run build
# Faz push do conteúdo de /dist para a branch gh-pages
```

A aplicação fica disponível em: `https://junkasss.github.io/StudyBud/`

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
