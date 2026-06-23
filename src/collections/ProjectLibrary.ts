import type { CollectionConfig } from 'payload'
import { isAdmin, isAuthenticated } from '../lib/access'

export const ProjectLibrary: CollectionConfig = {
  slug: 'project-library',
  admin: {
    useAsTitle: 'nome',
    defaultColumns: ['nome', 'tipo', 'ano'],
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
      admin: { description: 'Ex: Stand, Sinalética, Totem, Instalação' },
    },
    {
      name: 'ano',
      type: 'number',
    },
    {
      name: 'descricao',
      label: 'Descrição',
      type: 'textarea',
    },
    {
      name: 'estruturaCustos',
      label: 'Estrutura de Custos',
      type: 'json',
      admin: { description: 'JSON com items e rubricas — utilizado como referência de benchmarking pela IA' },
    },
    {
      name: 'notas',
      type: 'textarea',
    },
  ],
}
