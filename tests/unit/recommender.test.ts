import { describe, expect, it } from 'vitest'
import { createModel, recommend } from '../../server/recommender/engine'
import { parseRecommendationRequest } from '../../server/recommender/request'
import type { Dataset } from '../../shared/types'
import { DEFAULT_PARAMETERS } from '../../shared/recommendation'
import { explainRecommendation } from '../../server/recommender/explain'
import fullModel from '../../.generated/model.json'

const dataset: Dataset = {
  movies: { 1: 'One', 2: 'Two', 3: 'Three', 4: 'Four', 5: 'Five' },
  users: [
    { user_id: 1, movies: [1, 2] },
    { user_id: 2, movies: [1, 3, 4] },
    { user_id: 3, movies: [3, 4] },
  ],
}
const model = createModel(dataset)

describe('recommendations', () => {
  it('uses popularity for cold start, with stable ID ordering for ties', () => {
    const result = recommend(model, [])
    expect(result.algorithm).toBe('popularity')
    expect(result.recommendations.map((item) => item.movieId)).toEqual([1, 3, 4, 2, 5])
    expect(result.recommendations[0]!.score).toBeCloseTo(2 / 3)
  })
  it('weights nearer neighbors more strongly without treating missing likes as negatives', () => {
    const result = recommend(model, [1])
    expect(result.neighborCount).toBe(2)
    expect(result.recommendations.map((item) => item.movieId)).toEqual([2, 3, 4])
    const expected = 1 / Math.sqrt(2) / (1 / Math.sqrt(2) + 1 / Math.sqrt(3))
    expect(result.recommendations[0]!.score).toBeCloseTo(expected)
    expect(result.recommendations[0]!.supportingUsers).toBe(1)
  })
  it('computes item cosine and averages it across selected movies', () => {
    expect(model.similarities[1]![2]).toBeCloseTo(1 / Math.sqrt(2))
    const result = recommend(model, [1, 3], 'item')
    const fourth = result.recommendations.find((item) => item.movieId === 4)!
    expect(fourth.score).toBeCloseTo((0.5 + 1) / 2)
    expect(fourth.supportingMovieId).toBe(3)
  })
  it.each(['user', 'item', 'popularity'] as const)(
    'excludes selections and bounds %s scores',
    (algorithm) => {
      const result = recommend(model, [1, 3], algorithm)
      expect(
        result.recommendations.every(
          (item) => ![1, 3].includes(item.movieId) && item.score >= 0 && item.score <= 1,
        ),
      ).toBe(true)
    },
  )
  it.each(['user', 'item'] as const)(
    'labels unsupported %s personalization as a popularity fallback',
    (algorithm) => {
      const result = recommend(model, [5], algorithm)
      expect(result.fallback).toBe(true)
      expect(result.algorithm).toBe('popularity')
      expect(result.recommendations.some((item) => item.movieId === 5)).toBe(false)
    },
  )
  it('does not fabricate recommendations when every film is selected', () => {
    expect(recommend(model, [1, 2, 3, 4, 5]).recommendations).toEqual([])
  })
  it('caps neighbors at forty and respects the requested result count', () => {
    const large = createModel({
      movies: dataset.movies,
      users: Array.from({ length: 50 }, (_, user_id) => ({ user_id, movies: [1, 2, 3] })),
    })
    expect(recommend(large, [1], 'user', 1).neighborCount).toBe(40)
    expect(recommend(large, [1], 'user', 1).recommendations).toHaveLength(1)
  })
})

describe('request validation', () => {
  const ids = new Set([1, 2, 3])
  it('deduplicates IDs and applies defaults', () => {
    expect(parseRecommendationRequest({ likedMovieIds: [1, 1, 2] }, ids)).toEqual({
      likedMovieIds: [1, 2],
      compare: false,
      limit: 10,
      parameters: DEFAULT_PARAMETERS,
    })
    expect(
      parseRecommendationRequest({ likedMovieIds: [], compare: true, limit: 5 }, ids).limit,
    ).toBe(5)
  })
  it.each([
    null,
    [],
    {},
    { likedMovieIds: [99] },
    { likedMovieIds: ['1'] },
    { likedMovieIds: [1.5] },
    { likedMovieIds: [], compare: 'true' },
    { likedMovieIds: [], limit: 100 },
    { likedMovieIds: [], parameters: null },
    { likedMovieIds: [], parameters: [] },
    { likedMovieIds: [], parameters: { neighbors: 0 } },
    { likedMovieIds: [], parameters: { neighbors: 101 } },
    { likedMovieIds: [], parameters: { neighbors: 2.5 } },
    { likedMovieIds: [], parameters: { neighbors: '40' } },
    { likedMovieIds: [], parameters: { userMetric: 'pearson' } },
    { likedMovieIds: [], parameters: { itemMetric: 'pearson' } },
    { likedMovieIds: [], parameters: { itemAggregation: 'sum' } },
  ])('rejects invalid input %j', (body) => {
    expect(() => parseRecommendationRequest(body, ids)).toThrow()
  })
})

