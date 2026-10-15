import model from '../../.generated/model.json'
import { recommend, type Model } from '../recommender/engine'
import { parseRecommendationRequest } from '../recommender/request'
import type { Algorithm, RecommendationResponse } from '../../shared/types'

const validIds = new Set(model.movieIds)

export default defineEventHandler(async (event): Promise<RecommendationResponse> => {
  setHeader(event, 'Cache-Control', 'no-store')
  let request
  try {
    request = parseRecommendationRequest(await readBody(event), validIds)
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : 'Invalid recommendation request.',
    })
  }
  const { likedMovieIds, compare, limit } = request
  const algorithms: Algorithm[] = !likedMovieIds.length
    ? ['popularity']
    : compare
      ? ['user', 'item', 'popularity']
      : ['user']
  return {
    mode: likedMovieIds.length ? 'personalized' : 'popular',
    results: algorithms.map((algorithm) =>
      recommend(model as Model, likedMovieIds, algorithm, limit),
    ),
  }
})
