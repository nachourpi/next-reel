import { readdir, readFile, access } from 'node:fs/promises'
import { join } from 'node:path'

const root = new URL('../.output/public/', import.meta.url).pathname
await access(join(root, 'index.html'))
await access(join(root, 'explain/index.html'))

async function inspect(directory: string): Promise<void> {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (entry.name === '_worker.js') continue
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await inspect(path)
    else if (/\.(html|js|json|mjs|map|css)$/.test(entry.name)) {
      const content = await readFile(path, 'utf8')
      if (/user_id|TMDB_READ_ACCESS_TOKEN|eyJhbGciOiJIUzI1NiJ9|"similarities":/.test(content)) {
        throw new Error(`Private model data or credentials found in public asset: ${path}`)
      }
    }
  }
}
await inspect(root)
console.log('Public build checked: no historical profiles, model matrix or TMDB credentials.')
