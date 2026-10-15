import { readFile } from 'node:fs/promises'
import { createModel, recommend } from '../server/recommender/engine'
import type { Algorithm, Dataset } from '../shared/types'

function random(seed: number) {
  return () => {
    let value = (seed += 0x6d2b79f5)
    value = Math.imul(value ^ (value >>> 15), value | 1)
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61)
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296
  }
}
function shuffle<T>(items: T[], rng: () => number): T[] {
  const result = [...items]
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    ;[result[i], result[j]] = [result[j]!, result[i]!]
  }
  return result
}

const dataset: Dataset = JSON.parse(
  await readFile(new URL('../movies.json', import.meta.url), 'utf8'),
)
const groups = new Map<string, Dataset['users']>()
for (const user of dataset.users) {
  const key = [...user.movies].sort((a, b) => a - b).join(',')
  groups.set(key, [...(groups.get(key) ?? []), user])
}
const shuffled = shuffle([...groups.values()], random(42))
const split = Math.floor(shuffled.length * 0.8)
const training = shuffled.slice(0, split).flat()
const testing = shuffled
  .slice(split)
  .flat()
  .filter((user) => user.movies.length >= 6)
const model = createModel({ movies: dataset.movies, users: training })
const algorithms: Algorithm[] = ['user', 'item', 'popularity']
console.log(
  `Seed 42; grouped 80/20 split; ${training.length} training users; ${testing.length} eligible test users.`,
)
console.log(
  'Identical profiles never cross partitions. Each test user has at least six known positive preferences.',
)
console.log('| Known likes | Method | Recall@5 | Hit Rate@5 | Observed Precision@5 |')
console.log('| --- | --- | --- | --- | --- |')
for (const count of [1, 3, 5]) {
  const cases = testing.map((user) => {
    const likes = shuffle(
      [...user.movies].sort((a, b) => a - b),
      random(42 + user.user_id),
    )
    return { known: likes.slice(0, count), hidden: new Set(likes.slice(count)) }
  })
  for (const algorithm of algorithms) {
    let recall = 0,
      hitRate = 0,
      precision = 0
    for (const { known, hidden } of cases) {
      const result = recommend(model, known, algorithm, 5)
      const hits = result.recommendations.filter((item) => hidden.has(item.movieId)).length
      recall += hits / hidden.size
      hitRate += Number(hits > 0)
      precision += hits / 5
    }
    const percent = (value: number) => `${((100 * value) / cases.length).toFixed(2)}%`
    console.log(
      `| ${count} | ${algorithm} | ${percent(recall)} | ${percent(hitRate)} | ${percent(precision)} |`,
    )
  }
}
console.log(
  'These metrics measure recovery of recorded positives, not true accuracy, dislike prediction or calibrated probability.',
)
