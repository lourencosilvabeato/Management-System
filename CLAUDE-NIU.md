# CLAUDE.md — Proposal Management System

This file is the source of truth for Claude Code.
Read it in full before any implementation.
If there is a conflict between this file and any other instruction, this file takes precedence.

---

## Project context

The agency is a physical asset production agency — stands, totems, signage, event installations.
The budgeting process is done manually and in isolation, without input from the production team.

This system digitises the full commercial cycle and uses AI to assist budgeting.
The focus is the Commercial Module. The Production Module is out of scope for this prototype.

GitHub repository: https://github.com/lourencosilvabeato-blip/Sistema-NIU
Project management: <your-project-management-tool>

---

## Branch structure

```
main          — docs only: .gitignore, CLAUDE.md, PROMPTS.md. Never contains code.
dev           — integration branch. All feature branches are merged here.
feature/...   — one branch per feature. Created from dev, merged back into dev when complete.
```

Branch naming: `feature/short-description`
Examples:
- `feature/scaffold`
- `feature/collections`
- `feature/ai-estimate`
- `feature/ui-redesign`

## Git rule — automatic after every change

After every feature is successfully implemented, without exception, commit and push to the feature branch.
Do this automatically — do not wait to be asked.

Required sequence after each completed step:

```
# At the start of each feature — create feature branch from dev
git checkout dev
git pull origin dev
git checkout -b feature/short-description

# After implementation is complete — commit and push feature branch
git add .
git commit -m "brief description of what was implemented"
git push origin feature/short-description

# Merge into dev
git checkout dev
git merge feature/short-description
git push origin dev
```

Commit message examples:
- "Project scaffold — Next.js + Payload + dependencies"
- "Payload collections — full schema with access control"
- "beforeChange hooks — transition validation and numbering"
- "AI library — GPT-4o client, buildPrompt, estimate generation"

Never accumulate changes from multiple features in a single commit.
Never push code to main — main is docs only.
Never push without the current step's checks passing.
The .env.local file must never go to the repository — confirm it is in .gitignore before the first push.


---

## AI integration — live with OpenAI

Both AI functions use OpenAI GPT-4o with `temperature: 0.2`.
Anthropic SDK is not used — do not introduce it.

- `src/lib/ai/claudeClient.ts` — GPT-4o for estimate generation (text)
- `src/lib/ai/openaiClient.ts` — GPT-4o Vision for image analysis (maquetes, ficheiros, Figma frames)

OPENAI_API_KEY must be set in `.env.local`. ANTHROPIC_API_KEY is unused — leave it blank.

---

## Tech stack — no exceptions

- **Framework:** Next.js 15 with App Router and strict TypeScript
- **CMS / Backend:** Payload CMS 3 — runs inside Next.js, not a separate server
- **Database:** PostgreSQL — managed by Payload, never manipulated directly
- **Files:** Cloudflare R2 — via official Payload plugin (@payloadcms/storage-s3) — not yet configured, files stored locally in development
- **AI — all:** OpenAI GPT-4o (text + vision) via official OpenAI SDK
- **UI:** Shadcn/UI + Tailwind CSS
- **Server state:** TanStack Query (react-query) for cache and refetch in the browser
- **Email:** Resend with React Email for templates
- **Auth:** Payload built-in (email + password for the prototype)

Do not introduce technologies outside this list without explicit justification.
Do not use tRPC — the Payload Local API replaces that need.
Do not use Prisma — Payload manages the schema and migrations.
Do not use Redis or BullMQ — the volume does not justify it in the prototype.

---

## General architecture

Payload 3 runs inside Next.js as a set of Route Handlers.
In a Server Component or Route Handler you can call the Payload Local API directly — no HTTP, no internal fetch.
REST fetch is only used in the browser (Client Components via TanStack Query).

```
Browser (Client Components)
    ↕ REST fetch /api/...
Next.js Route Handlers + Server Components
    ↕ Payload Local API (no HTTP)
Payload Collections + Hooks
    ↕ Payload DB Adapter
PostgreSQL
```

---

