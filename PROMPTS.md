# Prompt Library — NIU System
# Claude Code — use in order, one at a time

Read CLAUDE.md in full before starting.
Execute prompts in order. Do not skip steps.
Git commits and pushes are handled automatically by Claude Code as defined in CLAUDE.md.

---

## Checklist before starting

- [ ] CLAUDE.md read in full
- [ ] .env.local filled with all variables
- [ ] PostgreSQL running locally (Docker or local install)
- [ ] API access confirmed: Anthropic, OpenAI, Cloudflare R2
- [ ] GitHub repository cloned: https://github.com/lourencosilvabeato-blip/Sistema-NIU
- [ ] .gitignore includes .env.local before first commit

---

## PROMPT 01 — Project scaffold

### Context
Starting the project from scratch. This step creates the base structure.

### What to do

Create a Payload CMS 3 project with Next.js 15 using the official Payload CLI.
Project name: gestao-propostas.
Use TypeScript, PostgreSQL and the blank template.

After the base scaffold, install the following additional dependencies:
- @anthropic-ai/sdk — official Anthropic client for Claude
- openai — official OpenAI client for GPT-4o Vision
- @payloadcms/storage-s3 — Payload plugin for Cloudflare R2 (S3-compatible)
- @tanstack/react-query and @tanstack/react-query-devtools
- resend and @react-email/components
- uuid — unique identifier generation for budgeting sessions

Initialise Shadcn/UI: npx shadcn init
Add components: table, sheet, badge, button, input, select, textarea, tabs, dialog, dropdown-menu, separator, avatar, scroll-area

Create the empty folder structure as defined in CLAUDE.md (section "Folder structure").
Do not create code files yet — only the directories.

Create .env.local with all variables listed in CLAUDE.md, with empty values and explanatory comments.
Confirm .env.local is in .gitignore.

Initialise the git repository and make the first commit:
```
git init
git remote add origin https://github.com/lourencosilvabeato-blip/Sistema-NIU.git
git add .
git commit -m "[Prompt 01] Project scaffold — Next.js + Payload + dependencies"
git push -u origin main
```

### Verification
npm run dev starts without errors.
Payload admin UI is accessible at /admin.

---

## PROMPT 02 — Payload collections

### Context
The schema is the foundation of everything. Errors here propagate to the rest of the system.
Read the "Collections — full schema" section of CLAUDE.md before starting.

### What to do

Implement all collections in src/collections/ and register them in payload.config.ts.

#### Users
Use Payload's built-in authentication system.
Field role: select with the exact options from CLAUDE.md.
Access control: users can only see their own profile except Admin.

#### Proposals
Most complex collection. Implement all fields from CLAUDE.md.
Field estado: select with default value Recebida.
Field sessaoOrcamentacao: array field. Each session has the sub-fields described in CLAUDE.md.
conversaIA inside each session is also an array of {role, content, timestamp}.
estimativaAtual is a json field.
ficheirosAnexos and maquetes: upload fields linked to the media collection.
Configure @payloadcms/storage-s3 plugin in payload.config.ts so uploads go to R2.
Use CLOUDFLARE_R2_ENDPOINT (different from the standard AWS S3 endpoint).
Access control per field as per the access table in CLAUDE.md:
  - criativo can only write creative zone fields
  - account cannot write creative zone (read only)
  - activityLog is read-only for all — writes done only by hooks

#### Materials, Machines, InternalRates, ProjectLibrary
Simple collections. Only admin has write access. All authenticated roles have read access.

### Migration
```
npm run payload migrate:create -- --name init
npm run payload migrate
```

### Verification
Payload admin UI shows all collections with correct fields.
You can create users, materials, machines and rates via the admin UI.

---

## PROMPT 03 — beforeChange hooks

### Context
beforeChange hooks run before saving to the database.
They are the validation and automatic data generation layer.
Read the "Payload hooks" and "State machine" sections of CLAUDE.md.

### Files to create
src/hooks/beforeChange/generateProposalNumber.ts
src/hooks/beforeChange/validateTransition.ts

Register both in hooks.beforeChange of the Proposals collection.

### generateProposalNumber
Runs only on operation = create.
Format: PROP-YYYY-NNN where YYYY is the current year.
To generate NNN: query proposals collection, find last proposal for current year, order by createdAt desc, limit 1.
Extract NNN and increment. If no proposal exists for the year, start at 001.
NNN always has 3 digits with zero-padding.
If numero already exists in the document (edit operation), do nothing.

### validateTransition
Runs on operation = update when the estado field is changing.
If estado has not changed, do nothing.

Validations in this order:
1. Previous estado is Ganha or Perdida → reject. Message: "This proposal is in a terminal state and cannot be changed."
2. Transition previousEstado → newEstado is not in the CLAUDE.md state machine table → reject with clear message
3. User's role does not have permission for this transition → reject with authorisation error
4. newEstado = Perdida and motivoPerda is empty → reject

Use the correct Payload 3 method to throw validation errors that the frontend can display.

---

## PROMPT 04 — afterChange hooks

### Context
afterChange hooks run after saving to the database.
Responsible for side effects: logging and AI trigger.
Read the "Payload hooks" section of CLAUDE.md.

### Files to create
src/hooks/afterChange/logActivity.ts
src/hooks/afterChange/generateEstimate.ts

Register both in afterChange of the Proposals collection. Order matters: logActivity first, then generateEstimate.

### logActivity
Runs on all updates and creates.
Compare doc with previousDoc and record relevant events in activityLog:
- Creation: "Proposal created"
- State change: "State changed from X to Y"
- Mockup upload: "Mockup added: [filename]"
- Attachment upload: "File attached: [filename]"
- estadoCriativo change: "Creative status changed to X"
- Comment added: "Comment added by [username]"
Each entry: evento (text), user (id), timestamp (ISO string).
Use req.payload.update with the option to not re-trigger hooks — avoids infinite loop.
Check Payload 3 documentation for the correct way to suppress hook re-triggering.

