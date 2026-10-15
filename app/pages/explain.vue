<script setup lang="ts">
import type { Movie, ExplanationResponse } from '../../shared/types'
import { DEFAULT_PARAMETERS, METHODS } from '#shared/recommendation'
const route = useRoute()
const { data: catalog, refresh: refreshCatalog } = await useFetch<{ movies: Movie[] }>(
  '/api/movies',
)
const explanation = ref<ExplanationResponse | null>(null)
const loading = ref(true)
const error = ref('')
const showAll = ref(false)
let lastSnapshot = ''
let controller: AbortController | undefined
function queryValue(key: string, fallback = ''): string {
  const value = route.query[key]
  if (Array.isArray(value)) throw new Error('Invalid explanation link.')
  return value ?? fallback
}
async function load(force = false) {
  if (route.path.replace(/\/$/, '') !== '/explain' || (!force && lastSnapshot === route.fullPath))
    return
  lastSnapshot = route.fullPath
  controller?.abort()
  controller = new AbortController()
  const current = controller
  loading.value = true
  error.value = ''
  showAll.value = false
  try {
    if (!catalog.value?.movies.length) await refreshCatalog()
    if (!catalog.value?.movies.length) throw new Error('The movie catalog is unavailable.')
    const likes = queryValue('likes')
    const parameters = {
      neighbors: Number(queryValue('neighbors', String(DEFAULT_PARAMETERS.neighbors))),
      userMetric: queryValue('userMetric', DEFAULT_PARAMETERS.userMetric),
      itemMetric: queryValue('itemMetric', DEFAULT_PARAMETERS.itemMetric),
      itemAggregation: queryValue('aggregation', DEFAULT_PARAMETERS.itemAggregation),
    }
    const result = await $fetch<ExplanationResponse>('/api/explanations', {
      method: 'POST',
      signal: current.signal,
      timeout: 10000,
      body: {
        likedMovieIds: likes ? likes.split(',').map(Number) : [],
        algorithm: queryValue('method', 'user'),
        ...(route.query.movie !== undefined ? { movieId: Number(queryValue('movie')) } : {}),
        parameters,
      },
    })
    if (!current.signal.aborted) explanation.value = result
  } catch {
    if (!current.signal.aborted)
      error.value = 'We could not load this calculation. Check the explanation link or try again.'
  } finally {
    if (!current.signal.aborted) loading.value = false
  }
}
onMounted(() => {
  void load()
})
onActivated(() => {
  void load()
})
watch(
  () => route.fullPath,
  () => {
    void load()
  },
)
onBeforeUnmount(() => controller?.abort())
const movie = computed(() =>
  catalog.value?.movies.find((movie) => movie.id === explanation.value?.movieId),
)
const movieName = (id: number) =>
  catalog.value?.movies.find((movie) => movie.id === id)?.title ?? `Film ${id}`
