<script setup lang="ts">
import type { Movie, RecommendationResponse } from '../shared/types'

const {
  data: catalog,
  error: catalogError,
  refresh,
} = await useFetch<{
  movies: Movie[]
  stats: { movieCount: number; userCount: number; preferenceCount: number }
}>('/api/movies')
const openingPicks = [1, 23, 32, 33, 39, 46, 68, 24, 2, 10, 27, 59]
const movies = computed(() => {
  const collection = catalog.value?.movies ?? []
  return [
    ...openingPicks
      .map((id) => collection.find((movie) => movie.id === id))
      .filter((movie): movie is Movie => !!movie),
    ...collection.filter((movie) => !openingPicks.includes(movie.id)),
  ]
})
const selectedIds = ref<number[]>([])
const selectedMovies = computed(() =>
  selectedIds.value
    .map((id) => movies.value.find((movie) => movie.id === id))
    .filter((movie): movie is Movie => !!movie),
)
const activeMovie = ref<Movie | null>(null)
const showAbout = ref(false)
const screen = ref<'select' | 'results'>('select')
const result = ref<RecommendationResponse | null>(null)
const loading = ref(false)
const hydrated = ref(false)
const error = ref('')
const compare = ref(false)
const main = ref<HTMLElement>()
let ready = false
let controller: AbortController | undefined

onMounted(() => {
  try {
    const saved: unknown = JSON.parse(localStorage.getItem('next-reel:likes') ?? '[]')
    if (Array.isArray(saved))
      selectedIds.value = [
        ...new Set(
          saved.filter(
            (id): id is number =>
              Number.isInteger(id) && movies.value.some((movie) => movie.id === id),
          ),
        ),
      ]
  } catch {
    /* Storage may be unavailable or contain an invalid saved selection. */
  }
  ready = true
  hydrated.value = true
})
watch(selectedIds, (ids) => {
  if (!ready) return
  try {
    localStorage.setItem('next-reel:likes', JSON.stringify(ids))
  } catch {
    /* Recommendations still work without browser storage. */
  }
})
onBeforeUnmount(() => controller?.abort())

function toggle(id: number) {
  if (loading.value) return
  selectedIds.value = selectedIds.value.includes(id)
    ? selectedIds.value.filter((selected) => selected !== id)
    : [...selectedIds.value, id]
}
async function getRecommendations(comparison = false) {
  if (loading.value) return
  loading.value = true
  error.value = ''
  controller = new AbortController()
  try {
    result.value = await $fetch<RecommendationResponse>('/api/recommendations', {
      method: 'POST',
      body: { likedMovieIds: selectedIds.value, compare: comparison, limit: 10 },
      signal: controller.signal,
      timeout: 10000,
    })
    compare.value = comparison && result.value.results.length > 1
    screen.value = 'results'
    await nextTick()
    window.scrollTo({ top: 0, behavior: 'instant' })
  } catch {
    error.value = 'We could not find your next reel just yet. Please try again.'
  } finally {
    loading.value = false
  }
}
async function editTaste() {
  screen.value = 'select'
  compare.value = false
  error.value = ''
  await nextTick()
  window.scrollTo({ top: 0, behavior: 'instant' })
}
function focusScreen() {
  main.value?.querySelector('h1')?.focus({ preventScroll: true })
  window.scrollTo({ top: 0, behavior: 'instant' })
}
</script>

<template>
  <div class="app-shell">
    <a href="#main" class="skip-link">Skip to movies</a>
    <header class="site-header">
      <a href="/" class="wordmark" aria-label="Next Reel home"
        ><img src="/favicon.svg" alt="" width="30" height="30" /><span
          >Next Reel<span class="wordmark-dot">.</span></span
        ></a
      >
      <button class="about-link" @click="showAbout = true">
        How it works <AppIcon name="arrow" :size="16" />
      </button>
    </header>

    <main id="main" ref="main">
      <div v-if="catalogError" class="page-error" role="alert">
        <h1>The projector needs a moment.</h1>
        <p>We could not load the movie catalog.</p>
        <button class="primary-button" @click="refresh()">
          Try again <AppIcon name="arrow" />
        </button>
      </div>
      <template v-else>
        <Transition name="screen" mode="out-in" @after-enter="focusScreen">
          <SelectionView
            v-if="screen === 'select'"
            key="select"
            :movies="movies"
            :selected-ids="selectedIds"
            :loading="loading"
            :hydrated="hydrated"
            :error="error"
            @toggle="toggle"
            @details="activeMovie = $event"
            @clear="selectedIds = []"
            @recommend="getRecommendations()"
          />
          <ResultsView
            v-else-if="result"
            key="results"
            :movies="movies"
            :selected-movies="selectedMovies"
            :result="result"
            :compare="compare"
            :loading="loading"
            :error="error"
            @edit="editTaste"
            @compare="getRecommendations(true)"
            @collapse="compare = false"
            @details="activeMovie = $event"
            @about="showAbout = true"
          />
        </Transition>
      </template>
    </main>

    <footer class="site-footer">
      <span>A small collection. A world of shared taste.</span>
      <div>
        <a href="https://github.com/nachourpi/next-reel" target="_blank" rel="noreferrer"
          >View the source <AppIcon name="arrow" :size="13" /></a
        ><button @click="showAbout = true">Credits &amp; methodology</button>
      </div>
    </footer>

    <MovieDetails
      v-if="activeMovie"
      :key="activeMovie.id"
      :movie="activeMovie"
      :selected="selectedIds.includes(activeMovie.id)"
      :selectable="screen === 'select'"
      @toggle="toggle"
      @close="activeMovie = null"
    />
    <HowItWorks v-if="showAbout" @close="showAbout = false" />
  </div>
</template>