### generateEstimate
Runs only when doc.estado === 'EmOrcamentacao' and previousDoc?.estado !== 'EmOrcamentacao'.
Fire-and-forget — does not block the response to the user.
What it does:
1. Creates new sessaoOrcamentacao entry with new uuid
2. Calls generateEstimateForProposal (TODO — implemented in Prompt 05)
3. Updates proposal with estimate results
4. Records in activityLog: "AI estimate generated — confidence: [level]"
5. On error: records in activityLog: "Estimate generation failed: [message]"
Use try/catch so AI errors do not crash the hook.
generateEstimateForProposal does not exist yet — create the hook with a TODO comment.

---

## PROMPT 05 — AI library

### Context
The technical core of the system. Integration with Claude and GPT-4o.
Read the "AI engine" section of CLAUDE.md before starting.
The system prompt does not exist yet — will be created in Prompt 06. Use a placeholder for now.

### Files to create
src/lib/ai/claudeClient.ts
src/lib/ai/openaiClient.ts
src/lib/ai/analyzeImages.ts
src/lib/ai/buildPrompt.ts
src/lib/ai/parseEstimate.ts
src/lib/ai/generateEstimateForProposal.ts

### claudeClient.ts
Singleton instance of the Anthropic SDK. Uses ANTHROPIC_API_KEY. Just the configured client.

### openaiClient.ts
Singleton instance of the OpenAI SDK. Uses OPENAI_API_KEY. Just the configured client.

### analyzeImages.ts
Function analyzeImages(imageUrls: string[]): Promise<string>
Downloads each image from R2, converts to base64.
Calls GPT-4o Vision with all images in a single call.
Prompt to GPT-4o: requests description of apparent dimensions, visible materials, structural elements, colours, count of distinct components.
Returns a text string with the consolidated description of all images.
If image download fails: logs warning, continues with remaining images.
If GPT-4o fails completely: returns empty string, does not throw — caller decides what to do.

### buildPrompt.ts
Function buildInitialPrompt(proposal, knowledgeBase): string
Serialises materials, machines, rates into structured, readable text.
Combines briefing + memoriacriativa + figmaLink + image description + knowledge base.
One section per input type with clear headings.
If memoriacriativa is empty: include "No creative memory provided."
If no images: include "No mockups available."
If figmaLink is set: include "Visual reference link: [url]"
Does not include the system prompt — that is passed separately.

### parseEstimate.ts
Function parseEstimate(response: string): EstimateOutput
Attempts JSON.parse. If it fails, cleans artefacts (backticks, prefixes) and tries again.
Validates expected structure (abordagem_tecnica, nivel_confianca, estimativa with items and rubricas).
If invalid after cleaning: throws descriptive error.
If valid: returns typed object.

### generateEstimateForProposal.ts
Exports two functions:

generateInitialEstimate(proposalDoc, payload)
1. payload.find: materials(ativo=true), machines(disponivel=true), internalRates, projectLibrary
2. Mockup URLs → analyzeImages
3. buildInitialPrompt with all data
4. Imports ESTIMATE_SYSTEM_PROMPT from src/lib/ai/prompts/estimateSystem.ts (placeholder for now)
5. Calls Claude: model=claude-sonnet-4-20250514, max_tokens=4096, timeout=45000ms
6. parseEstimate on the response
7. Returns: { conversaIA, estimativaAtual, abordagemTecnica, nivelConfianca, nivelConfiancaJustificacao, inputsUsados }

continueConversation(proposalDoc, sessaoId, newMessage, payload)
1. Finds active session by sessaoId
2. Rebuilds message history from sessao.conversaIA
3. Appends newMessage as { role: 'user', content: newMessage }
4. Calls Claude with full history and system prompt
5. parseEstimate on the response
6. Returns: { newConversationEntry, estimativaAtual, abordagemTecnica, nivelConfianca }

---

## PROMPT 06 — Agent system prompt

### Context
The system prompt is the most critical element for estimate quality.
Read the "Prompt do agente" section of A03 in Confluence and the "AI engine" section of CLAUDE.md.

### File to create
src/lib/ai/prompts/estimateSystem.ts
Exports the constant ESTIMATE_SYSTEM_PROMPT of type string.

### What the system prompt must contain (written in European Portuguese)

Role and context:
The agent is a specialist in budgeting and production of physical assets for events and communication.
The company is called Niu. It produces stands, totems, signage, event installations.
Niu's materials, machines and rates are provided in each message.

What it produces in each response (always all three):
1. Technical approach — how to execute, which materials and techniques, work sequence
2. Cost estimate — structured in items and rubricas as per CLAUDE.md schema
3. Confidence level — Alto/Médio/Baixo with mandatory justification

Rules always:
- Only use materials listed in the knowledge base provided in the message. Do not suggest materials Niu does not use.
- Only use machines from the provided inventory.
- When information is insufficient, reflect that in the confidence level and explain.
- "I don't know" and "insufficient information" are valid responses — preferable to inventing data.
- Never invent dimensions, quantities or prices without basis in the inputs.
- In follow-ups: maintain coherence with previous responses. Update all totals when revising the estimate.

Output format — absolute rule:
Always respond with pure JSON. No text before. No text after. No markdown. No backticks.
Schema exactly as defined in CLAUDE.md.
If the user asks a question that does not require updating the estimate:
still respond with complete JSON — put the explanation in abordagem_tecnica, keep previous estimate unchanged.

Confidence level criteria:
Alto: detailed briefing, creative memory with dimensions, mockups available, similar project in library.
Médio: reasonable briefing without exact dimensions, or missing mockups, or uncertain materials.
Baixo: vague briefing, no creative memory, no mockups, or unusual request.
Justification must be specific — never generic.

---

## PROMPT 07 — Custom endpoints

### Context
Next.js Route Handlers in src/app/api/.
Always use Payload Local API — never fetch to /api/payload/...
Read the "Custom endpoints" section of CLAUDE.md.

