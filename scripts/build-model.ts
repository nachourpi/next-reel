import { readFile, mkdir, writeFile } from 'node:fs/promises'
import { createModel } from '../server/recommender/engine'
import type { Dataset } from '../shared/types'

const dataset = JSON.parse(
  await readFile(new URL('../movies.json', import.meta.url), 'utf8'),
) as Dataset
const knownIds = new Set(Object.keys(dataset.movies).map(Number))
if (dataset.users.some((user) => user.movies.some((id) => !knownIds.has(id))))
  throw new Error('Dataset contains an unknown movie ID.')
const model = createModel(dataset)
await mkdir(new URL('../.generated/', import.meta.url), { recursive: true })
await writeFile(new URL('../.generated/model.json', import.meta.url), JSON.stringify(model))
console.log(`Prepared ${model.movieIds.length} movies and ${model.userCount} preference profiles.`)
