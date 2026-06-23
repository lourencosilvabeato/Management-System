import type { CollectionConfig } from 'payload'
import { isAdmin, isAdminOrSelf, adminOnlyWrite } from '../lib/access'

export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'Utilizador', plural: 'Utilizadores' },
  auth: true,
  admin: {
    useAsTitle: 'nome',
    defaultColumns: ['nome', 'email', 'role'],
  },
  access: {
    read: isAdminOrSelf,
    create: isAdmin,
    update: isAdminOrSelf,
    delete: isAdmin,
  },
  fields: [
    {
      name: 'nome',
      type: 'text',
      required: true,
    },
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'account',
      saveToJWT: true,
      options: [
        { label: 'Account', value: 'account' },
        { label: 'Criativo', value: 'criativo' },
        { label: 'Produção', value: 'producao' },
        { label: 'Admin', value: 'admin' },
      ],
      access: {
        update: adminOnlyWrite,
      },
    },
  ],
}
