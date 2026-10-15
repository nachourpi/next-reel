import type { RecommendationRequest } from '../../shared/types'

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
  return {
    likedMovieIds: [...new Set(input.likedMovieIds as number[])],
    compare: input.compare === true,
    limit: input.limit === 5 ? 5 : 10,
  }
}
