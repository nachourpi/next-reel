import type { Algorithm, RecommendationParameters } from './types'

export const DEFAULT_PARAMETERS: Readonly<RecommendationParameters> = Object.freeze({
  neighbors: 40,
  userMetric: 'cosine',
  itemMetric: 'cosine',
  itemAggregation: 'mean',
})

export const METHODS = [
  { id: 'user', name: 'User-Based KNN', description: 'People with shared taste' },
  { id: 'item', name: 'Item-Based', description: 'Films picked together' },
  { id: 'popularity', name: 'Popularity', description: 'The community’s favorites' },
] as const

export function explanationLink(
  algorithm: Algorithm,
  movieId: number,
  likedMovieIds: number[],
  parameters: RecommendationParameters,
): string {
  const query = new URLSearchParams({
    method: algorithm,
    movie: String(movieId),
    likes: likedMovieIds.join(','),
    neighbors: String(parameters.neighbors),
    userMetric: parameters.userMetric,
    itemMetric: parameters.itemMetric,
    aggregation: parameters.itemAggregation,
  })
  return `/explain?${query}`
}
