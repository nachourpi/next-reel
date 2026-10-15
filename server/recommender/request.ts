import type { RecommendationRequest } from '../../shared/types'
import { DEFAULT_PARAMETERS } from '../../shared/recommendation'

export function parseRecommendationRequest(
  body: unknown,
  validIds: Set<number>,
): RecommendationRequest {
  if (!body || typeof body !== 'object' || Array.isArray(body))
    throw new Error('Send an object containing likedMovieIds.')
  const input = body as Record<string, unknown>
  if (!Array.isArray(input.likedMovieIds) || input.likedMovieIds.length > 1000)
    throw new Error('likedMovieIds must be an array of movie IDs (at most 1,000 entries).')
  if (input.likedMovieIds.some((id) => !Number.isInteger(id) || !validIds.has(id)))
    throw new Error('Every selected movie ID must belong to the catalog.')
  if (input.compare !== undefined && typeof input.compare !== 'boolean')
    throw new Error('compare must be true or false.')
  if (input.limit !== undefined && input.limit !== 5 && input.limit !== 10)
    throw new Error('limit must be 5 or 10.')
  const parameters = { ...DEFAULT_PARAMETERS }
  if (input.parameters !== undefined) {
    if (
      !input.parameters ||
      typeof input.parameters !== 'object' ||
      Array.isArray(input.parameters)
    )
      throw new Error('parameters must be an object.')
    const options = input.parameters as Record<string, unknown>
    if (options.neighbors !== undefined) {
      if (
        !Number.isInteger(options.neighbors) ||
        Number(options.neighbors) < 1 ||
        Number(options.neighbors) > 100
      )
        throw new Error('neighbors must be an integer from 1 to 100.')
      parameters.neighbors = options.neighbors as number
    }
    for (const metric of ['userMetric', 'itemMetric'] as const) {
      if (options[metric] !== undefined) {
        if (options[metric] !== 'cosine' && options[metric] !== 'jaccard')
          throw new Error(`${metric} must be cosine or jaccard.`)
        parameters[metric] = options[metric]
      }
    }
    if (options.itemAggregation !== undefined) {
      if (options.itemAggregation !== 'mean' && options.itemAggregation !== 'max')
        throw new Error('itemAggregation must be mean or max.')
      parameters.itemAggregation = options.itemAggregation
    }
  }
  return {
    likedMovieIds: [...new Set(input.likedMovieIds as number[])],
    compare: input.compare === true,
    limit: input.limit === 5 ? 5 : 10,
    parameters,
  }
}
