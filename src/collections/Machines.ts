import type { CollectionConfig } from 'payload'
import { isAdmin, isAuthenticated } from '../lib/access'

export const Machines: CollectionConfig = {
  slug: 'machines',
  admin: {
    useAsTitle: 'nome',
    defaultColumns: ['nome', 'tipo', 'disponivel'],
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
      name: 'tipo',
      type: 'text',
      admin: { description: 'Ex: Impressão, Corte, Fresagem' },
    },
    {
      name: 'descricao',
      label: 'Descrição',
      type: 'textarea',
    },
    {
      name: 'disponivel',
      label: 'Disponível',
      type: 'checkbox',
      defaultValue: true,
      admin: { position: 'sidebar' },
    },
  ],
}
