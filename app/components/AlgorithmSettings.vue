<script setup lang="ts">
import type { RecommendationParameters } from '../../shared/types'
import { DEFAULT_PARAMETERS } from '#shared/recommendation'
const props = defineProps<{ parameters: RecommendationParameters; loading: boolean }>()
const emit = defineEmits<{ apply: [parameters: RecommendationParameters] }>()
const draft = ref<RecommendationParameters>({ ...props.parameters })
watch(
  () => props.parameters,
  (value) => {
    draft.value = { ...value }
  },
)
function apply() {
  emit('apply', { ...draft.value })
}
</script>
<template>
  <form class="algorithm-settings" @submit.prevent="apply">
    <div class="settings-intro">
      <h3>A little room to experiment.</h3>
      <p>
        Change a setting, then recalculate. The defaults are a baseline, not a claim of optimal
        accuracy.
      </p>
    </div>
    <fieldset :disabled="loading">
      <legend>User-Based KNN</legend>
      <label for="neighbor-count">Neighbors (K)</label>
      <input
        id="neighbor-count"
        v-model.number="draft.neighbors"
        type="number"
        min="1"
        max="100"
        step="1"
        required
        aria-describedby="neighbor-help"
      />
      <p id="neighbor-help">
        Use up to this many similar viewers (1–100). A smaller group focuses on the closest matches;
        a larger group includes more perspectives. Only positive similarities count.
      </p>
      <label for="user-metric">Viewer similarity</label>
      <select id="user-metric" v-model="draft.userMetric" aria-describedby="user-metric-help">
        <option value="cosine">Cosine (default)</option>
        <option value="jaccard">Jaccard</option>
      </select>
      <p id="user-metric-help">
        Cosine divides shared favorites by the geometric mean of both list sizes. Jaccard divides by
        the total number of distinct films across the two lists, penalizing extra unshared favorites
        more strongly.
      </p>
    </fieldset>
    <fieldset :disabled="loading">
      <legend>Item-Based</legend>
      <label for="item-metric">Movie similarity</label>
      <select id="item-metric" v-model="draft.itemMetric" aria-describedby="item-metric-help">
        <option value="cosine">Cosine (default)</option>
        <option value="jaccard">Jaccard</option>
      </select>
      <p id="item-metric-help">
        Compare each candidate’s audience with each favorite’s audience. Cosine normalizes shared
        viewers by audience sizes; Jaccard measures the shared fraction of their combined, distinct
        audience.
      </p>
      <label for="item-aggregation">Combine associations</label>
      <select
        id="item-aggregation"
        v-model="draft.itemAggregation"
        aria-describedby="aggregation-help"
      >
        <option value="mean">Average (default)</option>
        <option value="max">Strongest association</option>
      </select>
      <p id="aggregation-help">
        Average considers all your favorites equally, including zero similarities. Strongest
        association uses only the closest favorite, which can surface films tied to one part of your
        taste.
      </p>
    </fieldset>
    <div class="settings-footer">
      <button
        type="button"
        class="text-button"
        :disabled="loading"
        @click="draft = { ...DEFAULT_PARAMETERS }"
      >
        Restore defaults</button
      ><button type="submit" class="secondary-button" :disabled="loading">
        {{ loading ? 'Recalculating…' : 'Apply & recalculate' }}<AppIcon name="arrow" :size="16" />
      </button>
    </div>
  </form>
</template>
