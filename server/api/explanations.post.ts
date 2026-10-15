import model from '../../.generated/model.json'
import { parseRecommendationRequest } from '../recommender/request'
import { explainRecommendation } from '../recommender/explain'
import type { Model } from '../recommender/engine'
import type { Algorithm, ExplanationResponse } from '../../shared/types'

const validIds = new Set(model.movieIds)

export default defineEventHandler(async (event): Promise<ExplanationResponse> => {
  setHeader(event, 'Cache-Control', 'no-store')
  try {
    const body: unknown = await readBody(event)
    const request = parseRecommendationRequest(body, validIds)
    const input = body as Record<string, unknown>
    const algorithm = input.algorithm === undefined ? 'user' : input.algorithm
    if (!['user', 'item', 'popularity'].includes(algorithm as string))
      throw new Error('Choose user, item or popularity as the algorithm.')
    if (
      input.movieId !== undefined &&
      (!Number.isInteger(input.movieId) || !validIds.has(input.movieId as number))
    )
      throw new Error('movieId must belong to the catalog.')
    return explainRecommendation(
      model as Model,
      request.likedMovieIds,
      algorithm as Algorithm,
      input.movieId as number | undefined,
      request.parameters,
    )
  } catch (error) {
    throw createError({
      statusCode: 400,
      statusMessage: error instanceof Error ? error.message : 'Invalid explanation request.',
    })
  }
})