### Common pattern for all endpoints
- Verify authentication via Payload
- Appropriate HTTP status codes: 400 validation, 401 auth, 403 authorisation, 404 not found, 500 internal
- Always return JSON with descriptive error field on error
- Comprehensive try/catch
- Use getPayload() and Payload Local API

### transition/route.ts — POST
Body: { novoEstado, motivoPerda?, detalhePerda? }
1. Fetch proposal by id. If not found → 404
2. Build update object with novoEstado and optional fields
3. Call payload.update — the beforeChange hook handles validation
4. If the hook rejects, catch the error and return with appropriate status
5. Return updated proposal with 200

### chat/route.ts — POST
Body: { mensagem: string }
1. Fetch proposal. Verify estado = EmOrcamentacao → if not, 400
2. Find active session (last in sessaoOrcamentacao array) → if none, 400
3. Call continueConversation from generateEstimateForProposal.ts
4. Update proposal via payload.update: append messages to conversaIA, update estimativaAtual
5. Record in activityLog: "Budgeting follow-up: [first 50 chars of message]"
6. Return: { estimativaAtual, abordagemTecnica, nivelConfianca, nivelConfiancaJustificacao, conversaIA }

### estimate/accept/route.ts — POST
Body: { estimativaEditada: json }
1. Fetch proposal. Verify estado = EmOrcamentacao or Enviada → if not, 400
2. Validate minimum JSON structure (has items, each item has rubricas)
3. Calculate totalGeral by summing item totals
4. If valorVendaFinal is set: calculate margemCalculada = (sale - cost) / sale × 100, 2 decimal places
5. payload.update: save estimativaEditada and margemCalculada
6. Record in activityLog: "Estimate accepted and manually edited"
7. Return updated proposal

---

## PROMPT 08 — UI: Proposals List (A01)

### Context
Main screen of the commercial module.
Read requirement A01 in Confluence and the role access section of CLAUDE.md.

### Files to create
src/app/(frontend)/propostas/page.tsx — Server Component
src/components/proposals/ProposalTable.tsx — Client Component
src/components/proposals/ProposalFilters.tsx — Client Component
src/components/proposals/ProposalKPIs.tsx — Client Component

### page.tsx — Server Component
Fetch initial list via Payload Local API (not fetch).
Pass data as initial props to Client Components.
If role = criativo: filter only proposals assigned to the user.
Metadata: title "Proposals — Niu".

### ProposalKPIs.tsx — 4 cards
- Total active proposals (excluding Perdidas)
- Total value in pipeline
- Proposals won this month
- Proposals in Enviada state

### ProposalFilters.tsx
- Text search input (300ms debounce) — filters nomeProjeto and cliente
- Estado select — all enum options + "All" as default
- Result counter: "X proposals"

### ProposalTable.tsx
TanStack Query for data. Shadcn/UI Table component.

Exact columns (A01 in Confluence):
- Proposal No. (mono font, secondary colour)
- Project Name (font-weight 500)
- Client
- Account
- Created At (format DD/MM/YYYY)
- Estimated Value (EUR format: 12.500,00 €; empty if not defined)
- State (Badge with colours: Recebida=grey, EmElaboracao=blue, EmOrcamentacao=purple, Enviada=orange, Ganha=green, Perdida=red)

Behaviours:
- Sort by any column on header click
- Default sort: createdAt descending
- Clickable row → opens ProposalDrawer (Prompt 09)
- Empty state: "No proposals match the selected criteria."
- Error state: message + retry button
- Loading state: skeleton rows

"New Proposal" button (only visible for account and admin):
On click: Dialog with fields nomeProjeto (required), cliente (required), briefing (optional), prazoResposta (optional).
On submit: POST /api/proposals, invalidate query, close modal.

---

## PROMPT 09 — UI: Proposal Detail (A02)

### Context
Detail implemented as a Shadcn/UI Sheet (side drawer).
Tabs: Base Data, Creative Zone, Budgeting, Collaboration.
Read requirement A02 in Confluence and the access table in CLAUDE.md.

### Files to create
src/components/proposals/ProposalDrawer.tsx
src/components/proposals/tabs/TabDadosBase.tsx
src/components/proposals/tabs/TabCriativa.tsx
src/components/proposals/tabs/TabColaboracao.tsx
src/components/proposals/StateSelector.tsx
src/components/proposals/LossModal.tsx
src/components/proposals/ActivityLog.tsx

TabOrcamentacao is created in Prompt 10.

### ProposalDrawer.tsx
Shadcn Sheet with 680px width.
Opens on row click.
Fetches full data via TanStack Query (GET /api/proposals/[id]).
Header: numero (mono), project name (title), metadata inline (client, account, date), state badge, close button.
Below header: StateSelector.
Tabs with visibility by role: Budgeting tab only for account, producao, admin.
Auto-refetch after each successful action.

### StateSelector.tsx
Horizontal stepper showing states in sequence.
Shows only transitions allowed for current role and state.
On Perdida click → opens LossModal.
For other transitions → simple confirmation Dialog → calls POST /api/proposals/[id]/transition.
After successful transition: invalidates proposal query.

### LossModal.tsx
Dialog modal. Title: "Record loss".
Motivo select (required): Preço | Concorrência | Prazo | Projecto cancelado pelo cliente | Fora do âmbito | Sem resposta do cliente | Outro
Detail textarea (optional).
Buttons: "Cancel" and "Confirm loss" (red).
Validates motivo is selected before submitting.
Calls POST /api/proposals/[id]/transition with novoEstado=Perdida.

### TabDadosBase.tsx
Editable fields: nomeProjeto, cliente, contactoNome, contactoEmail, contactoTelefone, account (select), prazoResposta, briefing (textarea), condicoesPagamento, validadeProposta, valorVendaFinal, margemCalculada (read-only).
Non-editable fields: numero, createdAt.
File attachments: list existing files, add button (JPG/PNG/PDF), remove button per file.
Upload goes to Payload media collection, then associates to proposal.
"Save changes" button with loading state and success/error feedback.
Criativo is read-only on this tab.

