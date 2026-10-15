<script setup lang="ts">
defineEmits<{ close: [] }>()
</script>
<template>
  <AppDialog title="How Next Reel works" @close="$emit('close')"
    ><div class="about-content">
      <p class="eyebrow">A LITTLE SCIENCE. A LOT OF SHARED TASTE.</p>
      <h3>Good recommendations<br />start with good company.</h3>
      <p>
        Next Reel looks for patterns in 15,344 positive preferences from 806 viewers across 70
        films. A missing preference means unknown, never disliked.
      </p>
      <dl>
        <dt>Shared taste · User-Based KNN</dt>
        <dd>
          We find up to 40 viewers whose favorites overlap with yours using cosine similarity. Their
          other favorites become your recommendations, weighted by how closely your tastes match.
        </dd>
        <dt>Connected films · Item-Based</dt>
        <dd>
          We compare films by the audiences who picked them, then average each candidate’s cosine
          similarity to your favorites.
        </dd>
        <dt>Crowd favorites · Popularity</dt>
        <dd>
          Without favorites, we start with the films most viewers selected. The percentage is their
          share of all 806 viewers.
        </dd>
      </dl>
      <div class="about-callout">
        <strong>What does affinity mean?</strong>
        <p>
          Shared taste shows the similarity-weighted share of neighbors who picked a film. Connected
          films shows average movie similarity. Both are multiplied by 100, without rescaling. They
          are ranking scores, not calibrated probabilities, and are not directly comparable between
          methods.
        </p>
      </div>
      <p class="privacy-note">
        Your favorites are saved only in this browser and sent to the recommendation API when you
        request picks. They are not added to the historical dataset.
      </p>
      <div class="tmdb-credit">
        <a href="https://www.themoviedb.org" target="_blank" rel="noreferrer"
          ><img src="/tmdb-logo.svg" alt="TMDB" width="112" height="15"
        /></a>
        <p>This product uses the TMDB API but is not endorsed or certified by TMDB.</p>
        <small
          >Movie metadata and poster images courtesy of TMDB. Recommendations use only the supplied
          preference dataset.</small
        >
      </div>
    </div></AppDialog
  >
</template>