## Development principles — no exceptions

- Strict TypeScript — no any, no ts-ignore
- Never manipulate PostgreSQL directly — everything via Payload Local API
- Never call the Payload REST API from Server Components — use Local API
- Client Components use TanStack Query for all server calls
- All API errors are handled — never leave silent errors
- activityLog is always append-only — never update or delete existing entries
- Environment variables always via process.env — never hardcoded
- The Claude system prompt lives in src/lib/ai/prompts/estimateSystem.ts — never inline in code
- .env.local must never go to git — verify .gitignore before the first commit

---

## Collections — full schema

### proposals
The central collection. Contains everything related to a proposal.

Required fields: numero (auto-generated), nomeProjeto, cliente, account (rel → users), briefing, estado
Optional fields: contactoNome, contactoEmail, contactoTelefone, prazoResposta, figmaLink
Upload fields: ficheirosAnexos (JPG/PNG/PDF → R2), maquetes (JPG/PNG/PDF → R2)
Rich text fields: briefing, memoriacriativa

Field estado — enum with exact values:
Recebida | EmElaboracao | EmOrcamentacao | Enviada | Ganha | Perdida

Field motivoPerda — enum required if estado = Perdida:
Preco | Concorrencia | Prazo | ProjetoCancelado | ForaAmbito | SemResposta | Outro

Field detalhePerda: free text, optional

Field estadoCriativo — enum:
Rascunho | EmRevisao | Aprovado

Field sessaoOrcamentacao: array of objects.
Each session contains:
  id (uuid), conversaIA (array of {role, content, timestamp}),
  estimativaAtual (json — structure defined below), abordagemTecnica (text),
  nivelConfianca (enum Alto|Medio|Baixo), nivelConfiancaJustificacao (text),
  inputsUsados (snapshot: briefing, memoriacriativa, maquetesIds, timestamp)
Each time the proposal advances to EmOrcamentacao, a new session is created.
The history of previous sessions is kept — never deleted.

Field estimativaEditada: json — version accepted and manually edited by the user
Field valorVendaFinal: number (EUR)
Field margemCalculada: number (percentage — calculated automatically)
Field condicoesPagamento: text
Field validadeProposta: date

Field comentarios: array of {autor (rel→users), texto, timestamp}
Field activityLog: array of {evento (text), user (rel→users), timestamp} — immutable, append-only

### users
Fields: nome, email, password (managed by Payload), role
Role enum: account | criativo | producao | admin

Access rules by role:
- account: sees all proposals; creates and edits base and commercial fields; state transitions allowed
- criativo: sees only assigned proposals; writes only creative zone (memoriacriativa, maquetes, estadoCriativo)
- producao: sees all proposals; writes commercial/budgeting zone; cannot create proposals
- admin: full access; manages knowledge base collections

### materials
AI knowledge base — managed by admin in Payload admin UI.
Fields: nome, referencia, unidade, custoMedio (number), notas, ativo (boolean)
Examples: "Lona frontlit" / "m²" / 8.50 | "Perfil alumínio octanorm" / "m linear" / 45.00

### machines
Inventory of machines available at the agency.
Fields: nome, tipo, descricao, disponivel (boolean)
Examples: "Fresa CNC" | "Plotter de corte vinyl" | "Impressora UV"

### internalRates
Hourly cost per internal profile.
Fields: perfil, departamento, custoHora (number)
Examples: "Montador" / "Produção" / 35.00 | "Designer" / "Criativo" / 55.00

### projectLibrary
History of past projects for AI benchmarking.
Fields: nome, tipo, ano, descricao, estruturaCustos (json), notas

---

## State machine — exact rules

```
Recebida        → EmElaboracao                    (account)
EmElaboracao    → EmOrcamentacao                  (account, criativo)
EmElaboracao    → Recebida          [regression]  (account)
EmOrcamentacao  → Enviada                         (account, producao)
EmOrcamentacao  → EmElaboracao      [regression]  (account)
Enviada         → Ganha                           (account)
Enviada         → Perdida                         (account — requires motivoPerda)
Enviada         → EmOrcamentacao    [regression]  (account)
Ganha           → (none — terminal state)
Perdida         → (none — terminal state)
```

