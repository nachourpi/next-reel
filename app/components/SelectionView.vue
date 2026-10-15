<script setup lang="ts">
import type { Movie } from '../../shared/types'
const props = defineProps<{
  movies: Movie[]
  selectedIds: number[]
  loading: boolean
  hydrated: boolean
  error: string
}>()
defineEmits<{ toggle: [id: number]; details: [movie: Movie]; clear: []; recommend: [] }>()
const selectedMovies = computed(() =>
  props.selectedIds
    .map((id) => props.movies.find((movie) => movie.id === id))
    .filter((movie): movie is Movie => !!movie),
)
const query = ref('')
const genre = ref('All genres')
const filtersVisible = ref(false)
function toggleFilters() {
  filtersVisible.value = !filtersVisible.value
  if (!filtersVisible.value) resetFilters()
}
const genres = computed(() => [...new Set(props.movies.flatMap((movie) => movie.genres))].sort())
const filteredMovies = computed(() =>
  props.movies.filter(
    (movie) =>
      movie.title.toLowerCase().includes(query.value.trim().toLowerCase()) &&
      (genre.value === 'All genres' || movie.genres.includes(genre.value)),
  ),
)
function resetFilters() {
  query.value = ''
  genre.value = 'All genres'
}
</script>
<template>
  <div class="selection-layout">
    <section class="selection-intro">
      <p class="eyebrow"><span>01</span> / YOUR TASTE</p>
      <h1 tabindex="-1">Good films. Your kind of good.</h1>
      <p>Choose films you love. Find your next favorite.</p>
    </section>

    <section
      class="catalog-section"
      aria-label="Choose your favorite movies"
      :aria-busy="loading"
      :inert="loading"
    >
      <div class="filter-disclosure">
        <button
          class="text-button"
          :aria-expanded="filtersVisible"
          aria-controls="catalog-filters"
          @click="toggleFilters"
        >
          <AppIcon name="search" :size="15" />{{
            filtersVisible ? 'Hide filters' : 'Search & filters'
          }}
        </button>
      </div>
      <div v-if="filtersVisible" id="catalog-filters" class="catalog-toolbar">
        <label class="search-input"
          ><AppIcon name="search" :size="19" /><span class="sr-only">Search movies</span
          ><input v-model="query" type="search" placeholder="Search for a film…" autocomplete="off"
        /></label>
        <div class="genre-filters" aria-label="Filter movies by genre">
          <button
            class="genre-chip"
            :aria-pressed="genre === 'All genres'"
            @click="genre = 'All genres'"
          >
            All genres
          </button>
          <button
            v-for="item in genres"
            :key="item"
            class="genre-chip"
            :aria-pressed="genre === item"
            @click="genre = item"
          >
            {{ item === 'Science Fiction' ? 'Sci-Fi' : item }}
          </button>
        </div>
      </div>
      <div class="catalog-meta">
        <span
          >{{ filteredMovies.length }} {{ filteredMovies.length === 1 ? 'film' : 'films' }} to make
          it a movie night</span
        ><span>A COLLECTION, NOT AN ENDLESS SCROLL</span>
      </div>
      <div v-if="filteredMovies.length" class="movie-grid">
        <MovieCard
          v-for="(movie, index) in filteredMovies"
          :key="movie.id"
          :movie="movie"
          :index="index"
          :selected="selectedIds.includes(movie.id)"
          :disabled="!hydrated || loading"
          @toggle="$emit('toggle', $event)"
          @details="$emit('details', $event)"
        />
      </div>
      <div v-else class="empty-search">
        <AppIcon name="search" :size="28" />
        <h2>No films in this frame.</h2>
        <p>Try another title or give a different genre a chance.</p>
        <button class="secondary-button" @click="resetFilters">Reset filters</button>
      </div>
      <p class="catalog-end">
        That’s the whole collection.<span>Great taste doesn’t need an infinite catalog.</span>
      </p>
    </section>
    <div class="selection-tray">
      <div class="tray-favorites">
        <div v-if="selectedMovies.length" class="tray-posters">
          <div v-for="movie in selectedMovies.slice(0, 5)" :key="movie.id" class="tray-poster">
            <img
              v-if="movie.poster"
              :src="movie.poster"
              :alt="movie.title"
              width="44"
              height="66"
            />
            <button
              :aria-label="`Remove ${movie.title}`"
              :disabled="loading"
              @click="$emit('toggle', movie.id)"
            >
              <AppIcon name="close" :size="11" />
            </button>
          </div>
          <span v-if="selectedMovies.length > 5" class="tray-overflow"
            >+{{ selectedMovies.length - 5 }}</span
          >
        </div>
        <AppIcon v-else name="spark" :size="25" />
        <div class="tray-copy">
          <p class="selection-count" aria-live="polite">
            {{
              selectedIds.length
                ? `${selectedIds.length} ${selectedIds.length === 1 ? 'film' : 'films'} selected`
                : 'Your next favorite starts here'
            }}
          </p>
          <p class="tray-hint">
            {{
              selectedIds.length
                ? 'We’ll find your next film through shared taste.'
                : 'Pick a few favorites, or start with the crowd’s picks.'
            }}
          </p>
          <button
            v-if="selectedIds.length"
            class="text-button clear-selection"
            :disabled="loading"
            @click="$emit('clear')"
          >
            Clear selection
          </button>
        </div>
      </div>
      <div class="tray-action">
        <p v-if="error" class="error-message" role="alert">{{ error }}</p>
        <button
          class="primary-button"
          :disabled="loading || !hydrated"
          :aria-busy="loading"
          @click="$emit('recommend')"
        >
          <AppIcon v-if="!loading" name="spark" :size="18" /><span>{{
            loading ? 'Finding your next reel' : 'Find my next reel'
          }}</span
          ><span v-if="loading" class="spinner" aria-hidden="true" /><AppIcon
            v-else
            name="arrow"
            :size="18"
          />
        </button>
      </div>
    </div>
  </div>
</template>
