import type {
  Algorithm,
  Dataset,
  Recommendation,
  RecommendationResult,
  RecommendationParameters,
  SimilarityMetric,
} from '../../shared/types'
import { DEFAULT_PARAMETERS } from '../../shared/recommendation'

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

export function similarity(
  shared: number,
  left: number,
  right: number,
  metric: SimilarityMetric,
): number {
  const denominator = metric === 'cosine' ? Math.sqrt(left * right) : left + right - shared
  return denominator ? shared / denominator : 0
}

export function findNeighbors(
  model: Model,
  selectedIds: number[],
  parameters: RecommendationParameters,
) {
  const selected = new Set(selectedIds)
  const eligible = model.users
    .map((likes, index) => {
      const sharedMovieIds = likes.filter((id) => selected.has(id))
      return {
        likes,
        index,
        sharedMovieIds,
        similarity: similarity(
          sharedMovieIds.length,
          selected.size,
          likes.length,
          parameters.userMetric,
        ),
      }
    })
    .filter((user) => user.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity || a.index - b.index)
  return { eligibleCount: eligible.length, neighbors: eligible.slice(0, parameters.neighbors) }
}

export function findAssociations(
  model: Model,
  selectedIds: number[],
  movieId: number,
  parameters: RecommendationParameters,
) {
  return [...new Set(selectedIds)]
    .map((id) => {
      const favoriteViewers = model.popularity[id] ?? 0
      const movieViewers = model.popularity[movieId] ?? 0
      const sharedViewers = Math.round(
        (model.similarities[movieId]?.[id] ?? 0) * Math.sqrt(favoriteViewers * movieViewers),
      )
      return {
        movieId: id,
        favoriteViewers,
        sharedViewers,
        similarity: similarity(sharedViewers, favoriteViewers, movieViewers, parameters.itemMetric),
      }
    })
    .sort((a, b) => b.similarity - a.similarity || a.movieId - b.movieId)
}

export function combineAssociations(values: number[], aggregation: 'mean' | 'max'): number {
  if (!values.length) return 0
  return aggregation === 'max'
    ? Math.max(...values)
    : values.reduce((sum, value) => sum + value, 0) / values.length
}

export function recommend(
  model: Model,
  selectedIds: number[],
  algorithm: Algorithm = 'user',
  limit = 10,
  parameters: RecommendationParameters = DEFAULT_PARAMETERS,
): RecommendationResult {
  const selected = new Set(selectedIds)
  const candidates = model.movieIds.filter((id) => !selected.has(id))

  const popular = (fallback = false): RecommendationResult => ({
    algorithm: 'popularity',
    requestedAlgorithm: algorithm,
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
  if (!candidates.length)
    return { algorithm, requestedAlgorithm: algorithm, fallback: false, recommendations: [] }

  if (algorithm === 'item') {
    const recommendations = candidates
      .map((movieId) => {
        const associations = findAssociations(model, selectedIds, movieId, parameters)
        const strongest = associations[0]!
        return {
          movieId,
          score: combineAssociations(
            associations.map((item) => item.similarity),
            parameters.itemAggregation,
          ),
          supportingMovieId: strongest.movieId,
          reason: `Often picked alongside ${model.titles[strongest.movieId]}.`,
        }
      })
      .filter((item) => item.score > 0)
    return recommendations.length
      ? {
          algorithm,
          requestedAlgorithm: algorithm,
          fallback: false,
          recommendations: rank(recommendations, limit),
        }
      : popular(true)
  }

  const { neighbors } = findNeighbors(model, selectedIds, parameters)
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
        requestedAlgorithm: algorithm,
        fallback: false,
        neighborCount: neighbors.length,
        recommendations: rank(recommendations, limit),
      }
    : popular(true)
}
