import 'dotenv/config'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local', override: true })
import { getPayload } from 'payload'
import config from '@payload-config'

const payload = await getPayload({ config })
const all = await payload.find({ collection: 'proposals', limit: 200, overrideAccess: true })
console.log(`Deleting ${all.totalDocs} proposals...`)
for (const p of all.docs) {
  await payload.delete({ collection: 'proposals', id: p.id, overrideAccess: true })
  console.log('  ✓', p.nomeProjeto)
}
console.log('Done.')
process.exit(0)
