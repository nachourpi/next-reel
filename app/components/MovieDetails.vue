<script setup lang="ts">
import type { Movie } from '../../shared/types'
defineProps<{ movie: Movie; selected: boolean; selectable: boolean }>()
defineEmits<{ close: []; toggle: [id: number] }>()
</script>
<template>
  <AppDialog :title="movie.title" @close="$emit('close')"
    ><div class="movie-detail">
      <img
        v-if="movie.posterLarge"
        class="detail-poster"
        :src="movie.posterLarge"
        :alt="`${movie.title} poster`"
        width="500"
        height="750"
      />
      <div class="detail-copy">
        <p class="eyebrow">A FILM FROM THE COLLECTION</p>
        <h3>{{ movie.title }}</h3>
        <p class="detail-meta">
          {{ movie.year }}<template v-if="movie.runtime"> · {{ movie.runtime }} min</template>
        </p>
        <div class="detail-genres">
          <span v-for="item in movie.genres" :key="item">{{ item }}</span>
        </div>
        <p class="detail-overview">{{ movie.overview }}</p>
        <button v-if="selectable" class="primary-button" @click="$emit('toggle', movie.id)">
          {{ selected ? 'Remove from favorites' : 'I’ve seen it. I loved it.'
          }}<AppIcon :name="selected ? 'check' : 'spark'" :size="17" /></button
        ><a
          :href="`https://www.themoviedb.org/movie/${movie.tmdbId}`"
          target="_blank"
          rel="noreferrer"
          class="detail-source"
          >Movie details from TMDB <AppIcon name="arrow" :size="14"
        /></a>
      </div></div
  ></AppDialog>
</template>
