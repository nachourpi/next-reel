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

export interface Recommendation {
  movieId: number
  score: number
  reason: string
  supportingMovieId?: number
  supportingUsers?: number
}

export interface RecommendationResult {
  algorithm: Algorithm
  fallback: boolean
  neighborCount?: number
  recommendations: Recommendation[]
}

export interface RecommendationResponse {
  mode: 'personalized' | 'popular'
  results: RecommendationResult[]
}

export interface RecommendationRequest {
  likedMovieIds: number[]
  compare: boolean
  limit: 5 | 10
}
