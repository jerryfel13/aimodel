# AI Business Assistant — Prototype

A modular, AI-powered web application prototype that demonstrates potential business applications of artificial intelligence. Built as a proof of concept (POC) for client demonstrations — features are intentionally modular so they can be removed, replaced, or extended after requirements are finalized.

> **This is a prototype, not a production application.** It demonstrates possible AI capabilities and does not solve any specific client business problem. AI outputs may be inaccurate — always verify important information.

## Features

| Tool | Description |
| --- | --- |
| **AI Chat Assistant** | Contextual Q&A with session conversation history, example prompts, and clear error handling. |
| **Document Analyzer** | Upload PDF/TXT (max 3 MB), extract text, generate summaries, key points, and action items, then ask questions grounded strictly in the document. |
| **Content Generator** | Draft reports, emails, proposals, summaries, and blog posts with configurable type, topic, tone, and length. Output is editable and copyable. |
| **AI Insights** | Paste or upload CSV/JSON sample data. Statistics are computed deterministically in code; the LLM adds observations and recommendations. Data findings and AI suggestions are visually separated. |
| **AI Studio** | Generate Word (.docx) documents, Excel (.xlsx) spreadsheets, and images from text prompts. Files are built server-side and downloaded directly. |
| **Dashboard** | Usage statistics from actual application events, recent activity feed, tool overview, and example prompts. |

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  Browser (Next.js App Router + React + Tailwind)        │
│  Dashboard · Chat · Documents · Generate · Insights     │
└──────────────────────┬──────────────────────────────────┘
                       │ fetch (JSON)
