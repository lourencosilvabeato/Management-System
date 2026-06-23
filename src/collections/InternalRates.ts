import type { CollectionConfig } from 'payload'
import { isAdmin, isAuthenticated } from '../lib/access'

export const InternalRates: CollectionConfig = {
  slug: 'internal-rates',
  labels: { singular: 'Taxa Interna', plural: 'Taxas Internas' },
  admin: {
    useAsTitle: 'perfil',
    defaultColumns: ['perfil', 'departamento', 'custoHora'],
  },
  access: {
    read: isAuthenticated,
    create: isAdmin,
    update: isAdmin,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'perfil',
      type: 'text',
      required: true,
      admin: { description: 'Ex: Montador, Designer, Técnico de Impressão' },
    },
    {
      name: 'departamento',
      type: 'text',
      required: true,
      admin: { description: 'Ex: Produção, Criativo, Comercial' },
    },
    {
      name: 'custoHora',
      label: 'Custo / Hora (€)',
      type: 'number',
      required: true,
    },
  ],
}
