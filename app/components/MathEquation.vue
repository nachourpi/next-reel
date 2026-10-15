<script setup lang="ts">
defineProps<{ kind: 'cosine' | 'jaccard' | 'weighted' | 'mean' | 'max' | 'popularity' }>()
const labels = {
  cosine:
    'Cosine similarity equals shared count divided by the square root of left count times right count.',
  jaccard:
    'Jaccard similarity equals shared count divided by left count plus right count minus shared count.',
  weighted:
    'Score equals the sum of similarities of neighbors who picked the film, divided by the sum of similarities of all selected neighbors.',
  mean: 'Score equals the sum of movie similarities to selected favorites, divided by the number of favorites.',
  max: 'Score equals the largest movie similarity to a selected favorite.',
  popularity: 'Score equals viewers who picked the film divided by total viewers.',
}
</script>
<template>
  <div class="math-equation" role="img" :aria-label="labels[kind]">
    <math xmlns="http://www.w3.org/1998/Math/MathML" display="block" aria-hidden="true">
      <mrow v-if="kind === 'cosine' || kind === 'jaccard'">
        <mi>similarity</mi><mo>=</mo
        ><mfrac
          ><msub><mi>n</mi><mtext>shared</mtext></msub>
          <msqrt v-if="kind === 'cosine'"
            ><msub><mi>n</mi><mtext>left</mtext></msub
            ><mo>×</mo><msub><mi>n</mi><mtext>right</mtext></msub></msqrt
          >
          <mrow v-else
            ><msub><mi>n</mi><mtext>left</mtext></msub
            ><mo>+</mo><msub><mi>n</mi><mtext>right</mtext></msub
            ><mo>−</mo><msub><mi>n</mi><mtext>shared</mtext></msub></mrow
          >
        </mfrac>
      </mrow>
      <mrow v-else-if="kind === 'weighted'"
        ><mi>score</mi><mo>=</mo
        ><mfrac>
          <mrow
            ><munder><mo>∑</mo><mtext>neighbors who picked film</mtext></munder
            ><msub><mi>s</mi><mi>u</mi></msub></mrow
          >
          <mrow
            ><munder><mo>∑</mo><mtext>all chosen neighbors</mtext></munder
            ><msub><mi>s</mi><mi>u</mi></msub></mrow
          >
        </mfrac></mrow
      >
      <mrow v-else-if="kind === 'mean'"
        ><mi>score</mi><mo>=</mo
        ><mfrac
          ><mrow
            ><munder><mo>∑</mo><mtext>selected favorites</mtext></munder
            ><msub><mi>s</mi><mi>f</mi></msub></mrow
          ><mtext>number of favorites</mtext></mfrac
        ></mrow
      >
      <mrow v-else-if="kind === 'max'"
        ><mi>score</mi><mo>=</mo><munder><mi>max</mi><mtext>selected favorites</mtext></munder
        ><msub><mi>s</mi><mi>f</mi></msub></mrow
      >
      <mrow v-else
        ><mi>score</mi><mo>=</mo
        ><mfrac><mtext>viewers who picked film</mtext><mtext>total viewers</mtext></mfrac></mrow
      >
    </math>
  </div>
</template>