### TabCriativa.tsx
Fields: memoriacriativa (textarea), estadoCriativo (select), figmaLink (URL input).
Mockups section: grid of cards with thumbnail/icon, filename, version, date.
"Add mockup" → file picker (JPG/PNG/PDF).
New file = active version. Previous = history.
"Active version" vs "Previous version" indicator. Previous versions clickable (modal or new tab).
"Save" button.
Account reads, criativo writes.

### ActivityLog.tsx
Chronological list, read-only, most recent at top.
Each entry: icon, event text, username, timestamp (DD/MM/YYYY HH:MM).

### TabColaboracao.tsx
Comments feed:
- Chronological, oldest at top
- Avatar with initials, name, timestamp, text
- Empty state: "No comments yet."
- Input at bottom (expanding textarea), Send button or Enter
- Calls PATCH on proposal adding to comentarios array
- Optimistic update
- Auto-scroll to latest message on send

Below feed: Separator + "Activity history" heading + ActivityLog.tsx component

---

## PROMPT 10 — UI: Budgeting Tab + EstimateEditor + EstimateChat

### Context
The most complex tab. AI output + manual editing + iterative chat.
Read A03 in Confluence and the "AI engine" and "Iterative chat" sections of CLAUDE.md.

### Files to create
src/components/proposals/tabs/TabOrcamentacao.tsx
src/components/proposals/EstimateEditor.tsx
src/components/proposals/EstimateChat.tsx

### TabOrcamentacao.tsx
Only visible for account, producao, admin.

Distinct states:
- Proposal not in EmOrcamentacao: informational message about when the estimate is generated
- EmOrcamentacao without session (generating): loading with progressive messages; polling via TanStack Query (refetchInterval 3s) until session exists
- Active session with estimate: EstimateEditor + EstimateChat (side by side or vertical scroll)
- Generation error: error message + "Try again" button
- Previous sessions: collapsed accordion "View previous budgeting sessions" with EstimateEditor in read-only mode

### EstimateEditor.tsx
Header:
- Confidence level badge (Alto=green, Médio=yellow, Baixo=red) + justification text
- Technical approach text (expandable — truncated by default with "See more")
- "Accept estimate" button (primary) → calls estimate/accept
- "Regenerate" button (secondary) → confirmation Dialog → calls transition to force new session

Items and rubricas table:
- Collapsible item header: name + calculated total
- Rubrica columns: Description, Quantity (editable), Unit (editable), Unit Cost (editable), Total (calculated)
- Item total row at the bottom of each item
- Add rubrica button per item
- Remove rubrica button (with confirmation)
- Add new item button at the bottom of the table

Global totals bar (at the bottom):
- Total costs
- Margin % input → recalculates sale value in real time
- Sale value (visual highlight)
- "Apply" button saves valorVendaFinal to proposal

Editing behaviour:
- Edits are local first (React state)
- "Save changes" button → calls estimate/accept
- Visual indicator "unsaved changes" when local edits exist
- Totals recalculate in real time as user edits

### EstimateChat.tsx
Title "Adjust with AI" with brief subtitle.
Message feed from active session (conversaIA).
User messages: right-aligned, soft blue background.
Assistant messages: left-aligned, soft grey background.
Assistant messages do NOT show raw JSON — they show:
  - Updated technical approach text (if changed)
  - Confidence level badge (if changed)
  - "Estimate updated — see table"
The JSON is processed and reflected in EstimateEditor, not shown to the user.

Input: placeholder "E.g. 'The stand is actually 30m²' or 'Add 2 days of installation'"
Send button or Ctrl+Enter. Loading state during API call.
On response: updates EstimateEditor via shared state in TabOrcamentacao.

Clickable examples when feed is empty:
- "Add transport and installation"
- "Adjust for a more conservative budget"
- "Specify premium finishing materials"

EstimateChat and EstimateEditor share estimate state via state lifted to TabOrcamentacao.

---

## PROMPT 11 — Seed data

### Context
Realistic data to test without creating everything manually.
Especially important for AI — the knowledge base needs real data for Claude to generate relevant estimates.

### File to create
src/seed.ts — executable via npm run seed
Add "seed": "ts-node src/seed.ts" to package.json.

### What to create

Users (1 per role):
- admin@niu.pt / Admin Niu / admin
- account@niu.pt / João Ferreira / account
- criativo@niu.pt / Sara Pereira / criativo
- producao@niu.pt / Miguel Santos / producao
Password: test1234 (development only)

Materials (minimum 15 realistic entries):
Printing vinyls (frontlit, backlit) per m², aluminium profiles per linear metre, dibond panels per m², MDF per m², acrylic per m², printing and cutting vinyl per m², common fixing materials, basic LED components.
Prices approximating current Portuguese market.

Machines (6-8 entries):
Large format printer, cutting plotter, CNC router, manual cutting table, laminator, installation tools (aggregated).

InternalRates (4-6 entries):
Designer/Creative, Print technician, Cutting/finishing technician, Installer, Project manager/Account.
Realistic Portuguese market values.

ProjectLibrary (3 entries):
- 20m² stand for technology trade show (octanorm + printing)
- Full signage for 3-floor office (acrylic + vinyl)
- POS kit for 50 shops (counter displays + totems)
Each with realistic estruturaCustos json (items and rubricas).

Proposals (6 entries, one per state):
- Recebida: briefing filled, no creative zone
- EmElaboracao: briefing + partial creative zone
- EmOrcamentacao: complete, session with dummy estimate (correct JSON structure, no real API call)
- Enviada: complete with valorVendaFinal
- Ganha: complete with coherent activityLog
- Perdida: motivoPerda=Preco, detail filled

Each proposal has activityLog coherent with its state.

Script behaviour:
Check if data already exists before creating.
If data exists, ask for confirmation (or accept --force flag).
Do not delete existing data — only add if not present.
Use Payload Local API for everything.
Show progress in terminal.

---

## PROMPT 12 — Tests and final validation

### Context
Validate critical flows before considering the prototype complete.

### Integration tests (code)

Create src/__tests__/ with the following tests:

