<div align="center">
  <img src="frontend/public/Logo.png" alt="LexAgent Logo" width="120" />
  <h1>LexAgent (Mandamus Judicial Platform)</h1>
  <p><strong>Accelerating Justice through Agentic AI and 'Judge-in-the-Loop' Workflows</strong></p>

  [![React](https://img.shields.io/badge/React-18.x-blue?style=for-the-badge&logo=react)](https://reactjs.org/)
  [![Mastra](https://img.shields.io/badge/Mastra-Agentic_Framework-orange?style=for-the-badge)](https://mastra.ai/)
  [![Hono](https://img.shields.io/badge/Hono-API_Gateway-red?style=for-the-badge)](https://hono.dev/)
  [![Qdrant](https://img.shields.io/badge/Qdrant-Vector_DB-purple?style=for-the-badge)](https://qdrant.tech/)
  [![Enkrypt AI](https://img.shields.io/badge/Enkrypt_AI-Guardrails-brightgreen?style=for-the-badge)](https://enkryptai.com/)
</div>

<hr/>

## 📖 Overview

**LexAgent** (part of the Mandamus platform) is a high-fidelity, enterprise-grade Legal Document Intelligence Agent. Built for the **HiDevs x Mastra Hackathon 2026**, it tackles the global case pendency crisis by augmenting human legal reasoning.

We embrace a **Judge-in-the-Loop** philosophy. LexAgent does not replace legal professionals; it acts as a hyper-intelligent co-pilot that ingests hundreds of pages of legal text, performs semantic precedent searches, analyzes clauses, and evaluates risks—all under 60 seconds.

---

## ✨ Key Features

- 🧠 **Neural Engine (Multi-Document Processing)**: Upload massive PDFs. The backend orchestrates concurrent text extraction and passes it through an advanced LLM reasoning pipeline (Amazon Bedrock & Gemini 1.5).
- 🛡️ **Enkrypt AI Guardrails**: 
  - *Input Guard*: Protects the system from malicious prompt injections or toxic inputs.
  - *Output Guard*: Prevents AI hallucinations by cross-checking generated legal claims and citations against retrieved precedents.
- 📚 **Semantic Precedent Search**: Powered by **Qdrant Vector Database**, finding the top matching case laws and legal precedents instantly.
- 🎙️ **Real-Time Text-to-Speech**: Built-in integration with **ElevenLabs**, allowing users to have generated legal briefs and insights read aloud instantly.
- 💬 **Persistent Conversational UI**: A ChatGPT-style interface with full chat history, pinned sessions, workspaces, and real-time Server-Sent Events (SSE) streaming.
- 🔒 **Secure Enclave**: Powered by Firebase Authentication for enterprise-grade secure access.

---

## 🏗️ System Architecture

LexAgent uses a modern decoupled architecture. The frontend is a lightning-fast React SPA, communicating with a Hono API Gateway that orchestrates complex workflows via Mastra.

```mermaid
graph TD
    User([👨‍⚖️ Legal Professional])
    
    subgraph Frontend [Vercel Deployment]
        UI[React + Vite UI]
        Auth[(Firebase Auth)]
    end
    
    subgraph Backend [Render Deployment]
        API[Hono API Gateway]
        Mastra[Mastra Agentic Workflow]
    end
    
    subgraph External Intelligence & Storage
        Qdrant[(Qdrant Vector DB)]
        Gemini[Google Gemini 1.5]
        Bedrock[Amazon Bedrock LLM]
        Enkrypt[Enkrypt AI Guardrails]
        ElevenLabs[ElevenLabs TTS]
    end

    User <-->|HTTPS| UI
    UI <-->|Authenticates| Auth
    UI <-->|REST & SSE Streams| API
    
    API <-->|Executes| Mastra
    Mastra -->|Session/History Storage| Qdrant
    Mastra -->|Vector Embeddings| Gemini
    Mastra -->|Legal Reasoning| Bedrock
    Mastra -->|Input/Output Validation| Enkrypt
    Mastra -->|Audio Generation| ElevenLabs
```

---

## 📂 Project Structure

```text
legal-agent-mvp/
├── frontend/                 # React UI Workspace
│   ├── src/
│   │   ├── components/       # UI Components (Dashboard, Chat, Cards)
│   │   ├── context/          # State Management (Auth, History)
│   │   └── lib/              # Firebase Initialization
│   ├── index.html            # Vite Entry
│   └── vercel.json           # Vercel Deployment Config
├── src/                      # Backend Node.js Workspace
│   ├── mastra/               # Mastra Agent Definitions
│   │   ├── agents/           # Legal, Drafting, & QA Agents
│   │   └── workflows/        # Orchestrated Analysis Workflows
│   ├── lib/
│   │   ├── enkrypt.ts        # Enkrypt AI Guardrail Integrations
│   │   └── qdrant.ts         # Vector DB & Chat History Logic
│   └── server.ts             # Hono API Gateway & Routing
├── package.json              # Monorepo Dependencies
└── render.yaml               # Render Deployment Config
```

---

## 🚀 Getting Started

### 1. Prerequisites
Ensure you have the following installed:
- **Node.js** (v20+)
- **npm** or **yarn**

### 2. Environment Setup
You will need two `.env` files. 

**Root Directory (`/.env`)**:
```env
GOOGLE_GENERATIVE_AI_API_KEY=your_gemini_key
QDRANT_URL=your_qdrant_cluster_url
QDRANT_API_KEY=your_qdrant_key
ENKRYPTAI_API_KEY=your_enkrypt_key
AWS_ACCESS_KEY_ID=your_aws_key
AWS_SECRET_ACCESS_KEY=your_aws_secret
AWS_REGION=us-east-1
ELEVENLABS_API_KEY=your_elevenlabs_key
PORT=3001
```

**Frontend Directory (`/frontend/.env`)**:
```env
VITE_FIREBASE_API_KEY=your_firebase_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_API_URL=http://localhost:3001
```

### 3. Installation & Running Locally

Install all dependencies from the root:
```bash
npm install
cd frontend && npm install
cd ..
```

Start the Backend (runs on port 3001):
```bash
npm run dev
```

Start the Frontend (runs on port 5173):
```bash
cd frontend
npm run dev
```

---

## 🌐 Deployment

The repository is pre-configured for modern, serverless-friendly deployments.

- **Frontend**: Designed for 1-click deployment on **Vercel**. Select the `frontend` folder as your Root Directory.
- **Backend**: Designed for deployment on **Render.com** (to avoid Vercel's 10-second serverless timeout). A `render.yaml` blueprint is included in the root directory.

---

## 🤝 Philosophy: Judge-in-the-Loop

We believe AI should not pass judgments. **LexAgent** adheres strictly to the "Judge-in-the-Loop" standard:
1. **Traceability**: Every citation and precedent suggested is mapped back to verified legal databases (via Qdrant & Enkrypt hallucination checks).
2. **Forensic Versioning**: All edits to legal drafts are tracked and reversible.
3. **Data Security**: Court data remains encrypted and isolated. 

*Built with ❤️ for the HiDevs x Mastra Hackathon.*
