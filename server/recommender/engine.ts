import type { Algorithm, Dataset, Recommendation, RecommendationResult } from '../../shared/types'

export interface Model {
  movieIds: number[]
  titles: Record<number, string>
  users: number[][]
  userCount: number
  popularity: Record<number, number>
  similarities: Record<number, Record<number, number>>
}

export function createModel(dataset: Dataset): Model {
  const movieIds = Object.keys(dataset.movies)
    .map(Number)
    .sort((a, b) => a - b)
  const users = dataset.users.map((user) => [...new Set(user.movies)])
  const popularity = Object.fromEntries(movieIds.map((id) => [id, 0]))
  const coLikes = Object.fromEntries(
    movieIds.map((id) => [id, Object.fromEntries(movieIds.map((other) => [other, 0]))]),
  )

  for (const likes of users) {
    for (const id of likes) {
      popularity[id]!++
      for (const other of likes) coLikes[id]![other]!++
    }
  }

  const similarities = Object.fromEntries(
    movieIds.map((id) => [
      id,
      Object.fromEntries(
        movieIds.map((other) => {
          const denominator = Math.sqrt(popularity[id]! * popularity[other]!)
          return [other, denominator ? coLikes[id]![other]! / denominator : 0]
        }),
      ),
    ]),
  )

  return {
    movieIds,
    users,
    userCount: users.length,
    popularity,
    similarities,
    titles: Object.fromEntries(
      Object.entries(dataset.movies).map(([id, title]) => [
        Number(id),
        title.replace(/ \(\d{4}\)$/, '').replace(/^(.*), (The|An|A)$/, '$2 $1'),
      ]),
    ),
  }
}

function rank(candidates: Recommendation[], limit: number): Recommendation[] {
  return candidates.sort((a, b) => b.score - a.score || a.movieId - b.movieId).slice(0, limit)
}

export function recommend(
  model: Model,
  selectedIds: number[],
  algorithm: Algorithm = 'user',
  limit = 10,
): RecommendationResult {
  const selected = new Set(selectedIds)
  const candidates = model.movieIds.filter((id) => !selected.has(id))

  const popular = (fallback = false): RecommendationResult => ({
    algorithm: 'popularity',
    fallback,
    recommendations: rank(
      candidates.map((movieId) => ({
        movieId,
        score: model.userCount ? model.popularity[movieId]! / model.userCount : 0,
        supportingUsers: model.popularity[movieId]!,
        reason: `${model.popularity[movieId]} of ${model.userCount} viewers picked this film.`,
      })),
      limit,
    ),
  })

  if (!selected.size || algorithm === 'popularity') return popular()
  if (!candidates.length) return { algorithm, fallback: false, recommendations: [] }

  if (algorithm === 'item') {
    const recommendations = candidates
      .map((movieId) => {
        const associations = [...selected]
          .map((id) => ({ id, similarity: model.similarities[movieId]?.[id] ?? 0 }))
          .sort((a, b) => b.similarity - a.similarity || a.id - b.id)
        const strongest = associations[0]!
        return {
          movieId,
          score: associations.reduce((sum, item) => sum + item.similarity, 0) / selected.size,
          supportingMovieId: strongest.id,
          reason: `Often picked alongside ${model.titles[strongest.id]}.`,
        }
      })
      .filter((item) => item.score > 0)
    return recommendations.length
      ? { algorithm, fallback: false, recommendations: rank(recommendations, limit) }
      : popular(true)
  }

  const neighbors = model.users
    .map((likes, index) => ({
      likes,
      index,
      similarity: likes.length
        ? likes.filter((id) => selected.has(id)).length / Math.sqrt(selected.size * likes.length)
        : 0,
    }))
    .filter((user) => user.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity || a.index - b.index)
    .slice(0, 40)
  const totalWeight = neighbors.reduce((sum, user) => sum + user.similarity, 0)
  if (!totalWeight) return popular(true)

  const weights = new Map<number, number>()
  const support = new Map<number, number>()
  for (const neighbor of neighbors) {
    for (const id of neighbor.likes) {
      weights.set(id, (weights.get(id) ?? 0) + neighbor.similarity)
      support.set(id, (support.get(id) ?? 0) + 1)
    }
  }
  const recommendations = candidates
    .filter((id) => weights.has(id))
    .map((movieId) => ({
      movieId,
      score: weights.get(movieId)! / totalWeight,
      supportingUsers: support.get(movieId)!,
      reason: `${support.get(movieId)} of ${neighbors.length} similar viewers liked this film.`,
    }))
  return recommendations.length
    ? {
        algorithm,
        fallback: false,
        neighborCount: neighbors.length,
        recommendations: rank(recommendations, limit),
      }
    : popular(true)
}