parseEstimate.test.ts:
- Valid well-formed JSON → returns object
- JSON with backticks → cleans and returns
- JSON with missing fields → throws descriptive error
- Completely invalid string → throws error
- JSON with empty items → passes (valid estimate)

validateTransition.test.ts:
- All allowed transitions with correct role → pass
- All prohibited transitions → reject with clear message
- Transition from terminal state → rejects
- Perdida without motivoPerda → rejects
- Perdida with motivoPerda → passes

generateProposalNumber.test.ts:
- First proposal of the year → PROP-[year]-001
- Tenth proposal → PROP-[year]-010
- Different year from last existing → restarts at 001

### Manual validation checklist (run after npm run seed)

Flow 1 — Creation and progression:
1. Login as account@niu.pt → create proposal → verify PROP-[year]-NNN number
2. Verify it appears in list with state Recebida
3. Advance to Em Elaboração → verify activityLog
4. Login as criativo@niu.pt → verify proposal is visible
5. Fill creative memory + add mockup image
6. Advance to Em Orçamentação
7. Verify estimate generation triggers automatically
8. Wait and verify estimate appears in Budgeting tab

Flow 2 — Iterative chat:
1. Proposal in EmOrcamentacao with estimate
2. Follow-up: "Add a transport line to Lisbon"
3. Verify Claude responds with updated JSON
4. Verify table updates
5. Second follow-up: "Increase printing quantities by 20%"
6. Verify coherence with previous request

Flow 3 — Close proposal:
1. Edit a value in the estimate table → save → verify
2. Fill valorVendaFinal → verify margemCalculada is calculated
3. Advance to Enviada → to Ganha
4. Verify terminal state (no transition buttons)

Flow 4 — Lost proposal:
1. Proposal in Enviada → click "Mark as Lost"
2. Submit without motivo → verify validation
3. Select "Preço" → confirm
4. Verify Perdida state is immutable and motivo is in activityLog

Flow 5 — Access control:
1. Login as criativo@niu.pt → Budgeting tab not visible
2. Cannot edit Base Data → can edit creative zone
3. Login as producao@niu.pt → can see and edit Budgeting
4. Cannot create proposals (button not visible)

### Common errors to check
- Infinite loop in afterChange hooks (logActivity must not re-trigger)
- Claude JSON parse failing with unexpected responses
- Image upload to R2 and URL accessible in frontend
- AI timeout not handled correctly
- TanStack Query not invalidating after mutations

---

## PROMPT 13 — Pre-API verification and testing guide

### Context
The AI API keys (Anthropic and OpenAI) are not yet available.
Everything else — collections, hooks, endpoints, UI, mocks — should be fully implemented.
This prompt has two parts:
1. Claude Code audits the codebase and reports what is and is not correctly implemented
2. Claude Code generates a step-by-step manual testing guide specific to this project

Do both parts in order. Do not skip the audit.

---

### Part 1 — Codebase audit

Go through every item in this checklist. For each item, report one of three states:
- DONE — correctly implemented and complete
- PARTIAL — exists but incomplete or has issues (describe what is missing)
- MISSING — not implemented at all

Do not assume something is done without reading the actual file.
Read every file listed before reporting its status.

#### Collections
- [ ] src/collections/Proposals.ts — all fields from CLAUDE.md present, correct types, access control per role
- [ ] src/collections/Users.ts — role enum correct, auth configured
- [ ] src/collections/Materials.ts — all fields present, admin-only write access
- [ ] src/collections/Machines.ts — all fields present, admin-only write access
- [ ] src/collections/InternalRates.ts — all fields present, admin-only write access
- [ ] src/collections/ProjectLibrary.ts — all fields present, admin-only write access
- [ ] payload.config.ts — all collections registered, S3 plugin configured

#### Hooks
- [ ] src/hooks/beforeChange/generateProposalNumber.ts — PROP-YYYY-NNN format, sequential per year, not overwritten on edit
- [ ] src/hooks/beforeChange/validateTransition.ts — all state machine rules enforced, role checks, motivoPerda required for Perdida
- [ ] src/hooks/afterChange/logActivity.ts — all relevant events logged, append-only, no infinite loop risk
- [ ] src/hooks/afterChange/generateEstimate.ts — triggers only on EmOrcamentacao transition, fire-and-forget, calls mock correctly

#### AI library (mocks)
- [ ] src/lib/ai/claudeClient.ts — mock function returns valid JSON matching CLAUDE.md schema, TODO comment present
- [ ] src/lib/ai/openaiClient.ts — mock function returns plausible image description text, TODO comment present
- [ ] src/lib/ai/buildPrompt.ts — assembles all inputs into structured message, handles empty fields gracefully
- [ ] src/lib/ai/parseEstimate.ts — validates JSON structure, cleans backticks, throws descriptive errors
- [ ] src/lib/ai/analyzeImages.ts — calls mock, handles download failures gracefully
- [ ] src/lib/ai/generateEstimateForProposal.ts — both functions implemented, calls mocks, saves correctly to session
- [ ] src/lib/ai/prompts/estimateSystem.ts — system prompt written in Portuguese, all rules and output format defined

#### Custom endpoints
- [ ] src/app/api/proposals/[id]/transition/route.ts — validates auth, calls payload.update, hook handles validation, returns updated proposal
- [ ] src/app/api/proposals/[id]/chat/route.ts — validates state and active session, calls continueConversation, updates conversaIA and estimativaAtual
- [ ] src/app/api/proposals/[id]/estimate/accept/route.ts — validates structure, calculates totals and margin, records in activityLog

#### UI — List (A01)
- [ ] src/app/(frontend)/propostas/page.tsx — Server Component, fetches via Local API, passes initial props
- [ ] src/components/proposals/ProposalKPIs.tsx — 4 KPI cards with correct metrics
- [ ] src/components/proposals/ProposalFilters.tsx — text search with debounce, estado select, result counter
- [ ] src/components/proposals/ProposalTable.tsx — all columns correct, badge colours, clickable rows, empty/error/loading states, New Proposal modal