describe('adjustable algorithms and calculation evidence', () => {
  it('limits K to the requested nearest viewers', () => {
    const result = recommend(model, [1], 'user', 10, { ...DEFAULT_PARAMETERS, neighbors: 1 })
    expect(result.neighborCount).toBe(1)
    expect(result.recommendations.map((item) => item.movieId)).toEqual([2])
    expect(result.recommendations[0]!.score).toBe(1)
  })
  it('uses Jaccard intersection over union for viewers', () => {
    const result = recommend(model, [1], 'user', 10, {
      ...DEFAULT_PARAMETERS,
      userMetric: 'jaccard',
    })
    expect(result.recommendations[0]!.score).toBeCloseTo(1 / 2 / (1 / 2 + 1 / 3))
  })
  it('uses audience Jaccard and supports strongest association', () => {
    const params = { ...DEFAULT_PARAMETERS, itemMetric: 'jaccard' as const }
    const average = recommend(model, [1, 3], 'item', 10, params)
    expect(average.recommendations.find((item) => item.movieId === 4)!.score).toBeCloseTo(
      (1 / 3 + 1) / 2,
    )
    const strongest = recommend(model, [1, 3], 'item', 10, { ...params, itemAggregation: 'max' })
    expect(strongest.recommendations[0]).toMatchObject({ movieId: 4, score: 1 })
  })
  it('fills unspecified parameters with the baseline', () => {
    expect(
      parseRecommendationRequest(
        { likedMovieIds: [1], parameters: { neighbors: 7 } },
        new Set(model.movieIds),
      ).parameters,
    ).toEqual({ ...DEFAULT_PARAMETERS, neighbors: 7 })
  })
  it.each(['user', 'item', 'popularity'] as const)(
    'matches every real-data %s ranking score, including custom parameters',
    (algorithm) => {
      for (const metric of ['cosine', 'jaccard'] as const) {
        for (const itemAggregation of ['mean', 'max'] as const) {
          const params = { neighbors: 17, userMetric: metric, itemMetric: metric, itemAggregation }
          const result = recommend(fullModel, [1, 24, 10], algorithm, 70, params)
          for (const [index, item] of result.recommendations.entries()) {
            const explanation = explainRecommendation(
              fullModel,
              [1, 24, 10],
              algorithm,
              item.movieId,
              params,
            )
            expect(explanation.score).toBeCloseTo(item.score, 14)
            expect(explanation.rank).toBe(index + 1)
          }
        }
      }
    },
  )
  it('explains actual fallback and cold-start popularity', () => {
    const fallback = explainRecommendation(model, [5], 'user')
    expect(fallback).toMatchObject({
      requestedAlgorithm: 'user',
      algorithm: 'popularity',
      fallback: true,
      trace: { kind: 'popularity', picked: 2, unknown: 1 },
    })
    expect(explainRecommendation(model, [], 'popularity').score).toBeCloseTo(2 / 3)
  })
  it('falls back when a small neighborhood has no unseen positive preferences', () => {
    const narrow = createModel({
      movies: dataset.movies,
      users: [
        { user_id: 1, movies: [1] },
        { user_id: 2, movies: [1, 2] },
      ],
    })
    const result = recommend(narrow, [1], 'user', 10, { ...DEFAULT_PARAMETERS, neighbors: 1 })
    expect(result).toMatchObject({
      requestedAlgorithm: 'user',
      algorithm: 'popularity',
      fallback: true,
    })
  })
  it('returns only anonymous neighbor evidence, never full profiles or identifiers', () => {
    const explanation = explainRecommendation(model, [1], 'user', 2)
    expect(explanation.trace.kind).toBe('user')
    if (explanation.trace.kind !== 'user') return
    expect(explanation.trace.neighbors[0]).toEqual({
      rank: 1,
      sharedMovieIds: [1],
      profileSize: 2,
      similarity: 1 / Math.sqrt(2),
      pickedMovie: true,
      contribution: 1 / Math.sqrt(2),
    })
    expect(Object.keys(explanation.trace.neighbors[0]!)).not.toContain('user_id')
    expect(Object.keys(explanation.trace.neighbors[0]!)).not.toContain('likes')
  })
  it('rejects unavailable explanation candidates and exhausted catalogs', () => {
    expect(() => explainRecommendation(model, [1], 'user', 1)).toThrow()
    expect(() => explainRecommendation(model, [1], 'item', 99)).toThrow()
    expect(() => explainRecommendation(model, model.movieIds, 'user')).toThrow()
  })
})