┌──────────────────────▼──────────────────────────────────┐
│  Next.js API Routes (server-side only)                  │
│  /api/chat · /api/documents/* · /api/generate           │
│  /api/insights · /api/activity                          │
│  Validation · Rate limiting · Sanitization              │
└──────────────────────┬──────────────────────────────────┘
                       │ LLMProvider interface
        ┌──────────────┴───────────────┐
        ▼                              ▼
┌───────────────┐            ┌──────────────────┐
│ OpenAIProvider│            │  DemoProvider    │
│ (OpenAI,      │            │  (deterministic  │
│  OpenRouter,  │            │   local responses│
│  any          │            │   — no API key   │
│  OpenAI-      │            │   required)      │
│  compatible   │            └──────────────────┘
│  gateway)     │
└───────────────┘
```

**Key design decisions:**

- **Provider abstraction** (`src/lib/ai`): all routes depend on the `LLMProvider` interface, not a specific vendor. Swapping providers (OpenAI → OpenRouter → Anthropic native → local models) is a configuration change or a new class implementing the same interface.
- **Secrets stay server-side**: API keys are read in route handlers only and never serialized to the client.
- **In-memory stores for the POC**: activity log (usage stats) and a 15-minute TTL document cache. No database is required; Supabase/PostgreSQL can be added later without changing API contracts.
- **Grounded outputs**: document Q&A must answer from the supplied text (explicit "not found" response otherwise); insights separate deterministic statistics from AI-generated suggestions.
- **Reliability**: per-IP rate limiting (60 req/min), input sanitization, file type/size restrictions, structured error responses on every endpoint.

## Tech stack

- **Frontend:** Next.js 15 (App Router), React 19, TypeScript, Tailwind CSS, lucide-react icons
- **Backend:** Next.js server-side API routes
- **AI:** OpenAI SDK against any OpenAI-compatible endpoint (OpenAI, OpenRouter, or a private gateway)
- **Document processing:** pdf-parse (PDFs), native text decoding (TXT)
- **Testing:** Node.js `node:test` runner via tsx

## Quick start

```bash
npm install
npm run dev        # http://localhost:3000
```

The app runs in **demo mode** with zero configuration — no API key needed. Demo mode uses deterministic local responses so the prototype is fully demonstrable in a client meeting.

## Using OpenRouter (recommended)

1. Create an API key at <https://openrouter.ai/keys> (add credits to your account).
2. Create a `.env` file in the project root (copy `.env.example`):

   ```bash
   OPENAI_BASE_URL=https://openrouter.ai/api/v1
   OPENAI_API_KEY=sk-or-v1-...        # your OpenRouter key
   OPENAI_MODEL=inclusionai/ling-3.1-flash
   AI_MODE=auto
   ```

3. Restart the dev server (`npm run dev`). The sidebar badge changes from "Demo mode" to "OpenAI-compatible (inclusionai/ling-3.1-flash)".

OpenRouter exposes an OpenAI-compatible API, so no code changes are required. Any model ID listed on OpenRouter works the same way (e.g. `openai/gpt-4o-mini`, `anthropic/claude-sonnet-4.6`).

> **Security:** never commit `.env` (it is gitignored). If a key was shared in chat or logs, rotate it at openrouter.ai/keys.

## Configuration

| Variable | Description | Default |
| --- | --- | --- |
| `OPENAI_API_KEY` | API key for the provider. Empty = demo mode. | — |
| `OPENAI_BASE_URL` | OpenAI-compatible endpoint base URL. | OpenAI official API |
| `OPENAI_MODEL` | Model ID to request. | `gpt-4o-mini` |
| `OPENAI_FALLBACK_MODELS` | Comma-separated models tried in order when the primary is rate-limited or unavailable (429/5xx). First working model wins. | — |
| `OPENAI_IMAGE_MODEL` | Model used for image generation. | `google/gemini-2.5-flash-image` |
| `AI_MODE` | `auto` (use provider when key present) or `demo` (force local responses). | `auto` |

**Fallback example (OpenRouter):** free models on OpenRouter run on shared, rate-limited pools. Configure a fallback chain so the demo stays responsive:

```
OPENAI_MODEL=inclusionai/ling-3.1-flash
OPENAI_FALLBACK_MODELS=nvidia/nemotron-3-super-120b-a12b:free,openai/gpt-4o-mini
```

The chat badge shows which model actually responded (e.g. "Live · nvidia/nemotron-3-super-120b-a12b:free").

**Image generation note:** OpenRouter requires at least $1.00 in account balance for image or video output. Word and Excel generation work with any text model. In demo mode, the Studio returns a clearly labeled placeholder.

## Deploying to Vercel

The app is Vercel-ready (Next.js App Router, Node runtime route handlers). Document Q&A is **stateless** — the client holds the document chunks and sends them with each question — so it works reliably across Vercel's ephemeral serverless instances.

1. Push the project to GitHub (do not commit `.env` — it is gitignored).
2. In Vercel: **Add New → Project → Import** the repository.
3. Add environment variables (**Settings → Environment Variables**):

   | Variable | Value |
   | --- | --- |
   | `OPENAI_BASE_URL` | `https://openrouter.ai/api/v1` |
   | `OPENAI_API_KEY` | your OpenRouter key |
   | `OPENAI_MODEL` | `inclusionai/ling-3.1-flash` |
   | `OPENAI_FALLBACK_MODELS` | `nvidia/nemotron-3-super-120b-a12b:free,openai/gpt-4o-mini` |
   | `OPENAI_IMAGE_MODEL` | `google/gemini-2.5-flash-image` |
   | `EMBEDDING_MODEL` | `openai/text-embedding-3-small` |
   | `AI_MODE` | `auto` |

4. Deploy. The app builds with `npm run build` (auto-detected).

**Vercel caveats:**
- Usage stats on the Dashboard are per-server-instance and reset frequently — cosmetic only.
- Vercel's Hobby tier limits request bodies to ~4.5 MB; the 3 MB document limit fits. If you hit the limit, lower `MAX_DOCUMENT_BYTES` in `src/lib/documents.ts`.
- For production, move the activity log to a database (Supabase/PostgreSQL).

Alternative: `npm i -g vercel && vercel` from the project root.

## RAG (Retrieval-Augmented Generation)

The Document Analyzer uses a real RAG pipeline for Q&A — and it is **model-agnostic**, so it works with your own model:

1. **Chunk** the document into overlapping sections (~1,200 chars)
2. **Embed** each chunk into a vector (OpenAI-compatible embeddings API)
3. **Retrieve** the top-5 most similar chunks per question (cosine similarity, in-memory vector store)
4. **Generate** an answer grounded strictly in the retrieved sections — if the answer is not there, the assistant says so

**Configuration** (embeddings reuse the chat provider by default):

| Variable | Description | Default |
| --- | --- | --- |
| `EMBEDDING_BASE_URL` | Embeddings endpoint (defaults to `OPENAI_BASE_URL`) | — |
| `EMBEDDING_API_KEY` | Embeddings key (defaults to `OPENAI_API_KEY`) | — |
| `EMBEDDING_MODEL` | Embedding model ID | `openai/text-embedding-3-small` on OpenRouter, `text-embedding-3-small` elsewhere |

**With your own local model (Ollama):** pull an embedding model (`ollama pull nomic-embed-text`) and point the config at it:

```
OPENAI_BASE_URL=http://localhost:11434/v1
OPENAI_API_KEY=ollama
OPENAI_MODEL=llama3.1
EMBEDDING_MODEL=nomic-embed-text
```

Both generation and retrieval then run fully on your machine. With no API key at all, the prototype falls back to offline hash-based embeddings (lexical similarity) so RAG still demonstrably works.

**Production path:** replace the in-memory vector store with pgvector (Supabase/PostgreSQL) for persistence and scale.

## Running fully offline / self-hosted models

The provider abstraction accepts any OpenAI-compatible endpoint, so you can run open models locally with **zero code changes** using [Ollama](https://ollama.com):

1. Install Ollama and pull a model: `ollama pull llama3.1` (or `gemma2`, `qwen2.5`, ...).
2. Set in `.env`:
   ```
   OPENAI_BASE_URL=http://localhost:11434/v1
   OPENAI_API_KEY=ollama
   OPENAI_MODEL=llama3.1
   AI_MODE=auto
   ```
3. Restart the server. All tools now run locally with no external API dependency.

Trade-offs vs. cloud APIs: local models need RAM (an 8B model needs ~8-16 GB), and quality is lower than frontier cloud models — but everything stays on your machine, which is useful for privacy-sensitive demos.

**Training your own model** is possible but usually unnecessary for a prototype:
- **Fine-tune a small open model** (LoRA) on your own data: ~$10-50 on a cloud GPU, needs hundreds to thousands of examples. Good for domain-specific tone/terminology.
- **Task-specific ML** (scikit-learn: classification, forecasting, clustering) on structured business data: trainable in minutes on a laptop, no GPU needed.
- **Training an LLM from scratch** costs millions of dollars and weeks of GPU time — not practical for a POC.

## Self-hosting your own model

The app calls any OpenAI-compatible endpoint, so "your own model" means an **always-on server with a public URL**. Hosting options:

| Provider | Type | Cost | Notes |
| --- | --- | --- | --- |
| [RunPod](https://runpod.io) | GPU cloud | ~$0.20-0.50/hr | Ollama templates, easiest GPU option |
| [Modal](https://modal.com) | Serverless GPU | pay-per-second | Scales to zero, good for variable load |
| [Cerebrium](https://cerebrium.ai) | Managed serving | usage-based | OpenAI-compatible API out of the box |
| VPS (Hetzner, DigitalOcean, Linode) | CPU VPS | $5-20/mo | Small quantized models (7B) only, slower |
| [Vast.ai](https://vast.ai) | GPU marketplace | ~$0.10-0.30/hr | Cheapest GPU, more manual setup |
| Own hardware | On-premise | electricity | Full privacy, you manage uptime |

**Recommended path (VPS + Ollama, cheapest):**
1. Create a VPS (e.g. Hetzner CX22, ~€4/mo, 8 GB RAM) or a GPU instance on RunPod.
2. Install Ollama: `curl -fsSL https://ollama.com/install.sh | sh`
3. Pull models: `ollama pull llama3.1` and `ollama pull nomic-embed-text` (for RAG embeddings).
4. Expose it securely: Ollama listens on localhost only and has **no built-in authentication** — put a reverse proxy (nginx/Caddy) with HTTPS and an API key in front.
5. Test: `curl https://your-domain.com/v1/models`
6. Point the app at it (Vercel env vars or local `.env`):
   ```
   OPENAI_BASE_URL=https://your-domain.com/v1
   OPENAI_API_KEY=your-proxy-secret
   OPENAI_MODEL=llama3.1
   EMBEDDING_MODEL=nomic-embed-text
   ```

**Security checklist:**
- Never expose Ollama's default port (11434) publicly without auth.
- Terminate TLS (HTTPS) at the proxy; restrict the firewall to the proxy port.
- Store the proxy API key in Vercel environment variables, never in code.

**Model sizing:**
- 7-8B models (llama3.1, gemma2): 8-16 GB RAM; runs on CPU but slowly.
- 13-34B models: GPU required (16-24 GB VRAM).
- 70B+: multi-GPU or a managed serving platform.

**Trade-offs vs. cloud APIs:** no per-token costs and full data privacy, but lower quality than frontier models and you manage uptime and scaling. For the client demo, cloud APIs (OpenRouter) remain the reliable choice; self-hosting makes sense once requirements are finalized.

## Project structure

```
src/
├── app/
│   ├── api/                    # Server-side API routes (secrets never leave here)
│   │   ├── chat/route.ts
│   │   ├── documents/analyze/route.ts
│   │   ├── documents/question/route.ts
│   │   ├── generate/route.ts
│   │   ├── insights/route.ts
│   │   └── activity/route.ts
│   ├── dashboard/page.tsx      # Overview, stats, recent activity
│   ├── chat/                   # Chat interface
│   ├── documents/              # Upload, analysis, Q&A
│   ├── generate/               # Content generation
│   └── insights/               # Data insights
├── components/
│   ├── layout/                 # Sidebar, AppLayout, PageHeader
│   └── ui/                     # Reusable primitives (Button, Card, Badge, ...)
└── lib/
    ├── ai/                     # LLMProvider interface + OpenAI + Demo implementations
    ├── documents.ts            # Text extraction (pdf-parse)
    ├── docStore.ts             # In-memory document cache (15-min TTL)
    ├── insights.ts             # CSV/JSON parsing + deterministic statistics
    ├── activity.ts             # In-memory activity log
    └── validators.ts           # Sanitization + rate limiting
public/samples/                 # Sample data for demonstrations
tests/                          # Unit tests (node:test via tsx)
```

## API reference

| Endpoint | Method | Body | Response |
| --- | --- | --- | --- |
| `/api/chat` | POST | `{ messages: [{role, content}] }` | `{ reply, provider, isDemo }` |
| `/api/documents/analyze` | POST | `{ filename, contentBase64 }` | `{ id, filename, wordCount, analysis: {summary, keyPoints, actionItems}, isDemo }` |
| `/api/documents/question` | POST | `{ id, question }` | `{ answer, filename, isDemo }` |
| `/api/generate` | POST | `{ contentType, topic, tone, length }` | `{ content, isDemo }` |
| `/api/insights` | POST | `{ data: "<csv or json text>" }` | `{ stats, observations, recommendations, isDemo }` |
| `/api/activity` | GET | — | `{ total, today, byTool, recent, provider }` |

Limits: chat messages ≤ 4,000 chars / ≤ 30 messages; documents ≤ 3 MB, PDF/TXT only; insights data ≤ 200 KB, ≤ 10,000 rows, ≤ 100 columns; 60 requests/minute per IP.

## Testing

```bash
npm test     # 10 unit tests: CSV/JSON parsing, statistics, validators, activity log
```

## Sample data

- `public/samples/sales_data.csv` — 12 rows of regional sales figures (Insights page → "Load sample CSV")
- `public/samples/marketing_data.json` — channel metrics in JSON format
- `public/samples/project_brief.txt` — sample document for the Document Analyzer (download, then upload)

## Known limitations

- **Prototype only.** Features are demonstrations of possible AI capabilities, not validated solutions.
- Usage statistics and the document cache are **in-memory** and reset on server restart.
- Demo-mode responses are deterministic templates, not LLM output.
- AI outputs may be inaccurate or hallucinated; document Q&A is grounded in the uploaded text, but other tools are not fact-checked.
- No authentication, persistence, or audit logging — all required for a production version.
- PDF extraction quality depends on the source document (scanned/image PDFs are not OCR'd).

## Suggested future improvements (production version)

1. **Persistence:** Supabase/PostgreSQL for conversation history, documents, and usage analytics.
2. **Authentication:** SSO/SSO-lite with per-user rate limits and data isolation.
3. **Streaming responses** (SSE) for chat and generation.
4. **Native provider SDKs** (Anthropic, Google) behind the same `LLMProvider` interface.
5. **OCR** for scanned PDFs (e.g. Tesseract) and chunked/vector retrieval for large documents.
6. **Observability:** structured logging, token/cost tracking per request, error monitoring.
7. **Content safety:** input/output moderation, PII redaction before storage.
8. **Deployment:** containerize and deploy to a PaaS with environment-based configuration.

## Cost notes

- Demo mode: $0 (no API calls).
- With OpenRouter: pay-per-token at the model's listed price; `inclusionai/ling-3.1-flash` is a low-cost model. A typical demo session (a few dozen requests) costs well under $1. Set spending limits in the OpenRouter dashboard.

## Free options

| What | Free tier | Notes |
| --- | --- | --- |
| **Vercel (hosting)** | Hobby plan | Free: serverless functions, 100 GB bandwidth/mo, ~125k function executions/mo. Hobby is for personal/non-commercial projects; commercial use needs Pro ($20/mo). |
| **OpenRouter (AI)** | Free models | Many models are free (e.g. `nvidia/nemotron-3-super-120b-a12b:free`). Set `OPENAI_MODEL` to a `:free` model for $0 inference. Free models run on shared, rate-limited pools — the fallback chain handles this. |
| **Demo mode** | $0 | No API key at all; deterministic local responses. |
| **Google Colab / Kaggle** | Free GPU hours | Can run Ollama for short demos, but sessions disconnect — not always-on, so not reliable for a hosted deployment. |

**Fully free demo setup:** Vercel Hobby + OpenRouter free models (or demo mode) = $0 total. For a client-facing production deployment, budget Vercel Pro ($20/mo) plus model costs.
