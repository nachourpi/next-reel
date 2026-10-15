<script setup lang="ts">
import type { Movie, RecommendationResponse } from '../../shared/types'
const props = defineProps<{
  movies: Movie[]
  selectedMovies: Movie[]
  result: RecommendationResponse
  compare: boolean
  loading: boolean
  error: string
}>()
defineEmits<{ edit: []; compare: []; collapse: []; details: [movie: Movie]; about: [] }>()
const activeMethod = ref(0)
const visibleCount = ref(5)
const resultTitle = computed(() =>
  props.result.mode === 'popular' ? 'A good place to start.' : 'Your next great watch.',
)
watch(
  () => props.result,
  () => {
    activeMethod.value = 0
    visibleCount.value = 5
  },
)
</script>
<template>
  <div class="results-screen">
    <button class="text-button back-button" @click="$emit('edit')">
      <AppIcon name="back" :size="17" /> Edit your taste
    </button>
    <div class="results-intro">
      <div>
        <p class="eyebrow">
          <span class="status-dot" />
          {{
            result?.mode === 'popular'
              ? 'THE COMMUNITY’S OPENING PICKS'
              : 'GOOD COMPANY. BETTER RECOMMENDATIONS.'
          }}
        </p>
        <h1 tabindex="-1">{{ resultTitle }}</h1>
        <p>
          {{
            result?.mode === 'popular'
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
      <span class="eyebrow">YOUR STARTING POINT</span
      ><button
        v-for="movie in selectedMovies"
        :key="movie.id"
        class="taste-chip"
        @click="$emit('details', movie)"
      >
        {{ movie.title }}
      </button>
    </div>
    <template v-if="result?.results[0]?.recommendations.length">
      <div class="results-toolbar">
        <p>
          <AppIcon name="spark" :size="17" />
          {{ compare ? 'Three ways to find a good film' : 'A shortlist worth your evening' }}
        </p>
        <button
          v-if="result.mode === 'personalized'"
          class="secondary-button compare-button"
          :disabled="loading"
          @click="compare ? $emit('collapse') : $emit('compare')"
        >
          <AppIcon name="compare" :size="16" />
          {{ loading ? 'Comparing…' : compare ? 'Back to my picks' : 'Compare methods' }}
        </button>
      </div>
      <p v-if="error" class="error-message" role="alert">
        {{ error }}
        <button class="text-button" @click="$emit('compare')">Retry comparison</button>
      </p>
      <div v-if="compare" class="method-tabs" role="tablist" aria-label="Recommendation methods">
        <button
          v-for="(method, index) in ['Shared taste', 'Connected films', 'Crowd favorites']"
          :id="`method-tab-${index}`"
          :key="method"
          :aria-selected="activeMethod === index"
          :aria-controls="`method-panel-${index}`"
          :tabindex="activeMethod === index ? 0 : -1"
          role="tab"
          @click="activeMethod = index"
          @keydown.right.prevent="
            activeMethod = (index + 1) % 3
            ;($event.currentTarget as HTMLElement)?.parentElement
              ?.querySelectorAll<HTMLButtonElement>('button')
              [(index + 1) % 3]?.focus()
          "
          @keydown.left.prevent="
            activeMethod = (index + 2) % 3
            ;($event.currentTarget as HTMLElement)?.parentElement
              ?.querySelectorAll<HTMLButtonElement>('button')
              [(index + 2) % 3]?.focus()
          "
        >
          {{ method }}
        </button>
      </div>
      <div class="recommendation-columns" :class="{ 'is-comparing': compare }">
        <div
          v-for="(recommendationSet, index) in compare
            ? result.results
            : result.results.slice(0, 1)"
          :id="compare ? `method-panel-${index}` : undefined"
          :key="index"
          class="method-panel"
          :class="{ 'is-active': activeMethod === index }"
          :role="compare ? 'tabpanel' : undefined"
          :aria-labelledby="compare ? `method-tab-${index}` : undefined"
        >
          <RecommendationList
            :result="recommendationSet"
            :movies="movies"
            :visible-count="visibleCount"
            @details="$emit('details', $event)"
          />
        </div>
      </div>
      <div class="results-bottom">
        <button
          v-if="visibleCount === 5 && result.results.some((set) => set.recommendations.length > 5)"
          class="secondary-button"
          @click="visibleCount = 10"
        >
          Five more possibilities <AppIcon name="chevron" :size="16" />
        </button>
        <p class="score-note">
          <AppIcon name="info" :size="16" /><span
            >{{
              result.mode === 'popular'
                ? 'Percentages show how many dataset viewers picked each film.'
                : 'Affinity is a recommendation score, not a probability. Methods use different scales.'
            }}
            <button class="inline-link" @click="$emit('about')">See how it works</button></span
          >
        </p>
        <button class="text-button try-again" @click="$emit('edit')">
          Try a different mix <AppIcon name="arrow" :size="16" />
        </button>
      </div>
    </template>
    <div v-else class="exhausted-state">
      <AppIcon name="check" :size="36" />
      <h2>You’ve covered the collection.</h2>
      <p>Every film is already a favorite. Remove a few to leave room for a new recommendation.</p>
      <button class="primary-button" @click="$emit('edit')">
        Edit my favorites <AppIcon name="arrow" />
      </button>
    </div>
  </div>
</template>