#### UI — Detail (A02)
- [ ] src/components/proposals/ProposalDrawer.tsx — 680px Sheet, correct header, tabs with role visibility, auto-refetch
- [ ] src/components/proposals/StateSelector.tsx — shows correct transitions per role and state, confirmation dialogs
- [ ] src/components/proposals/LossModal.tsx — all motivo options, detail textarea, validation before submit
- [ ] src/components/proposals/tabs/TabDadosBase.tsx — all fields, read-only for criativo, file attachments, save button
- [ ] src/components/proposals/tabs/TabCriativa.tsx — mockup grid, versioning, estadoCriativo, figmaLink, save button
- [ ] src/components/proposals/tabs/TabColaboracao.tsx — comments feed, optimistic update, ActivityLog component
- [ ] src/components/proposals/ActivityLog.tsx — chronological, read-only, correct timestamp format
- [ ] src/components/proposals/tabs/TabOrcamentacao.tsx — all states handled (not in state, generating, active session, error, previous sessions)
- [ ] src/components/proposals/EstimateEditor.tsx — collapsible items, editable rubricas, real-time totals, margin input, unsaved indicator, accept/regenerate buttons
- [ ] src/components/proposals/EstimateChat.tsx — message feed, user/assistant styling, no raw JSON shown, example prompts, shared state with editor

#### Seed
- [ ] src/seed.ts — all entities created (4 users, 15+ materials, 6+ machines, 4+ rates, 3 project library entries, 6 proposals in different states)

After completing the audit, output a summary in this exact format:

AUDIT SUMMARY
=============
DONE:    X items
PARTIAL: X items — [list them with one-line description of what is missing]
MISSING: X items — [list them]

OVERALL STATUS: Ready to test / Needs fixes before testing

If there are PARTIAL or MISSING items, fix them before proceeding to Part 2.
Only move to Part 2 when all items are DONE.

---

### Part 2 — Step-by-step testing guide

After the audit passes, produce a testing guide tailored to the actual state of the codebase.
Use the actual URLs, actual field names, and actual enum values from this project.
Do not write generic steps.

#### Setup
- Confirm npm run dev is running without errors on http://localhost:3000
- Confirm Payload admin UI loads at http://localhost:3000/admin
- Run npm run seed and confirm terminal output shows all entities created
- Note the four test credentials from the seed output

#### Test 1 — Payload admin UI baseline
Login as admin@niu.pt at /admin.
Confirm all 6 collections appear in the sidebar: Proposals, Users, Materials, Machines, InternalRates, ProjectLibrary.
Open Materials — confirm 15+ entries with nome, unidade, custoMedio fields populated.
Open Users — confirm 4 users exist with roles: admin, account, criativo, producao.
Create a new Material entry manually and confirm it saves and appears in the list.
Open InternalRates — confirm entries exist with custoHora values.

#### Test 2 — Proposal creation and numbering
Navigate to http://localhost:3000/propostas and login as account@niu.pt.
Confirm the 4 KPI cards load with numbers derived from the seed proposals.
Confirm the proposals table shows proposals from the seed with correct columns and badge colours.
Click "New Proposal" — fill nomeProjeto and cliente — submit.
Confirm the new proposal appears in the table with estado = Recebida and a badge in grey.
Confirm the numero field shows PROP-2026-NNN format, sequential after the last seed proposal.
Click the new proposal row — confirm the drawer opens at 680px width with the correct header.

#### Test 3 — State transitions and validation
With the new proposal open in estado = Recebida:
Confirm StateSelector shows only one forward option: advance to Em Elaboração.
Click advance — confirm the estado badge in the drawer header updates to Em Elaboração (blue).
Open the Activity Log tab — confirm an entry reads "State changed from Recebida to EmElaboracao" with timestamp and user.
Click back to Recebida — confirm the regression works and is also logged.
Advance again to Em Elaboração, then forward to Em Orçamentação.
Confirm a budgeting session is created and the mock estimate appears in the Budgeting tab within a few seconds.
Verify the mock estimate structure: abordagem_tecnica text is visible, nivelConfianca badge shows Médio, items table has at least 2 items each with rubricas.
Continue advancing to Enviada.
Click "Mark as Lost" — confirm LossModal opens.
Try to submit without selecting a motivo — confirm validation blocks the submission.
Select "Preço" — confirm — verify estado badge shows Perdida (red) and no transition buttons remain.

#### Test 4 — Creative zone and access control
Login as criativo@niu.pt.
Open a proposal in Em Elaboração state.
Confirm the Budgeting tab is not visible in the tab list.
Go to Base Data tab — confirm all input fields are disabled or read-only.
Go to Creative Zone tab — confirm memoriacriativa textarea and maquetes upload are editable.
Type in the memoriacriativa field and save — confirm it persists on drawer close and reopen.
Change estadoCriativo select to Em Revisão — save — confirm the change persists.
Upload a small test image as a mockup — confirm it appears as a card in the grid with "Active version" label.
Login as producao@niu.pt — confirm the Budgeting tab is visible and the estimate table is editable.
Confirm producao does not see the "New Proposal" button in the top right.

#### Test 5 — Mock AI estimate and iterative chat
Login as account@niu.pt.
Open any proposal and advance it to Em Orçamentação (or use the seed proposal already in that state).
Go to the Budgeting tab — confirm a brief loading state appears then the mock estimate loads.
Confirm the estimate shows: abordagem_tecnica paragraph, nivelConfianca = Médio badge with justification text, collapsible item blocks each with a rubrica table.
Click on an item header to collapse and expand it — confirm it works.
Edit a quantidade value in a rubrica — confirm the item total and grand total recalculate immediately without saving.
Edit the margin percentage input in the totals bar — confirm the sale value recalculates.
Confirm the "unsaved changes" indicator appears.
Click "Save changes" — confirm it disappears and the data persists on reload.
Type a message in the EstimateChat input: "Add transport to Lisbon" — submit.
Confirm a mock response appears in the chat feed with assistant styling (left-aligned, grey background).
Confirm the estimate table reflects the updated mock response.
Confirm the user message appears right-aligned in the chat feed.
Type a second message — confirm both previous messages remain in the feed (history preserved).
Click "Accept estimate" — confirm the activityLog records "Estimate accepted and manually edited".