Each transition is recorded in activityLog: event, user, timestamp.
Validation happens in a beforeChange hook — rejects invalid transitions before saving.

---

## Proposal numbering

Format: PROP-YYYY-NNN
Examples: PROP-2026-001, PROP-2026-002, PROP-2027-001
Year is the current year at creation time.
NNN is sequential per year with 3-digit zero-padding.
Auto-generated in a beforeChange hook — never editable by the user.

---

## AI engine — full architecture

### The two models and their roles

GPT-4o Vision: receives mockup images (base64).
Returns text description — apparent dimensions, visible materials, structural elements, colours.
Does not generate budgets. Only transforms images into text.

Claude (claude-sonnet-4-20250514): receives all context as text and generates the budget.
Inputs: briefing + creative memory + image description (from GPT-4o) + materials + machines + rates.
Output: structured JSON as per schema below.

### Claude JSON output schema

```json
{
  "abordagem_tecnica": "string",
  "nivel_confianca": {
    "nivel": "Alto | Médio | Baixo",
    "justificacao": "string"
  },
  "estimativa": {
    "items": [
      {
        "nome": "string",
        "rubricas": [
          {
            "descricao": "string",
            "quantidade": 0,
            "unidade": "string",
            "custo_unitario": 0,
            "custo_total": 0
          }
        ],
        "total_item": 0
      }
    ],
    "total_geral": 0
  }
}
```

Claude returns ONLY the JSON — no text before, no markdown, no backticks.
If parse fails, retry once with a re-prompt. If it fails again, return an error to the user.

### Iterative chat

The budgeting session is a Claude conversation with persistent history.
History is stored in conversaIA of the active session in the proposal.

First generation: buildPrompt builds initial message → sends to Claude → saves to conversaIA.
Follow-up: user writes message → appends to conversaIA → resends full history to Claude.
Claude responds with updated JSON → replaces estimativaAtual in the session.
History is never truncated within a session.
A new session starts from scratch when the proposal re-enters EmOrcamentacao.

### Generation flow — step by step

1. afterChange hook detects transition to EmOrcamentacao
2. Creates new sessaoOrcamentacao with unique uuid
3. Fetches from DB: materials (ativo=true), machines (disponivel=true), internalRates
4. Downloads mockups from R2 → converts to base64
5. If there are mockups: calls GPT-4o Vision → gets text description
6. Builds initial message via buildPrompt
7. Calls Claude with system prompt + initial message
8. Parses returned JSON
9. Saves to session: conversaIA, estimativaAtual, abordagemTecnica, nivelConfianca
10. activityLog: "AI estimate generated — confidence: [level]"

### AI error handling

- Timeout (45 seconds): cancels request, saves error to session, notifies frontend
- Invalid JSON: retries once with re-prompt. If it fails again, returns error to user
- GPT-4o fails: continues without images, notes in prompt that images are unavailable
- Empty knowledge base: continues with warning — confidence level forced to Baixo

---

## Custom endpoints

Next.js Route Handlers in src/app/api/.
Always use Payload Local API — never fetch to /api/payload/...

### POST /api/proposals/[id]/transition
Body: { novoEstado, motivoPerda?, detalhePerda? }
Validates role and transition. If Perdida: requires motivoPerda. If EmOrcamentacao: triggers estimate generation.
Records in activityLog. Returns updated proposal.

### POST /api/proposals/[id]/chat
Body: { mensagem: string }
Validates that estado is EmOrcamentacao and active session exists.
Appends to conversaIA, calls Claude with full history, updates estimativaAtual.
Returns: { estimativaAtual, abordagemTecnica, nivelConfianca, nivelConfiancaJustificacao, conversaIA }

### POST /api/proposals/[id]/estimate/accept
Body: { estimativaEditada: json }
Validates estado (EmOrcamentacao or Enviada) and JSON structure.
Calculates totalGeral and margemCalculada if valorVendaFinal is set.
Records in activityLog. Returns updated proposal.

