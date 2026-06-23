import type { GlobalConfig } from 'payload'
import { isAdmin } from '../lib/access'
import { ESTIMATE_DEFAULT_RULES } from '../lib/ai/prompts/estimateSystem'

export const AiSettings: GlobalConfig = {
  slug: 'ai-settings',
  label: 'Configurações de IA — Orçamentação',
  admin: {
    group: 'Configurações',
    description:
      'Regras operacionais que a IA segue ao gerar estimativas de orçamentação. Alterações entram em vigor na próxima geração.',
  },
  access: {
    read: () => true,
    update: isAdmin,
  },
  fields: [
    {
      name: 'regrasOrcamentacao',
      type: 'textarea',
      label: 'Regras de Orçamentação',
      admin: {
        description:
          'Define as regras de produção, pressupostos e directrizes que a IA deve seguir. Inclui a cadeia de produção, erros comuns a evitar e regras de utilização da base de conhecimento.',
        rows: 30,
      },
      defaultValue: ESTIMATE_DEFAULT_RULES,
    },
  ],
}
