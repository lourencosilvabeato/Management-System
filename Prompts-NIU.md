# PROMPTS.md — Proposal Management System
# Feature Reference Guide for Claude Code

Read CLAUDE.md in full before starting any implementation.

---

## Checklist before starting a new session

- [ ] CLAUDE.md read in full
- [ ] `.env.local` filled (see Environment Variables section in CLAUDE.md)
- [ ] PostgreSQL running locally
- [ ] `OPENAI_API_KEY` set — required for AI estimates and image analysis
- [ ] `FIGMA_API_TOKEN` set — required for Figma frame reading (optional feature)
- [ ] GitHub repository: https://github.com/lourencosilvabeato-blip/Sistema-NIU
- [ ] `.gitignore` includes `.env.local`

---

## What is built — feature overview

### 1. Project scaffold
Next.js 15 + Payload CMS 3 + PostgreSQL + TypeScript strict mode.
Shadcn/UI + Tailwind CSS for the frontend.
TanStack Query for client-side state management.
Base layout: sidebar navigation, top header, main content area.

### 2. Payload collections
Six collections with full schema:
- **proposals** — central collection with all fields including sessaoOrcamentacao, activityLog, estado, estimativaEditada
- **users** — with role enum (account | criativo | producao | admin)
- **materials** — AI knowledge base (nome, referencia, unidade, custoMedio)
- **machines** — machine inventory (nome, tipo, descricao, disponivel)
- **internalRates** — hourly cost per profile (perfil, departamento, custoHora)
- **projectLibrary** — historical projects for AI benchmarking

Access control is role-based per section (see CLAUDE.md for the access matrix).

### 3. Payload hooks
**beforeChange/validateTransition.ts** — state machine enforcement:
- Validates that transitions follow the allowed graph (see CLAUDE.md state machine)
- Rejects invalid transitions before saving
- Requires `motivoPerda` when marking as Perdida
- Requires `estadoCriativo = 'Aprovado'` before transitioning to EmOrcamentacao
- Auto-generates proposal number (PROP-YYYY-NNN) on creation

**afterChange/generateEstimate.ts** — AI trigger:
- Detects transition to EmOrcamentacao
- Re-fetches proposal with `depth: 2` to get populated Media objects (maquetes, ficheirosAnexos)
- Creates a new sessaoOrcamentacao with unique uuid
- Fires `generateInitialEstimate` as fire-and-forget (does not block the response)

**afterChange/logActivity.ts** — append-only activity log on every save.

### 4. API endpoints
**POST /api/proposals/[id]/transition** — state transitions with validation, triggers AI on EmOrcamentacao.

**POST /api/proposals/[id]/chat** — iterative AI refinement:
- Appends user message to conversaIA
- Resends full conversation history to GPT-4o
- Returns updated estimativaAtual

**POST /api/proposals/[id]/estimate/accept** — accepts current estimate:
- Saves to estimativaEditada
- Calculates margemCalculada if valorVendaFinal is set

### 5. AI engine

#### Image analysis — `src/lib/ai/openaiClient.ts`
GPT-4o Vision. Receives base64-encoded images. Returns Portuguese description of visible dimensions, materials, structural elements.
Settings: `temperature: 0`, `seed: 42`.

#### Estimate generation — `src/lib/ai/claudeClient.ts`
GPT-4o text. Receives full context prompt. Returns structured JSON estimate.
Settings: `temperature: 0`, `seed: 42` — deterministic output, ~2% variance is OpenAI infrastructure-level.

#### Document reading — `src/lib/ai/readAttachments.ts`
- PDFs: extracted via pdf-parse v2 (PDFParse class API)
- Images: passed to GPT-4o Vision
- Called for `ficheirosAnexos` on proposals

#### Figma reading — `src/lib/figma.ts`
- Parses Figma URL (supports `/file/` and `/design/` formats)
- Calls Figma REST API to export frames as PNG (`/v1/images/{fileKey}`)
- Extracts all text nodes recursively from the file JSON
- Passes PNGs to GPT-4o Vision
- Requires `FIGMA_API_TOKEN` in `.env.local` — silently skips if not set

#### Prompt assembly — `src/lib/ai/buildPrompt.ts`
Assembles the user message for GPT-4o from all sources:
- Briefing + creative memory (rich text → plain text via lexicalToText)
- Maquetes description (from GPT-4o Vision)
- Attachment text and images
- Figma text annotations and visual analysis
- Knowledge base: materials, machines, internal rates, historical projects
- Preamble with sources checklist + 10-point mandatory self-audit checklist

