<script setup lang="ts">
import type { Movie, RecommendationResult, RecommendationParameters } from '../../shared/types'
import { explanationLink } from '#shared/recommendation'
defineProps<{
  result: RecommendationResult
  movies: Movie[]
  visibleCount: number
  likedMovieIds: number[]
  parameters: RecommendationParameters
}>()
defineEmits<{ details: [movie: Movie] }>()
const descriptions = {
  user: {
    title: 'Shared taste',
    label: 'USER-BASED',
    description: 'Your closest taste neighbors, their next favorites.',
  },
  item: {
    title: 'Connected films',
    label: 'ITEM-BASED',
    description: 'Films that audiences often choose together.',
  },
  popularity: {
    title: 'Crowd favorites',
    label: 'POPULARITY',
    description: 'The most-picked films across the full community.',
  },
}
</script>

<template>
  <section class="recommendation-list">
    <div class="method-heading">
      <span class="eyebrow">{{ descriptions[result.algorithm].label }}</span>
      <h2>{{ descriptions[result.algorithm].title }}</h2>
      <p>{{ descriptions[result.algorithm].description }}</p>
    </div>
    <p v-if="result.fallback" class="fallback-note" role="status">
      This method has no supported unseen films for this selection and settings. Showing popular
      picks instead.
    </p>
    <ol class="result-grid">
      <li
        v-for="(recommendation, index) in result.recommendations.slice(0, visibleCount)"
        :key="recommendation.movieId"
        class="result-item"
      >
        <template
          v-for="movie in movies.filter((item) => item.id === recommendation.movieId)"
          :key="movie.id"
        >
          <span class="result-rank">{{ String(index + 1).padStart(2, '0') }}</span>
          <MovieCard
            :movie="movie"
            :selectable="false"
            :index="index"
            @details="$emit('details', $event)"
          />
          <div class="match-line">
            <span>{{ Math.round(recommendation.score * 100) }}<small>%</small></span
            ><span>{{ result.algorithm === 'popularity' ? 'of viewers' : 'affinity' }}</span>
          </div>
          <div class="match-meter" aria-hidden="true">
            <span :style="{ width: `${recommendation.score * 100}%` }" />
          </div>
          <p class="recommendation-reason">{{ recommendation.reason }}</p>
          <NuxtLink
            class="explain-link"
            :to="explanationLink(result.requestedAlgorithm, movie.id, likedMovieIds, parameters)"
          >
            Why this film? <AppIcon name="arrow" :size="14" />
          </NuxtLink>
        </template>
      </li>
    </ol>
  </section>
</template>