#### Test 6 — Comments and collaboration
Open any proposal and go to the Collaboration tab.
Type a comment and press Enter — confirm it appears immediately before the server responds (optimistic update).
Close the drawer and reopen it — confirm the comment persists.
Confirm the Activity Log section below the comments shows a complete chronological list of all events from previous tests.
Confirm there are no edit or delete options on any log entry.

#### Test 7 — Filters and search
Return to /propostas.
Type part of a seed proposal project name in the search box — confirm results filter after the debounce delay (roughly 300ms after you stop typing).
Select "Enviada" from the estado dropdown — confirm only proposals in that state appear.
Combine the text search with the estado filter — confirm both apply simultaneously.
Clear all filters — confirm the full list returns.
Check the result counter text updates correctly with each filter change.

#### Test 8 — Complete happy path
Run the full flow without stopping:
1. Login as account@niu.pt — create new proposal with nomeProjeto "Happy Path Test" and cliente "Test Client"
2. Advance to Em Elaboração
3. Switch to criativo@niu.pt — open the proposal — fill memoriacriativa with any text — set estadoCriativo to Aprovado — save
4. Switch back to account@niu.pt — advance to Em Orçamentação
5. Go to Budgeting tab — wait for mock estimate to load
6. Type a follow-up in EstimateChat — confirm response arrives
7. Edit one rubrica quantidade — confirm totals update
8. Fill in valorVendaFinal with any number — confirm margemCalculada appears next to it
9. Click Accept estimate
10. Advance to Enviada — then to Ganha
11. Confirm estado = Ganha, no transition buttons visible
12. Open Activity Log — confirm it has a complete record of every step in chronological order

#### What to ignore during testing
- File upload previews may not load without real R2 credentials — uploads can still be submitted, the URL just will not resolve
- AI responses return hardcoded mock data — the content is always the same regardless of the briefing input
- Emails will not be sent without RESEND_API_KEY — this is expected
- If any error message mentions ANTHROPIC_API_KEY or OPENAI_API_KEY, a mock is not correctly wired — report it as a bug to fix before the real keys arrive

---

## PROMPT 14 — NIU brand design system

### Context
Redesign the entire frontend to match the NIU brand identity.
The design must feel like a professional internal tool built by NIU — not a generic SaaS dashboard.
This prompt covers the full visual overhaul: tokens, typography, layout, all components and pages.

Do not start implementing until you have completed the research phase described below.

If you have any questions or things that you think that aren't correct (not the same format as the website) ask before implementing.

---

### Phase 1 — Brand research (do this first, before any code)

Visit and analyse the following pages. Read the actual rendered styles using browser tools or by inspecting the page source. Extract the exact values before writing any code.

Pages to analyse:
- https://niu.pt/
- https://niu.pt/pagina-principal/sobre-nos/
- https://niu.pt/pagina-principal/portfolio/
- https://niu.pt/pagina-principal/contactos/

For each page, extract and document:
- Background colours (hex values)
- Text colours (hex values, by hierarchy — heading, body, secondary, muted)
- Accent / highlight colours (buttons, hover states, underlines, dividers)
- Font families used (check the CSS font-family declarations)
- Font weights used for headings vs body
- Letter-spacing values on headings
- Border radius values on interactive elements
- Spacing rhythm (padding and margin patterns)
- Navigation bar style (height, background, border)
- Any use of red, orange or other accent colours

After extracting, output a brand audit document in this format before writing any code:

BRAND AUDIT — NIU
=================
Background primary:   #______
Background secondary: #______
Background card:      #______
Text primary:         #______
Text secondary:       #______
Text muted:           #______
Accent primary:       #______
Accent hover:         #______
Border colour:        #______
Font heading:         ______
Font body:            ______
Heading weight:       ______
Heading letter-spacing: ______
Border radius (buttons): ______
Border radius (cards):   ______

Wait for confirmation of these values before proceeding to Phase 2.

---

### Phase 2 — Design tokens

After the brand audit is confirmed, set up the full design token system.

#### Tailwind config (tailwind.config.ts)
Extend the theme with NIU brand tokens:

Colours to define:
- niu-black: the near-black from the website (background on dark areas, primary buttons, active states)
- niu-white: the off-white used for text on dark backgrounds
- #333333 (dark hover): darker variant for button hover states
- niu-gray-50 through niu-gray-900: a neutral grey scale for the light theme
- niu-surface: main page background (white or very light grey)
- niu-surface-raised: card and panel background (slightly off-white)
- niu-surface-overlay: drawer and modal background
- niu-border: default border colour
- niu-border-strong: stronger border for emphasis

Typography to define:
- fontFamily.heading: Montserrat (Google Fonts) — used for all headings, labels, navigation
- fontFamily.body: Inter (Google Fonts) — used for all body text, inputs, tables
- fontFamily.mono: JetBrains Mono — used for proposal numbers and code

#### Global CSS (src/app/globals.css)
Import Google Fonts: Montserrat (weights 400, 500, 600, 700) and Inter (weights 400, 500, 600).
Define CSS custom properties that mirror the Tailwind tokens for use in any non-Tailwind context.
Set the base font to Inter across the application.
Set heading elements (h1–h4) to Montserrat with the correct letter-spacing extracted from the website.

#### Logo
The logo file provided by the user should be placed in src/assets/logo-niu.svg (or the format provided).
It is used in the sidebar and login page only.
Do not use it as a favicon — create a simple text-based favicon instead.

---

### Phase 3 — Layout shell

Redesign the application shell to match NIU's visual language.

#### Overall layout
The application uses a fixed left sidebar + main content area layout.
The sidebar is narrow (220px), dark — using niu-black as background with white text and navigation items.
This is intentional: the dark sidebar anchors the NIU brand identity without making the whole tool dark,
keeping it comfortable for daily use.
The main content area uses niu-surface (light) as its background.

