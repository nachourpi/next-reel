<script setup lang="ts">
import type {
  Algorithm,
  Movie,
  RecommendationResponse,
  RecommendationParameters,
} from '../../shared/types'
import { METHODS, explanationLink } from '#shared/recommendation'
const props = defineProps<{
  movies: Movie[]
  selectedMovies: Movie[]
  result: RecommendationResponse
  loading: boolean
  error: string
}>()
defineEmits<{
  edit: []
  restart: []
  settings: [parameters: RecommendationParameters]
  details: [movie: Movie]
  about: []
}>()
const activeMethod = ref<Algorithm>(props.result.results[0]?.requestedAlgorithm ?? 'popularity')
const visibleCount = ref(5)
const showSettings = ref(false)
const activeResult = computed(
  () =>
    props.result.results.find((item) => item.requestedAlgorithm === activeMethod.value) ??
    props.result.results[0],
)
watch(
  () => props.result,
  () => {
    visibleCount.value = 5
  },
)
function selectMethod(method: Algorithm) {
  activeMethod.value = method
  visibleCount.value = 5
}
function switchTab(index: number, direction: number) {
  const available = METHODS.filter((method) =>
    props.result.results.some((result) => result.requestedAlgorithm === method.id),
  )
  const current = available.findIndex((method) => method.id === METHODS[index]?.id)
  const next = available[(current + direction + available.length) % available.length]
  if (!next) return
  selectMethod(next.id)
  document.getElementById(`method-tab-${next.id}`)?.focus()
}
</script>
<template>
  <div class="results-screen">
    <button class="text-button back-button" :disabled="loading" @click="$emit('edit')">
      <AppIcon name="back" :size="17" /> Edit your taste
    </button>
    <div class="results-intro">
      <div>
        <p class="eyebrow">
          <span class="status-dot" />{{
            result.mode === 'popular'
              ? 'THE COMMUNITY’S OPENING PICKS'
              : 'GOOD COMPANY. BETTER RECOMMENDATIONS.'
          }}
        </p>
        <h1 tabindex="-1">
          {{ result.mode === 'popular' ? 'A good place to start.' : 'Your next great watch.' }}
        </h1>
        <p>
          {{
            result.mode === 'popular'
              ? 'Start with films this community loves. Add your favorites to make it personal.'
              : `Inspired by your ${selectedMovies.length === 1 ? 'favorite film' : `${selectedMovies.length} favorite films`}, discovered through shared taste.`
          }}
        </p>
      </div>
      <span class="results-stamp"
        >70 FILMS<br /><strong>806</strong><br />DIFFERENT PERSPECTIVES</span
      >
    </div>
    <div v-if="selectedMovies.length" class="taste-recap">
      <span class="eyebrow">YOUR STARTING POINT</span>
      <button
        v-for="movie in selectedMovies"
        :key="movie.id"
        class="taste-chip"
        @click="$emit('details', movie)"
      >
        {{ movie.title }}
      </button>
    </div>
    <template v-if="activeResult?.recommendations.length">
      <div class="method-switcher">
        <div class="method-switcher-heading">
          <h2>Three ways to find your next reel</h2>
          <p>Explore a different point of view.</p>
        </div>
        <div class="algorithm-tabs" role="tablist" aria-label="Recommendation methods">
          <button
            v-for="(method, index) in METHODS"
            :id="`method-tab-${method.id}`"
            :key="method.id"
            role="tab"
            :aria-selected="activeMethod === method.id"
            :aria-controls="`method-panel-${method.id}`"
            :tabindex="activeMethod === method.id ? 0 : -1"
            :disabled="!result.results.some((item) => item.requestedAlgorithm === method.id)"
            @click="selectMethod(method.id)"
            @keydown.right.prevent="switchTab(index, 1)"
            @keydown.left.prevent="switchTab(index, -1)"
          >
            <span>{{ method.name }}</span
            ><small>{{ method.description }}</small>
          </button>
        </div>
        <p v-if="result.mode === 'popular'" class="settings-hint">
          Choose a favorite film to unlock User-Based KNN and Item-Based recommendations.
        </p>
      </div>
      <div class="method-actions">
        <NuxtLink
          class="text-button"
          :to="
            explanationLink(
              activeResult.requestedAlgorithm,
              activeResult.recommendations[0]!.movieId,
              result.likedMovieIds,
              result.parameters,
            )
          "
        >
          <AppIcon name="info" :size="16" /> How this method works
          <AppIcon name="arrow" :size="15" />
        </NuxtLink>
        <button
          v-if="result.mode === 'personalized'"
          class="text-button"
          :aria-expanded="showSettings"
          aria-controls="algorithm-settings"
          @click="showSettings = !showSettings"
        >
          <AppIcon name="compare" :size="16" /> Algorithm settings
        </button>
      </div>
      <AlgorithmSettings
        v-if="showSettings"
        id="algorithm-settings"
        :parameters="result.parameters"
        :loading="loading"
        @apply="$emit('settings', $event)"
      />
      <p v-if="error" class="error-message" role="alert">
        {{ error }} Your previous results are still shown. Apply the settings again to retry.
      </p>
      <div
        v-for="method in METHODS"
        :id="`method-panel-${method.id}`"
        :key="method.id"
        :hidden="activeMethod !== method.id"
        class="active-method-panel"
        role="tabpanel"
        :aria-labelledby="`method-tab-${method.id}`"
        :aria-busy="loading"
      >
        <RecommendationList
          v-if="activeMethod === method.id"
          :key="activeMethod"
          :result="activeResult"
          :movies="movies"
          :visible-count="visibleCount"
          :liked-movie-ids="result.likedMovieIds"
          :parameters="result.parameters"
          @details="$emit('details', $event)"
        />
      </div>
      <div class="results-bottom">
        <button
          v-if="visibleCount === 5 && activeResult.recommendations.length > 5"
          class="secondary-button"
          @click="visibleCount = 10"
        >
          Five more possibilities <AppIcon name="chevron" :size="16" />
        </button>
        <p class="score-note">
          <AppIcon name="info" :size="16" /><span
            >Affinity is a recommendation score, not a probability. Methods use different scales.
            Popularity shows the share of dataset viewers who picked each film.
            <button class="inline-link" @click="$emit('about')">About the scores</button></span
          >
        </p>
      </div>
    </template>
    <div v-else class="exhausted-state">
      <AppIcon name="check" :size="36" />
      <h2>You’ve covered the collection.</h2>
      <p>Every film is already a favorite. Remove a few to leave room for a new recommendation.</p>
      <button class="secondary-button" @click="$emit('edit')">
        Edit my favorites <AppIcon name="arrow" />
      </button>
    </div>
    <section class="restart-callout">
      <div>
        <p class="eyebrow">A FRESH START</p>
        <h2>Another mix. Another movie night.</h2>
        <p>Clear your favorites and choose again.</p>
      </div>
      <button class="primary-button" :disabled="loading" @click="$emit('restart')">
        Start over <AppIcon name="arrow" :size="18" />
      </button>
    </section>
  </div>
</template>
