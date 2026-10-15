<script setup lang="ts">
import type { Movie } from '../../shared/types'
withDefaults(
  defineProps<{
    movie: Movie
    selected?: boolean
    selectable?: boolean
    index?: number
    disabled?: boolean
  }>(),
  { selected: false, selectable: true, index: 0, disabled: false },
)
defineEmits<{ toggle: [id: number]; details: [movie: Movie] }>()
const broken = ref(false)
const posterImage = ref<HTMLImageElement>()
onMounted(() => {
  if (posterImage.value?.complete && !posterImage.value.naturalWidth) broken.value = true
})
</script>

<template>
  <article
    class="movie-card"
    :class="{ 'is-selected': selected }"
    :style="{ '--delay': `${Math.min(index, 11) * 28}ms` }"
  >
    <button
      class="poster-button"
      :disabled="disabled"
      :class="{ 'is-selected': selected }"
      :aria-label="`${selectable ? 'Select' : 'Details for'} ${movie.title}`"
      :aria-pressed="selectable ? selected : undefined"
      @click="selectable ? $emit('toggle', movie.id) : $emit('details', movie)"
    >
      <img
        v-if="movie.poster && !broken"
        ref="posterImage"
        :src="movie.poster"
        :srcset="`${movie.poster} 342w, ${movie.posterLarge} 500w`"
        sizes="(max-width: 600px) 44vw, (max-width: 1000px) 28vw, 16vw"
        alt=""
        width="342"
        height="513"
        :loading="index < 5 ? 'eager' : 'lazy'"
        decoding="async"
        @error="broken = true"
      />
      <span v-else class="poster-placeholder"
        ><AppIcon name="spark" :size="32" /><span>{{ movie.title }}</span
        ><small>Poster unavailable</small></span
      >
      <span v-if="selectable" class="selection-badge"
        ><AppIcon :name="selected ? 'check' : 'spark'" :size="17"
      /></span>
      <span class="poster-shade" />
    </button>
    <div class="movie-caption">
      <button class="movie-title" :disabled="disabled" @click="$emit('details', movie)">
        {{ movie.title }}
      </button>
      <button
        class="info-button"
        :disabled="disabled"
        :aria-label="`About ${movie.title}`"
        @click="$emit('details', movie)"
      >
        <AppIcon name="info" :size="16" />
      </button>
      <span class="movie-year">{{ movie.year }}</span>
    </div>
  </article>
</template>
