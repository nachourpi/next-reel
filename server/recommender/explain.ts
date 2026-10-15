import { findAssociations, findNeighbors, recommend, type Model } from './engine'
import type {
  Algorithm,
  ExplanationResponse,
  RecommendationParameters,
  CalculationTrace,
} from '../../shared/types'
import { DEFAULT_PARAMETERS } from '../../shared/recommendation'

export function explainRecommendation(
  model: Model,
  selectedIds: number[],
  requestedAlgorithm: Algorithm,
  movieId?: number,
  parameters: RecommendationParameters = DEFAULT_PARAMETERS,
): ExplanationResponse {
  const likedMovieIds = [...new Set(selectedIds)]
  const result = recommend(
    model,
    likedMovieIds,
    requestedAlgorithm,
    model.movieIds.length,
    parameters,
  )
  const target = movieId ?? result.recommendations[0]?.movieId
  if (target === undefined)
    throw new Error('Choose fewer favorites to leave room for a recommendation.')
  if (!model.movieIds.includes(target) || likedMovieIds.includes(target))
    throw new Error('Choose a catalog movie that is not already in your favorites.')
  let trace: CalculationTrace
  if (result.algorithm === 'user') {
    const { neighbors, eligibleCount } = findNeighbors(model, likedMovieIds, parameters)
    const evidence = neighbors.map((neighbor, index) => ({
      rank: index + 1,
      sharedMovieIds: neighbor.sharedMovieIds,
      profileSize: neighbor.likes.length,
      similarity: neighbor.similarity,
      pickedMovie: neighbor.likes.includes(target),
      contribution: neighbor.likes.includes(target) ? neighbor.similarity : 0,
    }))
    trace = {
      kind: 'user',
      eligibleNeighbors: eligibleCount,
      neighbors: evidence,
      numerator: evidence.reduce((sum, item) => sum + item.contribution, 0),
      denominator: evidence.reduce((sum, item) => sum + item.similarity, 0),
    }
  } else if (result.algorithm === 'item') {
    const associations = findAssociations(model, likedMovieIds, target, parameters)
    trace = {
      kind: 'item',
      associations,
      numerator:
        parameters.itemAggregation === 'max'
          ? Math.max(...associations.map((item) => item.similarity))
          : associations.reduce((sum, item) => sum + item.similarity, 0),
      denominator: parameters.itemAggregation === 'max' ? 1 : associations.length,
    }
  } else {
    const picked = model.popularity[target] ?? 0
    trace = {
      kind: 'popularity',
      picked,
      unknown: model.userCount - picked,
      numerator: picked,
      denominator: model.userCount,
    }
  }
  const rank = result.recommendations.findIndex((item) => item.movieId === target)
  return {
    requestedAlgorithm,
    algorithm: result.algorithm,
    fallback: result.fallback,
    movieId: target,
    score: trace.denominator ? trace.numerator / trace.denominator : 0,
    rank: rank < 0 ? null : rank + 1,
    likedMovieIds,
    parameters,
    userCount: model.userCount,
    candidateCount: model.movieIds.length - likedMovieIds.length,
    movieViewers: model.popularity[target] ?? 0,
    trace,
  }
}
