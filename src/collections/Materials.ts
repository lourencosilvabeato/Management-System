import type { CollectionConfig } from 'payload'
import { isAdmin, isAuthenticated } from '../lib/access'

export const Materials: CollectionConfig = {
  slug: 'materials',
  admin: {
    useAsTitle: 'nome',
    defaultColumns: ['nome', 'referencia', 'unidade', 'custoMedio', 'ativo'],
  },
  access: {
    read: isAuthenticated,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'nome',
      type: 'text',
      required: true,
    },
    {
      name: 'referencia',
      label: 'Referência',
      type: 'text',
    },
    {
      name: 'unidade',
      type: 'text',
      required: true,
      admin: { description: 'Ex: m², m linear, un, kg' },
    },
    {
      name: 'custoMedio',
      label: 'Custo Médio (€)',
      type: 'number',
      required: true,
    },
    {
      name: 'notas',
      type: 'textarea',
    },
    {
      name: 'ativo',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
  ],
}