#### Sidebar (src/components/layout/Sidebar.tsx)
Background: niu-black
Logo: NIU logo file at the top, white version, with "Gestão" in small Montserrat text beneath it
Navigation items: white text, Montserrat font, uppercase, letter-spacing matching the website nav
Active state: white left border (4px) + slightly lighter background (since sidebar background IS already niu-black)
Hover state: subtle white overlay at low opacity
Bottom: user name and role in small muted text
Section labels: all-caps, very muted, small Montserrat, matching the website's section styling

#### Top bar (src/components/layout/TopBar.tsx)
Background: niu-surface (white/off-white)
Bottom border: niu-border, 1px
Page title: Montserrat, font-weight 600, uppercase, letter-spacing wide — matching website headings
Action buttons positioned right
Height: 56px

#### Page background
niu-surface — clean, light, uncluttered

---

### Phase 4 — Component redesign

Redesign every component to use the NIU token system.
Do not change any functionality — only visual styles.

#### Badges (estado colours)
These must remain colour-coded for readability but styled with the NIU aesthetic:
- Recebida: light grey background, dark grey text — neutral, not started
- EmElaboracao: light blue tint, blue text
- EmOrcamentacao: light purple tint, purple text
- Enviada: light amber tint, amber text
- Ganha: light green tint, dark green text
- Perdida: light red tint, niu-red text
All badges: Montserrat font, uppercase, font-weight 600, tight letter-spacing, no border-radius (square or very minimal radius — matching NIU's geometric aesthetic)

#### Buttons
Primary button: niu-black background, white text, Montserrat, uppercase, font-weight 600, letter-spacing wide, 0 or minimal border-radius
Primary hover: #333333 (dark hover) background
Secondary button: transparent background, niu-border border, dark text, same typography
Destructive button: used for Perdida actions — deeper red, white text
No rounded pill buttons — NIU's aesthetic is geometric and sharp

#### Cards and panels
Background: niu-surface-raised
Border: 1px niu-border
Border radius: minimal (4px maximum) — NIU uses sharp corners
No drop shadows — use borders and background contrast instead

#### Table (ProposalTable)
Header row: niu-gray-100 background, Montserrat uppercase labels, letter-spacing wide, small font size
Body rows: white background, Inter font, comfortable row height
Row hover: niu-gray-50 background
Bottom border on each row: 1px niu-border
Selected row: niu-red left border (4px) + niu-gray-50 background
Proposal number column: JetBrains Mono font, niu-gray-500 colour

#### KPI cards (ProposalKPIs)
White background, 1px niu-border border, sharp corners
Label: Montserrat, uppercase, small, niu-gray-500
Value: Montserrat, large, font-weight 700, niu-black
Sub-label: Inter, small, niu-gray-400
No icons — NIU's style is typographic, not icon-heavy

#### Drawer (ProposalDrawer)
Width: 720px
Background: white
Left border: 4px solid niu-black — the single strongest brand moment in the interface
Header: white background, proposal number in mono/muted, project name in Montserrat h2, metadata in small Inter
Tabs: Montserrat, uppercase, letter-spacing wide, active tab has niu-black underline (3px)
No rounded corners on the drawer itself

#### Forms and inputs
Border: 1px niu-border
Border radius: 2px — sharp
Focus ring: niu-black border, no glow
Label: Montserrat, uppercase, small, font-weight 600, letter-spacing
Placeholder: niu-gray-400, Inter
Background: white

#### StateSelector
The stepper uses a minimal horizontal line with dots.
Completed steps: niu-black dot
Current step: niu-black dot with label in Montserrat bold
Pending steps: niu-gray-300 dot
The line connecting steps: 1px, niu-gray-200 for pending, niu-black for completed

#### EstimateEditor
Table uses the same table tokens as ProposalTable.
Editable cells: on focus, show niu-black bottom border only (underline style) — not a full box
Totals bar: strong niu-black top border (3px) + light background — for emphasis
Accept button: niu-black, prominent

#### EstimateChat
User messages: niu-black background, white text — strong brand moment
Assistant messages: niu-gray-100 background, niu-black text
Input area: clean white, niu-black send button

#### LossModal
The modal itself: white, sharp corners, 4px niu-black top border
Confirm button: destructive (red) — this is a destructive action, correct by convention

---

### Phase 5 — Login page

The login page is the first thing users see. It must be the most on-brand screen.

Layout: split screen — left half dark (niu-black), right half light (white)
Left half:
- NIU logo (white version) centred
- Tagline text in Montserrat, white, all-caps, wide letter-spacing
- Decorative element — a large, very subtle NIU wordmark or geometric shape at low opacity in the background

Right half:
- "Gestão de Propostas" heading in Montserrat, niu-black, all-caps
- Email and password inputs (styled as per Phase 4 inputs)
- Login button full-width, niu-red, Montserrat uppercase
- Very minimal — no decorations, just the form

---

### Phase 6 — Final consistency pass

After all components are redesigned, do a full pass to check:
- Every font usage is either Montserrat (headings, labels, nav, buttons) or Inter (body, inputs, data)
- Every proposal number uses JetBrains Mono
- No rounded corners beyond 4px anywhere in the interface
- No drop shadows — only border and background contrast
- The niu-black accent is used consistently: primary buttons, active states, drawer left border, focused inputs, chat user messages, totals bar top border
- The sidebar is always dark (niu-black) regardless of the rest of the page
- All-caps + wide letter-spacing is used consistently on headings and labels — this is the strongest NIU typographic signature

### Important notes
- Do not change any TypeScript logic, props, state, or data fetching — visual only
- Do not change any Payload collections, hooks or endpoints
- Do not change component file names or export names
- If a Shadcn component requires overriding its default styles, do it via Tailwind classes on the component, not by modifying the Shadcn source
- After completing all phases, commit: "[Prompt 14] NIU brand design system — full frontend redesign"
