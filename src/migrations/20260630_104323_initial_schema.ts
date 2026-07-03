import { MigrateUpArgs, MigrateDownArgs, sql } from '@payloadcms/db-postgres'

export async function up({ db, payload, req }: MigrateUpArgs): Promise<void> {
  await db.execute(sql`
   CREATE TYPE "public"."enum_users_role" AS ENUM('account', 'criativo', 'producao', 'admin');
  CREATE TYPE "public"."enum_proposals_sessao_orcamentacao_conversa_i_a_role" AS ENUM('user', 'assistant');
  CREATE TYPE "public"."enum_proposals_sessao_orcamentacao_variantes_geradas_tipo" AS ENUM('Otimista', 'Equilibrada', 'Conservadora');
  CREATE TYPE "public"."nvl_conf" AS ENUM('Alto', 'Medio', 'Baixo');
  CREATE TYPE "public"."enum_proposals_sessao_orcamentacao_nivel_confianca" AS ENUM('Alto', 'Medio', 'Baixo');
  CREATE TYPE "public"."enum_proposals_sessao_orcamentacao_variante_selecionada" AS ENUM('Otimista', 'Equilibrada', 'Conservadora');
  CREATE TYPE "public"."enum_proposals_estado" AS ENUM('Recebida', 'EmElaboracao', 'EmOrcamentacao', 'Enviada', 'Ganha', 'Perdida');
  CREATE TYPE "public"."enum_proposals_motivo_perda" AS ENUM('Preco', 'Concorrencia', 'Prazo', 'ProjetoCancelado', 'ForaAmbito', 'SemResposta', 'Outro');
  CREATE TYPE "public"."enum_proposals_estado_criativo" AS ENUM('Rascunho', 'EmRevisao', 'Aprovado');
  CREATE TABLE "users_sessions" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"created_at" timestamp(3) with time zone,
  	"expires_at" timestamp(3) with time zone NOT NULL
  );
  
  CREATE TABLE "users" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"role" "enum_users_role" DEFAULT 'account' NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"email" varchar NOT NULL,
  	"reset_password_token" varchar,
  	"reset_password_expiration" timestamp(3) with time zone,
  	"salt" varchar,
  	"hash" varchar,
  	"login_attempts" numeric DEFAULT 0,
  	"lock_until" timestamp(3) with time zone
  );
  
  CREATE TABLE "media" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"alt" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"url" varchar,
  	"thumbnail_u_r_l" varchar,
  	"filename" varchar,
  	"mime_type" varchar,
  	"filesize" numeric,
  	"width" numeric,
  	"height" numeric,
  	"focal_x" numeric,
  	"focal_y" numeric
  );
  
  CREATE TABLE "proposals_sessao_orcamentacao_conversa_i_a" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"role" "enum_proposals_sessao_orcamentacao_conversa_i_a_role",
  	"content" varchar,
  	"timestamp" varchar
  );
  
  CREATE TABLE "proposals_sessao_orcamentacao_variantes_geradas" (
  	"_order" integer NOT NULL,
  	"_parent_id" varchar NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"tipo" "enum_proposals_sessao_orcamentacao_variantes_geradas_tipo",
  	"estimativa" jsonb,
  	"abordagem_tecnica" varchar,
  	"nivel_confianca" "nvl_conf",
  	"nivel_confianca_justificacao" varchar
  );
  
  CREATE TABLE "proposals_sessao_orcamentacao" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"sessao_id" varchar,
  	"estimativa_atual" jsonb,
  	"abordagem_tecnica" varchar,
  	"nivel_confianca" "enum_proposals_sessao_orcamentacao_nivel_confianca",
  	"nivel_confianca_justificacao" varchar,
  	"variante_selecionada" "enum_proposals_sessao_orcamentacao_variante_selecionada",
  	"variantes_ordem_violada" boolean DEFAULT false,
  	"inputs_usados" jsonb
  );
  
  CREATE TABLE "proposals_comentarios" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"autor_id" integer NOT NULL,
  	"texto" varchar NOT NULL,
  	"timestamp" varchar
  );
  
  CREATE TABLE "proposals_activity_log" (
  	"_order" integer NOT NULL,
  	"_parent_id" integer NOT NULL,
  	"id" varchar PRIMARY KEY NOT NULL,
  	"evento" varchar,
  	"user_id" integer,
  	"timestamp" varchar
  );
  
  CREATE TABLE "proposals" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"numero" varchar,
  	"estado" "enum_proposals_estado" DEFAULT 'Recebida' NOT NULL,
  	"motivo_perda" "enum_proposals_motivo_perda",
  	"detalhe_perda" varchar,
  	"nome_projeto" varchar NOT NULL,
  	"cliente" varchar NOT NULL,
  	"account_id" integer NOT NULL,
  	"contacto_nome" varchar,
  	"contacto_email" varchar,
  	"contacto_telefone" varchar,
  	"prazo_resposta" timestamp(3) with time zone,
  	"briefing" jsonb,
  	"figma_link" varchar,
  	"memoriacriativa" jsonb,
  	"estado_criativo" "enum_proposals_estado_criativo" DEFAULT 'Rascunho',
  	"estimativa_editada" jsonb,
  	"valor_venda_final" numeric,
  	"margem_calculada" numeric,
  	"condicoes_pagamento" varchar,
  	"validade_proposta" timestamp(3) with time zone,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "proposals_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"media_id" integer
  );
  
  CREATE TABLE "materials" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"referencia" varchar,
  	"unidade" varchar NOT NULL,
  	"custo_medio" numeric NOT NULL,
  	"notas" varchar,
  	"ativo" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "machines" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"tipo" varchar,
  	"descricao" varchar,
  	"disponivel" boolean DEFAULT true,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "internal_rates" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"perfil" varchar NOT NULL,
  	"departamento" varchar NOT NULL,
  	"custo_hora" numeric NOT NULL,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "project_library" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"nome" varchar NOT NULL,
  	"tipo" varchar,
  	"ano" numeric,
  	"descricao" varchar,
  	"estrutura_custos" jsonb,
  	"notas" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_kv" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar NOT NULL,
  	"data" jsonb NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"global_slug" varchar,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_locked_documents_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer,
  	"media_id" integer,
  	"proposals_id" integer,
  	"materials_id" integer,
  	"machines_id" integer,
  	"internal_rates_id" integer,
  	"project_library_id" integer
  );
  
  CREATE TABLE "payload_preferences" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"key" varchar,
  	"value" jsonb,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "payload_preferences_rels" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"order" integer,
  	"parent_id" integer NOT NULL,
  	"path" varchar NOT NULL,
  	"users_id" integer
  );
  
  CREATE TABLE "payload_migrations" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"name" varchar,
  	"batch" numeric,
  	"updated_at" timestamp(3) with time zone DEFAULT now() NOT NULL,
  	"created_at" timestamp(3) with time zone DEFAULT now() NOT NULL
  );
  
  CREATE TABLE "ai_settings" (
  	"id" serial PRIMARY KEY NOT NULL,
  	"regras_orcamentacao" varchar DEFAULT '## Passo 1 — Extracção de elementos (obrigatório antes de orçamentar)
  
  Antes de gerar qualquer número, percorre mentalmente TODAS as fontes de informação disponíveis:
  
  1. **Briefing do projecto** — lista todos os elementos físicos mencionados: estrutura, materiais, equipamentos, mobiliário, acabamentos, sinalética, iluminação, AV, etc.
  2. **Memória criativa** — complementa com especificações criativas, de acabamento e de conceito
  3. **Análise de maquetes** (se disponível) — extrai dimensões visíveis, materiais, elementos estruturais, acabamentos, iluminação
  4. **Ficheiros anexados** (se disponíveis) — extrai especificações técnicas, dimensões, listagens de equipamentos, cadernos de encargos
  5. **Análise Figma** (se disponível) — extrai anotações textuais, dimensões, materiais e todos os elementos identificados
  
  Constrói uma lista mental de TODOS os elementos físicos identificados. Cada elemento dessa lista DEVE estar reflectido no orçamento. Não omitas nenhum elemento.
  
  ## Passo 2 — Cadeia de produção completa para cada elemento
  
  Para cada elemento identificado, percorre obrigatoriamente estas fases e inclui uma rubrica para cada uma que seja relevante:
  
  **a) Materiais e componentes**
  O que é necessário comprar? (matéria-prima, componentes, consumíveis)
  Exemplos: perfil octanorm, MDF, lona frontlit, acrílico, cabo eléctrico, fita LED, carpete, etc.
  
  **b) Produção e fabrico**
  Como se produz o elemento? Que máquinas são necessárias e durante quanto tempo?
  Exemplos:
  - Painel MDF → fresa CNC (horas de máquina) + operador de fresa
  - Impressão gráfica → impressora UV ou plotter (m² ou tempo de impressão) + operador
  - Peça em acrílico → corte a laser ou fresagem + operador
  - Elemento metálico → soldadura + serralheiro
  - Lacagem/pintura → cabine de pintura + pintor
  Inclui SEMPRE o operador da máquina com o perfil e horas correctas da base de taxas internas.
  
  **c) Pré-montagem e acabamentos de bancada**
  Existe trabalho de preparação antes de ir para o local?
  Exemplos: colagem de vinilo, montagem de estrutura, instalação eléctrica prévia, acabamentos, embalagem para transporte.
  
  **d) Transporte**
  Como chegam os materiais e peças ao local do evento?
  Inclui viatura (furgão, carrinha de carga), combustível, portagens e tempo de condução se relevante.
  
  **e) Montagem e instalação no local**
  Quantos montadores? Quantas horas? Para stands em locais externos, conta sempre com montagem E desmontagem.
  Inclui o perfil correcto: montador geral, técnico de iluminação, técnico AV, electricista, etc.
  
  **f) Equipamento externo**
  São necessárias ferramentas ou máquinas que a agência não tem disponíveis?
  Exemplos: plataforma elevatória, gerador, andaimes, grua, ferramentas especializadas.
  Se sim, inclui o aluguer como rubrica.
  
  **Regra de ouro**: nenhum material existe no vácuo. Uma lona impressa precisa de operador de impressão, corte, e montador para a colocar. Um painel em MDF precisa de fresa, operador de fresa e montador. Um ecrã precisa de suporte, instalação eléctrica e técnico AV. Inclui SEMPRE todas as fases.
  
  **Erros mais comuns a evitar**:
  - Ecrãs/TVs/monitores: NUNCA os absorvas no custo do suporte — são rubrica própria com o preço de mercado do equipamento, estimado com base no teu conhecimento
  - Iluminação: se o projecto menciona LED, spots ou qualquer iluminação, OBRIGATORIAMENTE existe um grupo de iluminação com fitas/spots + cablagem + técnico de instalação
  - Impressão gráfica: qualquer impressão tem SEMPRE operador de impressão (técnico) como rubrica separada
  - Transporte: qualquer stand montado fora das instalações da agência tem SEMPRE transporte (viatura + motorista)
  - Desmontagem: qualquer stand montado tem SEMPRE desmontagem (tipicamente 50–70% do tempo de montagem)
  
  **Taxas de mão de obra**: usa os valores da secção "Taxas Internas" sempre que existirem. Se não existir taxa registada para um determinado perfil, estima o custo/hora com base no teu conhecimento do mercado português — nunca omitas uma rubrica de mão de obra por falta de referência.
  
  ## Regras adicionais de orçamentação
  
  1. **Tabela de materiais — uso obrigatório**: quando um material da secção "Materiais Disponíveis" corresponde ao que é necessário, o \`custo_unitario\` DEVE ser exactamente o valor da tabela — nunca arredondado. Se não existir material correspondente na tabela, usa estimativa de mercado e indica-o no \`fonte\`.
  2. **Taxas internas — uso obrigatório**: quando existe uma taxa na secção "Taxas Internas" para um determinado perfil, usa esse valor exacto para o \`custo_unitario\` das horas de mão de obra. Se não existir taxa para o perfil necessário, estima com base no mercado português e indica-o no \`fonte\`.
  3. Sê conservador nas estimativas — é preferível sobrestimar ligeiramente do que subestimar.
  4. Se houver projectos históricos similares na biblioteca, usa-os como referência e menciona-o na abordagem técnica.
  5. Quando as fontes indicam dimensões específicas, usa sempre essas dimensões no cálculo. Se não houver dimensões, assume valores típicos para o tipo de projecto e indica-o no \`fonte\`.
  6. Nunca omitas um elemento mencionado em qualquer das fontes. Se não souberes o preço exacto, estima com base no mercado português, indica-o no \`fonte\`, e reflecte a incerteza no nível de confiança.',
  	"updated_at" timestamp(3) with time zone,
  	"created_at" timestamp(3) with time zone
  );
  
  ALTER TABLE "users_sessions" ADD CONSTRAINT "users_sessions_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "proposals_sessao_orcamentacao_conversa_i_a" ADD CONSTRAINT "proposals_sessao_orcamentacao_conversa_i_a_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."proposals_sessao_orcamentacao"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "proposals_sessao_orcamentacao_variantes_geradas" ADD CONSTRAINT "proposals_sessao_orcamentacao_variantes_geradas_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."proposals_sessao_orcamentacao"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "proposals_sessao_orcamentacao" ADD CONSTRAINT "proposals_sessao_orcamentacao_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."proposals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "proposals_comentarios" ADD CONSTRAINT "proposals_comentarios_autor_id_users_id_fk" FOREIGN KEY ("autor_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "proposals_comentarios" ADD CONSTRAINT "proposals_comentarios_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."proposals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "proposals_activity_log" ADD CONSTRAINT "proposals_activity_log_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "proposals_activity_log" ADD CONSTRAINT "proposals_activity_log_parent_id_fk" FOREIGN KEY ("_parent_id") REFERENCES "public"."proposals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "proposals" ADD CONSTRAINT "proposals_account_id_users_id_fk" FOREIGN KEY ("account_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;
  ALTER TABLE "proposals_rels" ADD CONSTRAINT "proposals_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."proposals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "proposals_rels" ADD CONSTRAINT "proposals_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_locked_documents"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_media_fk" FOREIGN KEY ("media_id") REFERENCES "public"."media"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_proposals_fk" FOREIGN KEY ("proposals_id") REFERENCES "public"."proposals"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_materials_fk" FOREIGN KEY ("materials_id") REFERENCES "public"."materials"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_machines_fk" FOREIGN KEY ("machines_id") REFERENCES "public"."machines"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_internal_rates_fk" FOREIGN KEY ("internal_rates_id") REFERENCES "public"."internal_rates"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_locked_documents_rels" ADD CONSTRAINT "payload_locked_documents_rels_project_library_fk" FOREIGN KEY ("project_library_id") REFERENCES "public"."project_library"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_parent_fk" FOREIGN KEY ("parent_id") REFERENCES "public"."payload_preferences"("id") ON DELETE cascade ON UPDATE no action;
  ALTER TABLE "payload_preferences_rels" ADD CONSTRAINT "payload_preferences_rels_users_fk" FOREIGN KEY ("users_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;
  CREATE INDEX "users_sessions_order_idx" ON "users_sessions" USING btree ("_order");
  CREATE INDEX "users_sessions_parent_id_idx" ON "users_sessions" USING btree ("_parent_id");
  CREATE INDEX "users_updated_at_idx" ON "users" USING btree ("updated_at");
  CREATE INDEX "users_created_at_idx" ON "users" USING btree ("created_at");
  CREATE UNIQUE INDEX "users_email_idx" ON "users" USING btree ("email");
  CREATE INDEX "media_updated_at_idx" ON "media" USING btree ("updated_at");
  CREATE INDEX "media_created_at_idx" ON "media" USING btree ("created_at");
  CREATE UNIQUE INDEX "media_filename_idx" ON "media" USING btree ("filename");
  CREATE INDEX "proposals_sessao_orcamentacao_conversa_i_a_order_idx" ON "proposals_sessao_orcamentacao_conversa_i_a" USING btree ("_order");
  CREATE INDEX "proposals_sessao_orcamentacao_conversa_i_a_parent_id_idx" ON "proposals_sessao_orcamentacao_conversa_i_a" USING btree ("_parent_id");
  CREATE INDEX "proposals_sessao_orcamentacao_variantes_geradas_order_idx" ON "proposals_sessao_orcamentacao_variantes_geradas" USING btree ("_order");
  CREATE INDEX "proposals_sessao_orcamentacao_variantes_geradas_parent_id_idx" ON "proposals_sessao_orcamentacao_variantes_geradas" USING btree ("_parent_id");
  CREATE INDEX "proposals_sessao_orcamentacao_order_idx" ON "proposals_sessao_orcamentacao" USING btree ("_order");
  CREATE INDEX "proposals_sessao_orcamentacao_parent_id_idx" ON "proposals_sessao_orcamentacao" USING btree ("_parent_id");
  CREATE INDEX "proposals_comentarios_order_idx" ON "proposals_comentarios" USING btree ("_order");
  CREATE INDEX "proposals_comentarios_parent_id_idx" ON "proposals_comentarios" USING btree ("_parent_id");
  CREATE INDEX "proposals_comentarios_autor_idx" ON "proposals_comentarios" USING btree ("autor_id");
  CREATE INDEX "proposals_activity_log_order_idx" ON "proposals_activity_log" USING btree ("_order");
  CREATE INDEX "proposals_activity_log_parent_id_idx" ON "proposals_activity_log" USING btree ("_parent_id");
  CREATE INDEX "proposals_activity_log_user_idx" ON "proposals_activity_log" USING btree ("user_id");
  CREATE INDEX "proposals_account_idx" ON "proposals" USING btree ("account_id");
  CREATE INDEX "proposals_updated_at_idx" ON "proposals" USING btree ("updated_at");
  CREATE INDEX "proposals_created_at_idx" ON "proposals" USING btree ("created_at");
  CREATE INDEX "proposals_rels_order_idx" ON "proposals_rels" USING btree ("order");
  CREATE INDEX "proposals_rels_parent_idx" ON "proposals_rels" USING btree ("parent_id");
  CREATE INDEX "proposals_rels_path_idx" ON "proposals_rels" USING btree ("path");
  CREATE INDEX "proposals_rels_media_id_idx" ON "proposals_rels" USING btree ("media_id");
  CREATE INDEX "materials_updated_at_idx" ON "materials" USING btree ("updated_at");
  CREATE INDEX "materials_created_at_idx" ON "materials" USING btree ("created_at");
  CREATE INDEX "machines_updated_at_idx" ON "machines" USING btree ("updated_at");
  CREATE INDEX "machines_created_at_idx" ON "machines" USING btree ("created_at");
  CREATE INDEX "internal_rates_updated_at_idx" ON "internal_rates" USING btree ("updated_at");
  CREATE INDEX "internal_rates_created_at_idx" ON "internal_rates" USING btree ("created_at");
  CREATE INDEX "project_library_updated_at_idx" ON "project_library" USING btree ("updated_at");
  CREATE INDEX "project_library_created_at_idx" ON "project_library" USING btree ("created_at");
  CREATE UNIQUE INDEX "payload_kv_key_idx" ON "payload_kv" USING btree ("key");
  CREATE INDEX "payload_locked_documents_global_slug_idx" ON "payload_locked_documents" USING btree ("global_slug");
  CREATE INDEX "payload_locked_documents_updated_at_idx" ON "payload_locked_documents" USING btree ("updated_at");
  CREATE INDEX "payload_locked_documents_created_at_idx" ON "payload_locked_documents" USING btree ("created_at");
  CREATE INDEX "payload_locked_documents_rels_order_idx" ON "payload_locked_documents_rels" USING btree ("order");
  CREATE INDEX "payload_locked_documents_rels_parent_idx" ON "payload_locked_documents_rels" USING btree ("parent_id");
  CREATE INDEX "payload_locked_documents_rels_path_idx" ON "payload_locked_documents_rels" USING btree ("path");
  CREATE INDEX "payload_locked_documents_rels_users_id_idx" ON "payload_locked_documents_rels" USING btree ("users_id");
  CREATE INDEX "payload_locked_documents_rels_media_id_idx" ON "payload_locked_documents_rels" USING btree ("media_id");
  CREATE INDEX "payload_locked_documents_rels_proposals_id_idx" ON "payload_locked_documents_rels" USING btree ("proposals_id");
  CREATE INDEX "payload_locked_documents_rels_materials_id_idx" ON "payload_locked_documents_rels" USING btree ("materials_id");
  CREATE INDEX "payload_locked_documents_rels_machines_id_idx" ON "payload_locked_documents_rels" USING btree ("machines_id");
  CREATE INDEX "payload_locked_documents_rels_internal_rates_id_idx" ON "payload_locked_documents_rels" USING btree ("internal_rates_id");
  CREATE INDEX "payload_locked_documents_rels_project_library_id_idx" ON "payload_locked_documents_rels" USING btree ("project_library_id");
  CREATE INDEX "payload_preferences_key_idx" ON "payload_preferences" USING btree ("key");
  CREATE INDEX "payload_preferences_updated_at_idx" ON "payload_preferences" USING btree ("updated_at");
  CREATE INDEX "payload_preferences_created_at_idx" ON "payload_preferences" USING btree ("created_at");
  CREATE INDEX "payload_preferences_rels_order_idx" ON "payload_preferences_rels" USING btree ("order");
  CREATE INDEX "payload_preferences_rels_parent_idx" ON "payload_preferences_rels" USING btree ("parent_id");
  CREATE INDEX "payload_preferences_rels_path_idx" ON "payload_preferences_rels" USING btree ("path");
  CREATE INDEX "payload_preferences_rels_users_id_idx" ON "payload_preferences_rels" USING btree ("users_id");
  CREATE INDEX "payload_migrations_updated_at_idx" ON "payload_migrations" USING btree ("updated_at");
  CREATE INDEX "payload_migrations_created_at_idx" ON "payload_migrations" USING btree ("created_at");`)
}