const methodName = computed(
  () => METHODS.find((method) => method.id === explanation.value?.algorithm)?.name ?? '',
)
const metric = computed(() =>
  explanation.value?.algorithm === 'user'
    ? explanation.value.parameters.userMetric
    : (explanation.value?.parameters.itemMetric ?? 'cosine'),
)
const firstNeighbor = computed(() =>
  explanation.value?.trace.kind === 'user' ? explanation.value.trace.neighbors[0] : undefined,
)
const firstAssociation = computed(() =>
  explanation.value?.trace.kind === 'item' ? explanation.value.trace.associations[0] : undefined,
)
const neighborRows = computed(() =>
  explanation.value?.trace.kind === 'user'
    ? explanation.value.trace.neighbors.slice(0, showAll.value ? 100 : 8)
    : [],
)
const bars = computed(() => {
  const trace = explanation.value?.trace
  if (trace?.kind === 'user')
    return trace.neighbors.map((neighbor) => ({
      label: String(neighbor.rank),
      value: neighbor.similarity,
      highlighted: neighbor.pickedMovie,
      detail: `Neighbor ${neighbor.rank}: similarity ${neighbor.similarity.toFixed(6)}; ${neighbor.pickedMovie ? 'picked this film' : 'no recorded preference'}`,
    }))
  if (trace?.kind === 'item')
    return trace.associations.map((item, index) => ({
      label: `F${index + 1}`,
      value: item.similarity,
      highlighted: true,
      detail: `${movieName(item.movieId)}: ${item.similarity.toFixed(6)}, ${item.sharedViewers} shared viewers`,
    }))
  if (trace?.kind === 'popularity')
    return [
      {
        label: 'Picked',
        value: trace.picked,
        highlighted: true,
        detail: `${trace.picked} viewers picked this film`,
      },
      {
        label: 'Unknown',
        value: trace.unknown,
        highlighted: false,
        detail: `${trace.unknown} viewers have no recorded preference`,
      },
    ]
  return []
})
const num = (value: number) => value.toFixed(6)
function similaritySubstitution(shared: number, left: number, right: number) {
  return metric.value === 'cosine'
    ? `${shared} / √(${left} × ${right})`
    : `${shared} / (${left} + ${right} − ${shared})`
}
useHead({ title: 'Behind the recommendation · Next Reel' })
</script>
<template>
  <div class="app-shell explanation-shell">
    <a href="#calculation" class="skip-link">Skip to calculation</a>
    <header class="site-header">
      <NuxtLink to="/" class="wordmark"
        ><img src="/favicon.svg" alt="" width="30" height="30" /><span>Next Reel</span></NuxtLink
      ><span class="eyebrow">BEHIND THE RECOMMENDATION</span>
    </header>
    <main id="calculation" class="explanation-page">
      <NuxtLink to="/" class="text-button back-button"
        ><AppIcon name="back" :size="17" /> Back to your picks</NuxtLink
      >
      <div v-if="loading" class="explanation-loading" role="status">
        <span class="spinner" /> Opening the calculation…
      </div>
      <div v-else-if="error || !explanation" class="page-error" role="alert">
        <h1>The numbers need a moment.</h1>
        <p>{{ error }}</p>
        <button class="secondary-button" @click="load(true)">Try again</button>
      </div>
      <template v-else>
        <section class="explanation-hero">
          <img
            v-if="movie?.poster"
            :src="movie.poster"
            :alt="`${movie.title} poster`"
            width="160"
            height="240"
          />
          <div>
            <p class="eyebrow">{{ methodName }} / STEP BY STEP</p>
            <h1>Why {{ movie?.title }}?</h1>
            <p>Follow the actual data, from your favorites to this recommendation.</p>
            <div class="explanation-score">
              <strong>{{ Math.round(explanation.score * 100) }}%</strong
              ><span
                >{{ explanation.algorithm === 'popularity' ? 'of dataset viewers' : 'affinity'
                }}<br />{{
                  explanation.rank
                    ? `Ranked #${explanation.rank} in this method`
                    : 'No positive support in this method'
                }}</span
              >
            </div>
          </div>
        </section>
        <p v-if="explanation.fallback" class="fallback-note">
          This method had no supported recommendations for your selection. The calculation below is
          the popularity fallback actually shown.
        </p>
        <div class="calculation-steps">
          <section class="calculation-step">
            <span class="step-number">01</span>
            <div>
              <p class="eyebrow">THE STARTING POINT</p>
              <h2>
                {{
                  explanation.likedMovieIds.length
                    ? 'Your favorites set the scene.'
                    : 'Start with the community.'
                }}
              </h2>
              <p>
                We use {{ explanation.userCount }} historical viewers and their recorded positive
                preferences. Your {{ explanation.likedMovieIds.length }} selected
                {{ explanation.likedMovieIds.length === 1 ? 'film is' : 'films are' }} excluded,
                leaving {{ explanation.candidateCount }} eligible films.
              </p>
              <ul v-if="explanation.likedMovieIds.length" class="explanation-favorites">
                <li v-for="id in explanation.likedMovieIds" :key="id">{{ movieName(id) }}</li>
              </ul>
              <p class="calculation-note">
                No recorded preference means unknown, never disliked. Movie genres, posters and
                external ratings do not affect these calculations.
              </p>
            </div>
          </section>
          <section class="calculation-step">
            <span class="step-number">02</span>
            <div>
              <p class="eyebrow">
                {{
                  explanation.algorithm === 'popularity'
                    ? 'COUNT THE EVIDENCE'
                    : 'MEASURE THE CONNECTION'
                }}
              </p>
              <template v-if="explanation.trace.kind === 'user'">
                <h2>Find viewers with shared taste.</h2>
                <p>
                  Compare your list with each viewer’s list using
                  {{ metric === 'cosine' ? 'cosine' : 'Jaccard' }} similarity. Keep the
                  {{ explanation.parameters.neighbors }} closest positive matches, or fewer if there
                  are not enough. Here, {{ explanation.trace.eligibleNeighbors }} viewers have an
                  overlap and {{ explanation.trace.neighbors.length }} are used.
                </p>
                <MathEquation :kind="metric" />
                <p class="calculation-note">
                  n<sub>left</sub> = your selected films; n<sub>right</sub> = the viewer’s list
                  size; n<sub>shared</sub> = films in both lists.
                </p>
                <div v-if="firstNeighbor" class="worked-example">
                  <span class="eyebrow">REAL EXAMPLE · NEIGHBOR 1</span>
                  <p>
                    {{ firstNeighbor.sharedMovieIds.length }} shared
                    {{ firstNeighbor.sharedMovieIds.length === 1 ? 'favorite' : 'favorites' }},
                    {{ explanation.likedMovieIds.length }} in your list,
                    {{ firstNeighbor.profileSize }} in theirs.
                  </p>
                  <code
                    >{{
                      similaritySubstitution(
                        firstNeighbor.sharedMovieIds.length,
                        explanation.likedMovieIds.length,
                        firstNeighbor.profileSize,
                      )
                    }}
                    = {{ num(firstNeighbor.similarity) }}</code
                  >
                </div>
              </template>
              <template v-else-if="explanation.trace.kind === 'item'">
                <h2>Connect films through their audiences.</h2>
                <p>
                  For every favorite, count the viewers who also picked {{ movie?.title }}.
                  Normalize the overlap using
                  {{ metric === 'cosine' ? 'cosine' : 'Jaccard' }} similarity.
                </p>
                <MathEquation :kind="metric" />
                <p class="calculation-note">
                  n<sub>left</sub> = viewers who picked a favorite; n<sub>right</sub> = viewers who
                  picked this candidate; n<sub>shared</sub> = viewers who picked both.
                </p>
                <div v-if="firstAssociation" class="worked-example">
                  <span class="eyebrow">REAL EXAMPLE · STRONGEST CONNECTION</span>
                  <p>
                    {{ firstAssociation.favoriteViewers }} viewers picked
                    {{ movieName(firstAssociation.movieId) }}, {{ explanation.movieViewers }} picked
                    {{ movie?.title }}, and {{ firstAssociation.sharedViewers }} picked both.
                  </p>
                  <code
                    >{{
                      similaritySubstitution(
                        firstAssociation.sharedViewers,
                        firstAssociation.favoriteViewers,
                        explanation.movieViewers,
                      )
                    }}
                    = {{ num(firstAssociation.similarity) }}</code
                  >
                </div>
              </template>
              <template v-else
                ><h2>Count the viewers who picked this film.</h2>
                <p>
                  {{ explanation.trace.picked }} of {{ explanation.userCount }} viewers picked
                  {{ movie?.title }}. For the other {{ explanation.trace.unknown }}, preference is
                  unknown. Popularity uses the same total audience for every candidate, independent
                  of your favorites.
                </p></template
              >
            </div>
          </section>
          <section class="calculation-step">
            <span class="step-number">03</span>
            <div>
              <p class="eyebrow">THE EVIDENCE IN VIEW</p>
              <h2>
                {{
                  explanation.trace.kind === 'user'
                    ? 'Each neighbor has a different weight.'
                    : explanation.trace.kind === 'item'
                      ? 'Every favorite contributes a connection.'
                      : 'Picked and unknown, side by side.'
                }}
              </h2>
              <p v-if="explanation.trace.kind === 'user'">
                Bar height is similarity (0 to 1). Coral marks neighbors who picked this film; gray
                marks an unknown preference. All {{ explanation.trace.neighbors.length }} neighbors
                contribute to the denominator, while only recorded positives contribute to the
                numerator.
              </p>
              <p v-else-if="explanation.trace.kind === 'item'">
                Bar height is movie similarity (0 to 1). F1 is the strongest connection; the table
                pairs every bar with its favorite.
              </p>
              <EvidenceChart
                :bars="bars"
                :maximum="
                  explanation.trace.kind === 'popularity' ? explanation.userCount : undefined
                "
                :label="`Actual ${methodName} evidence for ${movie?.title}`"
                :caption="
                  explanation.trace.kind === 'user'
                    ? 'Horizontal axis: anonymous neighbor rank, from closest to least similar. Vertical axis: similarity.'
                    : explanation.trace.kind === 'item'
                      ? 'Horizontal axis: selected favorites, ordered by similarity. Vertical axis: similarity.'
                      : 'Vertical axis: number of dataset viewers. Gray means unknown preference.'
                "
              />
              <div
                v-if="explanation.trace.kind !== 'popularity'"
                class="evidence-table-wrap"
                role="region"
                aria-label="Exact calculation evidence"
                tabindex="0"
              >
                <table class="evidence-table" v-if="explanation.trace.kind === 'user'">
                  <caption>
                    Anonymous neighbors · values rounded to six decimals
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Neighbor</th>
                      <th scope="col">Shared favorites</th>
                      <th scope="col">List size</th>
                      <th scope="col">Similarity</th>
                      <th scope="col">This film</th>
                      <th scope="col">Contribution</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="neighbor in neighborRows" :key="neighbor.rank">
                      <th scope="row">#{{ neighbor.rank }}</th>
                      <td>{{ neighbor.sharedMovieIds.map(movieName).join(', ') }}</td>
                      <td>{{ neighbor.profileSize }}</td>
                      <td>{{ num(neighbor.similarity) }}</td>
                      <td>{{ neighbor.pickedMovie ? 'Picked' : 'Unknown' }}</td>
                      <td>{{ num(neighbor.contribution) }}</td>
                    </tr>
                  </tbody>
                </table>
                <table v-else-if="explanation.trace.kind === 'item'" class="evidence-table">
                  <caption>
                    Audience overlaps · values rounded to six decimals
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Favorite</th>
                      <th scope="col">Viewers</th>
                      <th scope="col">Picked both</th>
                      <th scope="col">Similarity</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr v-for="(item, index) in explanation.trace.associations" :key="item.movieId">
                      <th scope="row">F{{ index + 1 }} · {{ movieName(item.movieId) }}</th>
                      <td>{{ item.favoriteViewers }}</td>
                      <td>{{ item.sharedViewers }}</td>
                      <td>{{ num(item.similarity) }}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <button
                v-if="explanation.trace.kind === 'user' && explanation.trace.neighbors.length > 8"
                class="text-button evidence-toggle"
                :aria-expanded="showAll"
                @click="showAll = !showAll"
              >
                {{
                  showAll
                    ? 'Show the first 8 neighbors'
                    : `Show all ${explanation.trace.neighbors.length} neighbors`
                }}
              </button>
              <p v-if="explanation.trace.kind === 'user'" class="calculation-note">
                Ranks belong only to this calculation. No historical user identifiers or full
                preference profiles are returned.
              </p>
            </div>
          </section>
          <section class="calculation-step">
            <span class="step-number">04</span>
            <div>
              <p class="eyebrow">THE FINAL CALCULATION</p>
              <h2>
                {{
                  explanation.trace.kind === 'user'
                    ? 'Add the weighted votes.'
                    : explanation.trace.kind === 'item'
                      ? explanation.parameters.itemAggregation === 'mean'
                        ? 'Average all the connections.'
                        : 'Take the strongest connection.'
                      : 'Divide by the whole community.'
                }}
              </h2>
              <p v-if="explanation.trace.kind === 'user'">
                s<sub>u</sub> is a neighbor’s similarity. Add it when that neighbor picked the film,
                then divide by the sum of every chosen neighbor’s similarity. An unknown preference
                adds no positive evidence; it is not a negative rating.
              </p>
              <p v-else-if="explanation.trace.kind === 'item'">
                s<sub>f</sub> is similarity to one selected favorite.
                {{
                  explanation.parameters.itemAggregation === 'mean'
                    ? 'Add every similarity, including zeros, and divide by the number of favorites.'
                    : 'Use the largest similarity. Other favorites do not affect this candidate’s score in this mode.'
                }}
              </p>
              <MathEquation
                :kind="
                  explanation.trace.kind === 'user'
                    ? 'weighted'
                    : explanation.trace.kind === 'item'
                      ? explanation.parameters.itemAggregation
                      : 'popularity'
                "
              />
              <div class="final-calculation">
                <code
                  >{{ num(explanation.trace.numerator) }} /
                  {{
                    explanation.trace.denominator === 1 ? '1' : num(explanation.trace.denominator)
                  }}
                  = {{ num(explanation.score) }}</code
                >
                <p>
                  × 100 → <strong>{{ Math.round(explanation.score * 100) }}%</strong>
                  {{ explanation.algorithm === 'popularity' ? 'of viewers' : 'affinity' }}
                </p>
              </div>
              <p>
                Candidates are sorted by raw score, highest first. Ties use ascending dataset movie
                ID.
                {{
                  explanation.rank
                    ? `This film places #${explanation.rank}.`
                    : 'This candidate has no positive support and does not appear in the personalized list.'
                }}
                Unsupported personalized candidates are omitted.
              </p>
              <p class="calculation-note">
                The calculation uses full precision; displayed intermediate values are rounded.
                Affinity is not a calibrated probability. Each method has its own scale, and the
                best score is never rescaled to 100%.
              </p>
            </div>
          </section>
        </div>
        <section class="explanation-return">
          <h2>Now, back to the good part.</h2>
          <p>Keep exploring your next movie night.</p>
          <NuxtLink to="/" class="primary-button"
            >Return to Next Reel <AppIcon name="arrow" :size="18"
          /></NuxtLink>
        </section>
      </template>
    </main>
    <footer class="site-footer">
      <span>Real preferences. Transparent calculations.</span
      ><a href="https://github.com/nachourpi/next-reel" target="_blank" rel="noreferrer"
        >View the source</a
      >
    </footer>
  </div>
</template>
