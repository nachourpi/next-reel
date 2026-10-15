export interface Movie {
  id: number
  sourceTitle: string
  title: string
  year: number
  genres: string[]
  overview: string
  runtime: number | null
  tmdbId: number
  poster: string | null
  posterLarge: string | null
}

export interface Dataset {
  movies: Record<string, string>
  users: { user_id: number; movies: number[] }[]
}

export type Algorithm = 'user' | 'item' | 'popularity'
export type SimilarityMetric = 'cosine' | 'jaccard'

export interface RecommendationParameters {
  neighbors: number
  userMetric: SimilarityMetric
  itemMetric: SimilarityMetric
  itemAggregation: 'mean' | 'max'
}

export interface Recommendation {
  movieId: number
  score: number
  reason: string
  supportingMovieId?: number
  supportingUsers?: number
}

export interface RecommendationResult {
  algorithm: Algorithm
  requestedAlgorithm: Algorithm
  fallback: boolean
  neighborCount?: number
  recommendations: Recommendation[]
}

export interface RecommendationResponse {
  mode: 'personalized' | 'popular'
  likedMovieIds: number[]
  parameters: RecommendationParameters
  results: RecommendationResult[]
}

export interface RecommendationRequest {
  likedMovieIds: number[]
  compare: boolean
  limit: 5 | 10
  parameters: RecommendationParameters
}

export interface NeighborEvidence {
  rank: number
  sharedMovieIds: number[]
  profileSize: number
  similarity: number
  pickedMovie: boolean
  contribution: number
}

export interface AssociationEvidence {
  movieId: number
  favoriteViewers: number
  sharedViewers: number
  similarity: number
}

export type CalculationTrace =
  | {
      kind: 'user'
      eligibleNeighbors: number
      neighbors: NeighborEvidence[]
      numerator: number
      denominator: number
    }
  | { kind: 'item'; associations: AssociationEvidence[]; numerator: number; denominator: number }
  | { kind: 'popularity'; picked: number; unknown: number; numerator: number; denominator: number }

export interface ExplanationResponse {
  requestedAlgorithm: Algorithm
  algorithm: Algorithm
  fallback: boolean
  movieId: number
  score: number
  rank: number | null
  likedMovieIds: number[]
  parameters: RecommendationParameters
  userCount: number
  candidateCount: number
  movieViewers: number
  trace: CalculationTrace
}