#### System prompt — `src/lib/ai/prompts/estimateSystem.ts`
The AI reasoning instructions. Key rules enforced:
- PT-PT Portuguese only
- 2-step extraction: list all physical elements first, then budget each one
- Full production chain for every element (a→f): materials → fabrication + operator → bench work → transport → assembly → disassembly → external equipment rental
- Always include labour even if not in internal rates (estimate from market knowledge)
- Golden rule: no material exists in vacuum — every item needs operator + installer
- Most common omissions checklist: screens, lighting, print operators, transport, disassembly
- Dynamic grouping (no fixed categories)
- Confidence level based on price accuracy, not information completeness
- Returns pure JSON only — no prose, no markdown

#### Full generation flow
1. afterChange detects transition to EmOrcamentacao
2. Re-fetches proposal with depth:2
3. Creates new sessaoOrcamentacao
4. Downloads maquetes from storage → base64
5. GPT-4o Vision → image description
6. readAttachments → PDF text + attachment image description
7. analyzeFigmaLink → Figma frame images + text annotations
8. buildPrompt → assembles full user message
9. GPT-4o text (claudeClient) → JSON estimate
10. parseEstimate → validates + saves to session
11. activityLog: "AI estimate generated — confidence: [level]"

### 6. Proposals UI

#### Page A01 — `/propostas` (proposals list)
- ProposalKPIs: 4 stat cards (total, active, ganha %, média prazo)
- ProposalFilters: search by name/client + estado dropdown (in Portuguese)
- ProposalTable: sortable table with estado badge, client, date, prazo

#### Page A02 — `/propostas/[id]` (proposal detail)
Four tabs:
- **Dados Base** — read-only summary of base fields
- **Criativa** — creative memory editor + maquetes upload
- **Orçamentação** — estimate editor + AI chat
- **Colaboração** — comments + activity log

**StateSelector** — estado transition button with:
- Confirmation dialog before transition
- Pre-check for estadoCriativo before going to EmOrcamentacao (shows dialog if not Aprovado)
- LossModal for Perdida (requires motivoPerda)
- All errors shown as proper Dialogs, never raw alerts

**EstimateEditor** — displays current estimate as editable table:
- Groups with rubricas, quantities, unit costs
- Totals per group and grand total
- Accept button saves to estimativaEditada

**EstimateChat** — iterative refinement with GPT-4o:
- Chat history rendered as conversation bubbles
- Input for user adjustments
- Streams response and updates estimate table live

### 7. UI theme
Light professional theme: warm white background, electric orange accent (#FF5800 / #FF6B00).
Font: Montserrat (headings) + Inter (body). Base font 21px.
Section cards with subtle shadow. Orange gradient header.

### 8. Seed data
`src/seed.ts` — creates test data:
- 1 admin user + 1 account user
- Sample materials, machines, internal rates
- 2–3 sample proposals at different states

---

## How to extend the system

### Adding a new collection
1. Create `src/collections/NewCollection.ts` following existing patterns
2. Register it in `src/payload.config.ts`
3. Run `npm run generate:types` to update `payload-types.ts`
4. Add access control matching the role matrix in CLAUDE.md

### Adding a new AI input source
1. Create extractor function in `src/lib/ai/`
2. Add result field to `PromptExtras` in `buildPrompt.ts`
3. Add section rendering in `buildPrompt.ts`
4. Call extractor in `generateEstimateForProposal.ts` (parallel with other sources)

### Adding a new state transition
1. Update the state machine map in `src/hooks/beforeChange/validateTransition.ts`
2. Add UI button/dialog in `StateSelector.tsx`
3. Update CLAUDE.md state machine diagram

---

## Known limitations (prototype scope)

- R2 not yet configured — files stored locally in development. Set Cloudflare R2 env vars to enable cloud storage.
- Email (Resend) not wired to UI triggers — implemented but not called automatically.
- Production Module is out of scope — no OTs, OCs, tasks by department.
- No export (PDF/Excel), no Kanban view, no reporting dashboards.
- Client is free text — no client database.
- Figma integration requires a Personal Access Token (`FIGMA_API_TOKEN`) — free tier works.

---

## Environment variables

```
DATABASE_URI                — PostgreSQL connection string
PAYLOAD_SECRET              — Payload secret (minimum 32 characters)
OPENAI_API_KEY              — GPT-4o (text + vision) — required for AI
FIGMA_API_TOKEN             — Figma Personal Access Token — optional
CLOUDFLARE_R2_BUCKET        — R2 bucket name
CLOUDFLARE_R2_ACCESS_KEY    — R2 access key
CLOUDFLARE_R2_SECRET_KEY    — R2 secret key
CLOUDFLARE_R2_ENDPOINT      — https://xxx.r2.cloudflarestorage.com
RESEND_API_KEY              — Resend (optional in prototype)
NEXT_PUBLIC_SERVER_URL      — http://localhost:3000 in development
```
