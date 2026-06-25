import type { CollectionConfig } from 'payload'
import {
  canCreateProposal,
  canReadProposals,
  canUpdateProposal,
  isAdmin,
  creativeZoneWrite,
  budgetingZoneWrite,
  neverWrite,
} from '../lib/access'
import { generateProposalNumber } from '../hooks/beforeChange/generateProposalNumber'
import { validateTransition } from '../hooks/beforeChange/validateTransition'
import { logActivity } from '../hooks/afterChange/logActivity'
import { generateEstimate } from '../hooks/afterChange/generateEstimate'

export const Proposals: CollectionConfig = {
  slug: 'proposals',
  labels: { singular: 'Proposta', plural: 'Propostas' },
  hooks: {
    beforeChange: [generateProposalNumber, validateTransition],
    afterChange: [logActivity, generateEstimate],
  },
  admin: {
    useAsTitle: 'nomeProjeto',
    defaultColumns: ['numero', 'nomeProjeto', 'cliente', 'estado', 'createdAt'],
  },
  access: {
    read: canReadProposals,
    create: canCreateProposal,
    update: canUpdateProposal,
    delete: isAdmin,
  },
  fields: [
    // ── Identification ────────────────────────────────────────────────────────
    {
      name: 'numero',
      type: 'text',
      admin: {
        readOnly: true,
        position: 'sidebar',
        description: 'Gerado automaticamente: PROP-YYYY-NNN',
      },
      access: {
        create: neverWrite,
        update: neverWrite,
      },
    },

    // ── Estado ───────────────────────────────────────────────────────────────
    {
      name: 'estado',
      type: 'select',
      required: true,
      defaultValue: 'Recebida',
      admin: { position: 'sidebar' },
      options: [
        { label: 'Recebida', value: 'Recebida' },
        { label: 'Em Elaboração', value: 'EmElaboracao' },
        { label: 'Em Orçamentação', value: 'EmOrcamentacao' },
        { label: 'Enviada', value: 'Enviada' },
        { label: 'Ganha', value: 'Ganha' },
        { label: 'Perdida', value: 'Perdida' },
      ],
    },
    {
      name: 'motivoPerda',
      type: 'select',
      admin: {
        condition: (data) => data?.estado === 'Perdida',
        position: 'sidebar',
      },
      options: [
        { label: 'Preço', value: 'Preco' },
        { label: 'Concorrência', value: 'Concorrencia' },
        { label: 'Prazo', value: 'Prazo' },
        { label: 'Projecto cancelado', value: 'ProjetoCancelado' },
        { label: 'Fora do âmbito', value: 'ForaAmbito' },
        { label: 'Sem resposta do cliente', value: 'SemResposta' },
        { label: 'Outro', value: 'Outro' },
      ],
    },
    {
      name: 'detalhePerda',
      type: 'textarea',
      admin: {
        condition: (data) => data?.estado === 'Perdida',
      },
    },

    // ── Dados Base ────────────────────────────────────────────────────────────
    {
      name: 'nomeProjeto',
      type: 'text',
      required: true,
    },
    {
      name: 'cliente',
      type: 'text',
      required: true,
    },
    {
      name: 'account',
      type: 'relationship',
      relationTo: 'users',
      required: true,
      admin: { position: 'sidebar' },
    },
    {
      name: 'contactoNome',
      type: 'text',
    },
    {
      name: 'contactoEmail',
      type: 'email',
    },
    {
      name: 'contactoTelefone',
      type: 'text',
    },
    {
      name: 'prazoResposta',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayOnly', displayFormat: 'dd/MM/yyyy' },
      },
    },
    {
      name: 'briefing',
      type: 'richText',
    },
    {
      name: 'figmaLink',
      type: 'text',
      admin: { description: 'URL do ficheiro Figma — enviado como texto para o prompt da IA' },
      access: {
        create: creativeZoneWrite,
        update: creativeZoneWrite,
      },
    },
    {
      name: 'ficheirosAnexos',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
    },

    // ── Zona Criativa ─────────────────────────────────────────────────────────
    {
      name: 'memoriacriativa',
      label: 'Memória Criativa',
      type: 'richText',
      access: {
        create: creativeZoneWrite,
        update: creativeZoneWrite,
      },
    },
    {
      name: 'estadoCriativo',
      type: 'select',
      defaultValue: 'Rascunho',
      options: [
        { label: 'Rascunho', value: 'Rascunho' },
        { label: 'Em Revisão', value: 'EmRevisao' },
        { label: 'Aprovado', value: 'Aprovado' },
      ],
      access: {
        create: creativeZoneWrite,
        update: creativeZoneWrite,
      },
    },
    {
      name: 'maquetes',
      type: 'upload',
      relationTo: 'media',
      hasMany: true,
      access: {
        create: creativeZoneWrite,
        update: creativeZoneWrite,
      },
    },

    // ── Zona de Orçamentação ──────────────────────────────────────────────────
    {
      name: 'sessaoOrcamentacao',
      label: 'Sessões de Orçamentação',
      type: 'array',
      access: {
        create: budgetingZoneWrite,
        update: budgetingZoneWrite,
      },
      admin: { readOnly: true, description: 'Gerido automaticamente pelo motor de IA' },
      fields: [
        {
          name: 'sessaoId',
          type: 'text',
          admin: { readOnly: true },
        },
        {
          name: 'conversaIA',
          label: 'Conversa com IA',
          type: 'array',
          fields: [
            {
              name: 'role',
              type: 'select',
              options: [
                { label: 'Utilizador', value: 'user' },
                { label: 'Assistente', value: 'assistant' },
              ],
            },
            {
              name: 'content',
              type: 'textarea',
            },
            {
              name: 'timestamp',
              type: 'text',
            },
          ],
        },
        {
          name: 'estimativaAtual',
          label: 'Estimativa Actual',
          type: 'json',
        },
        {
          name: 'abordagemTecnica',
          label: 'Abordagem Técnica',
          type: 'textarea',
        },
        {
          name: 'nivelConfianca',
          label: 'Nível de Confiança',
          type: 'select',
          options: [
            { label: 'Alto', value: 'Alto' },
            { label: 'Médio', value: 'Medio' },
            { label: 'Baixo', value: 'Baixo' },
          ],
        },
        {
          name: 'nivelConfiancaJustificacao',
          label: 'Justificação do Nível de Confiança',
          type: 'textarea',
        },
        {
          name: 'variantesGeradas',
          label: 'Variantes Geradas',
          type: 'array',
          admin: { readOnly: true },
          fields: [
            {
              name: 'tipo',
              type: 'select',
              options: [
                { label: 'Otimista', value: 'Otimista' },
                { label: 'Equilibrada', value: 'Equilibrada' },
                { label: 'Conservadora', value: 'Conservadora' },
              ],
            },
            { name: 'estimativa', type: 'json' },
            { name: 'abordagemTecnica', type: 'textarea' },
            {
              name: 'nivelConfianca',
              dbName: 'nvl_conf',
              type: 'select',
              options: [
                { label: 'Alto', value: 'Alto' },
                { label: 'Médio', value: 'Medio' },
                { label: 'Baixo', value: 'Baixo' },
              ],
            },
            { name: 'nivelConfiancaJustificacao', type: 'textarea' },
          ],
        },
        {
          name: 'varianteSelecionada',
          label: 'Variante Seleccionada',
          type: 'select',
          options: [
            { label: 'Otimista', value: 'Otimista' },
            { label: 'Equilibrada', value: 'Equilibrada' },
            { label: 'Conservadora', value: 'Conservadora' },
          ],
          admin: { readOnly: true },
        },
        {
          name: 'variantesOrdemViolada',
          label: 'Ordenação das variantes violada',
          type: 'checkbox',
          defaultValue: false,
          admin: { readOnly: true, description: 'Verdadeiro se a IA não respeitou o constraint Otimista < Equilibrada < Conservadora.' },
        },
        {
          name: 'inputsUsados',
          label: 'Inputs Usados (snapshot)',
          type: 'json',
          admin: { readOnly: true },
        },
      ],
    },
    {
      name: 'estimativaEditada',
      label: 'Estimativa Editada',
      type: 'json',
      access: {
        create: budgetingZoneWrite,
        update: budgetingZoneWrite,
      },
    },
    {
      name: 'valorVendaFinal',
      label: 'Valor de Venda Final (€)',
      type: 'number',
      access: {
        create: budgetingZoneWrite,
        update: budgetingZoneWrite,
      },
    },
    {
      name: 'margemCalculada',
      label: 'Margem Calculada (%)',
      type: 'number',
      admin: { readOnly: true, description: '(Venda - Custo) / Venda × 100' },
      access: {
        create: neverWrite,
        update: neverWrite,
      },
    },
    {
      name: 'condicoesPagamento',
      label: 'Condições de Pagamento',
      type: 'textarea',
      access: {
        create: budgetingZoneWrite,
        update: budgetingZoneWrite,
      },
    },
    {
      name: 'validadeProposta',
      label: 'Validade da Proposta',
      type: 'date',
      admin: {
        date: { pickerAppearance: 'dayOnly', displayFormat: 'dd/MM/yyyy' },
      },
      access: {
        create: budgetingZoneWrite,
        update: budgetingZoneWrite,
      },
    },

    // ── Colaboração ───────────────────────────────────────────────────────────
    {
      name: 'comentarios',
      label: 'Comentários',
      type: 'array',
      fields: [
        {
          name: 'autor',
          type: 'relationship',
          relationTo: 'users',
          required: true,
        },
        {
          name: 'texto',
          type: 'textarea',
          required: true,
        },
        {
          name: 'timestamp',
          type: 'text',
        },
      ],
    },
    {
      name: 'activityLog',
      label: 'Log de Actividade',
      type: 'array',
      admin: { readOnly: true, description: 'Apenas leitura — escrito automaticamente pelos hooks' },
      access: {
        create: neverWrite,
        update: neverWrite,
      },
      fields: [
        {
          name: 'evento',
          type: 'text',
        },
        {
          name: 'user',
          type: 'relationship',
          relationTo: 'users',
        },
        {
          name: 'timestamp',
          type: 'text',
        },
      ],
    },
  ],
}