---

## Payload hooks

### beforeChange on proposals
- operation = create: generates numero in PROP-YYYY-NNN format
- estado changing: validates transition is allowed for the user's role
- new estado = Perdida without motivoPerda: rejects
- new estado = terminal when previous was already terminal: rejects

### afterChange on proposals
- estado changed to EmOrcamentacao: calls generateEstimate (fire-and-forget, does not block)
- always: calls logActivity to record in activityLog

### activityLog
Append-only. Any attempt to modify or delete existing entries is rejected.

---

## Access rules by proposal section

| Section          | Account           | Criativo          | Producao          | Admin |
|------------------|-------------------|-------------------|-------------------|-------|
| Base Data        | read + write      | read              | read              | full  |
| Creative Zone    | read              | read + write      | read              | full  |
| Budgeting        | read + write      | no access         | read + write      | full  |
| Collaboration    | read + write      | read + write      | read + write      | full  |
| Activity Log     | read              | read              | read              | full  |

---

## Business rules

- The proposal numero is never editable after creation
- activityLog is append-only — never update or delete
- States Ganha and Perdida are irreversible
- motivoPerda is required when marking as Perdida
- The AI estimate is always a suggestion — the user can edit any field
- margemCalculada = (valorVendaFinal - totalCustos) / valorVendaFinal × 100
- Each state change to EmOrcamentacao creates a new session — never reuses the previous one
- figmaLink is sent as text in the prompt — no Figma API integration

---

## Folder structure

```
src/
  app/
    (frontend)/
      propostas/
        page.tsx                        — A01: Proposals List
        [id]/page.tsx                   — A02: Proposal Detail
    api/
      proposals/[id]/
        transition/route.ts
        chat/route.ts
        estimate/accept/route.ts
    (payload)/admin/[[...segments]]/    — Payload admin UI (automatic)
  collections/
    Proposals.ts
    Users.ts
    Materials.ts
    Machines.ts
    InternalRates.ts
    ProjectLibrary.ts
  hooks/
    beforeChange/
      validateTransition.ts
      generateProposalNumber.ts
    afterChange/
      generateEstimate.ts
      logActivity.ts
  lib/
    ai/
      claudeClient.ts
      openaiClient.ts
      buildPrompt.ts
      parseEstimate.ts
      analyzeImages.ts
      generateEstimateForProposal.ts
      prompts/
        estimateSystem.ts              — agent system prompt
    r2.ts
    resend.ts
  components/
    proposals/
      ProposalTable.tsx
      ProposalFilters.tsx
      ProposalKPIs.tsx
      ProposalDrawer.tsx
      StateSelector.tsx
      LossModal.tsx
      ActivityLog.tsx
      EstimateEditor.tsx
      EstimateChat.tsx
      tabs/
        TabDadosBase.tsx
        TabCriativa.tsx
        TabOrcamentacao.tsx
        TabColaboracao.tsx
  payload.config.ts
  seed.ts
```

---

## Environment variables

```
DATABASE_URI                — PostgreSQL connection string
PAYLOAD_SECRET              — Payload secret (minimum 32 characters)
ANTHROPIC_API_KEY           — Claude API
OPENAI_API_KEY              — GPT-4o Vision
CLOUDFLARE_R2_BUCKET        — R2 bucket name
CLOUDFLARE_R2_ACCESS_KEY    — R2 access key
CLOUDFLARE_R2_SECRET_KEY    — R2 secret key
CLOUDFLARE_R2_ENDPOINT      — https://xxx.r2.cloudflarestorage.com
RESEND_API_KEY              — Resend (optional in prototype)
NEXT_PUBLIC_SERVER_URL      — http://localhost:3000 in development
```

---

## Out of scope for this prototype

- Production Module (OTs, OCs, OFs, tasks by department)
- Discord integration (replaced by in-app chat)
- Automatic project creation trigger when marking as Ganha
- List export to Excel/PDF
- Kanban view of the proposals list
- Reporting dashboards and commercial KPIs
- Client database management (client is free text in the prototype)