export async function down({ db, payload, req }: MigrateDownArgs): Promise<void> {
  await db.execute(sql`
   DROP TABLE "users_sessions" CASCADE;
  DROP TABLE "users" CASCADE;
  DROP TABLE "media" CASCADE;
  DROP TABLE "proposals_sessao_orcamentacao_conversa_i_a" CASCADE;
  DROP TABLE "proposals_sessao_orcamentacao_variantes_geradas" CASCADE;
  DROP TABLE "proposals_sessao_orcamentacao" CASCADE;
  DROP TABLE "proposals_comentarios" CASCADE;
  DROP TABLE "proposals_activity_log" CASCADE;
  DROP TABLE "proposals" CASCADE;
  DROP TABLE "proposals_rels" CASCADE;
  DROP TABLE "materials" CASCADE;
  DROP TABLE "machines" CASCADE;
  DROP TABLE "internal_rates" CASCADE;
  DROP TABLE "project_library" CASCADE;
  DROP TABLE "payload_kv" CASCADE;
  DROP TABLE "payload_locked_documents" CASCADE;
  DROP TABLE "payload_locked_documents_rels" CASCADE;
  DROP TABLE "payload_preferences" CASCADE;
  DROP TABLE "payload_preferences_rels" CASCADE;
  DROP TABLE "payload_migrations" CASCADE;
  DROP TABLE "ai_settings" CASCADE;
  DROP TYPE "public"."enum_users_role";
  DROP TYPE "public"."enum_proposals_sessao_orcamentacao_conversa_i_a_role";
  DROP TYPE "public"."enum_proposals_sessao_orcamentacao_variantes_geradas_tipo";
  DROP TYPE "public"."nvl_conf";
  DROP TYPE "public"."enum_proposals_sessao_orcamentacao_nivel_confianca";
  DROP TYPE "public"."enum_proposals_sessao_orcamentacao_variante_selecionada";
  DROP TYPE "public"."enum_proposals_estado";
  DROP TYPE "public"."enum_proposals_motivo_perda";
  DROP TYPE "public"."enum_proposals_estado_criativo";`)
}
