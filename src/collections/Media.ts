import type { CollectionConfig } from 'payload'
import { isAuthenticated, isAdmin } from '../lib/access'

export const Media: CollectionConfig = {
  slug: 'media',
  admin: {
    defaultColumns: ['filename', 'alt', 'createdAt'],
  },
  access: {
    read: isAuthenticated,
    create: isAuthenticated,
    update: isAdmin,
    delete: isAdmin,
  },
  upload: {
    mimeTypes: ['image/jpeg', 'image/png', 'application/pdf'],
  },
  fields: [
    {
      name: 'alt',
      type: 'text',
    },
  ],
}
