import { postgresAdapter } from '@payloadcms/db-postgres'
import { lexicalEditor } from '@payloadcms/richtext-lexical'
import { s3Storage } from '@payloadcms/storage-s3'
import path from 'path'
import { buildConfig } from 'payload'
import { fileURLToPath } from 'url'
import sharp from 'sharp'

import { Users } from './collections/Users'
import { Media } from './collections/Media'
import { Proposals } from './collections/Proposals'
import { Materials } from './collections/Materials'
import { Machines } from './collections/Machines'
import { InternalRates } from './collections/InternalRates'
import { ProjectLibrary } from './collections/ProjectLibrary'
import { AiSettings } from './globals/AiSettings'

const filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(filename)

const r2Configured = Boolean(process.env.CLOUDFLARE_R2_BUCKET)

export default buildConfig({
  admin: {
    user: Users.slug,
    importMap: {
      baseDir: path.resolve(dirname),
    },
  },
  collections: [Users, Media, Proposals, Materials, Machines, InternalRates, ProjectLibrary],
  globals: [AiSettings],
  editor: lexicalEditor(),
  secret: process.env.PAYLOAD_SECRET || '',
  typescript: {
    outputFile: path.resolve(dirname, 'payload-types.ts'),
  },
  db: postgresAdapter({
    pool: {
      connectionString: process.env.DATABASE_URI || '',
    },
  }),
  sharp,
  plugins: [
    ...(r2Configured
      ? [
          s3Storage({
            collections: { media: true },
            bucket: process.env.CLOUDFLARE_R2_BUCKET || '',
            config: {
              credentials: {
                accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY || '',
                secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_KEY || '',
              },
              region: 'auto',
              endpoint: process.env.CLOUDFLARE_R2_ENDPOINT || '',
            },
          }),
        ]
      : []),
  ],
})
