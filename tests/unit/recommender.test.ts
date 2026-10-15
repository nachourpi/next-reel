import { describe, expect, it } from 'vitest'
import { createModel, recommend } from '../../server/recommender/engine'
import { parseRecommendationRequest } from '../../server/recommender/request'
import type { Dataset } from '../../shared/types'

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
  ])('rejects invalid input %j', (body) => {
    expect(() => parseRecommendationRequest(body, ids)).toThrow()
  })
})
