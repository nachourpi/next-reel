# Next Reel

**Good films. Your kind of good.**

A movie discovery app built for the TrueFire Studios technical assessment. Pick films you have seen and loved, then find your next watch through the preferences of other viewers.

[Live demo](https://next-reel.pages.dev) · [Source](https://github.com/nachourpi/next-reel)

## Run locally

Requires Node **22.23.0** (see `.nvmrc`).

```sh
nvm use
npm ci
npm run dev
```

Open http://127.0.0.1:3000. The committed catalog includes English metadata, 140 optimized WebP posters and a TMDB backdrop. No API keys or external services are needed to run, test or build the app.

```sh
npm run verify       # Typecheck, unit tests and production build
npm run evaluate     # Reproduce the recommendation evaluation
npx playwright install chromium
npm run test:e2e     # Browser tests on desktop and mobile
npm run preview      # Run the built app in Cloudflare's local runtime
```

## The experience

- A cinema-inspired poster collection with warm charcoal, ivory and coral, self-hosted Fraunces and Manrope, short transitions and reduced-motion support.
- Search and genre filters, persistent favorites, movie details, five initial recommendations and five more on demand.
- An optional comparison between user-based, item-based and popularity recommendations, with mobile tabs.
- Cold-start popular picks, computed explanations, clear error states and keyboard-accessible dialogs.

Favorites are stored in localStorage in the current browser. Clicking the recommendation button sends selected movie IDs to the API. Preferences are never appended to the historical dataset, and request bodies are not logged by application code.

## Architecture

One Nuxt 4 / Vue / TypeScript application, with two Nitro endpoints and no database. Cloudflare Pages serves the prerendered entry page and static assets; its Worker runs the API. Pages was chosen to provide a project-specific `pages.dev` address without changing the existing account-wide Workers subdomain.

- `app/`: Vue components, UI state and CSS.
- `server/recommender/`: framework-independent recommendation and validation functions.
- `server/api/`: catalog and recommendation endpoints.
- `scripts/`: model preparation, catalog enrichment and reproducible evaluation.
- `data/`: reviewed TMDB mapping and prepared public movie metadata.
- `movies.json`: the original assessment dataset, unchanged.

The build prepares popularity counts and the 70-by-70 item similarity matrix in an ignored generated directory. The server model contains anonymous preference arrays, not historical user IDs. The browser receives movie metadata and aggregate recommendation evidence only. Recommendation functions are shared by the API, tests and evaluation script.

### API

`GET /api/movies` returns `movies` and aggregate `stats`.

`POST /api/recommendations` accepts:

```json
{
  "likedMovieIds": [23, 33, 68],
  "compare": true,
  "limit": 10
}
```

`likedMovieIds` is required; duplicates are removed and every ID must belong to the catalog. `compare` defaults to false. `limit` accepts 5 or 10 and defaults to 10. Malformed input returns HTTP 400.

The response contains a `mode` (`personalized` or `popular`) and `results`. Each result identifies its algorithm, fallback status and ranked recommendations with `movieId`, a score in [0, 1], a reason and aggregate supporting evidence. Comparison returns user-based, item-based and popularity lists. Empty selections return one popularity list. Responses are not cached.

## Recommendation methods

The dataset contains **70 films, 806 viewers and 15,344 positive preferences**. An absent preference means **unknown**, not disliked. No ratings, dislikes, viewing history or external movie ratings are inferred.

### User-Based KNN, the default

For selected favorites S and historical viewer favorites U:

```text
similarity(S, U) = |S ∩ U| / sqrt(|S| × |U|)
score(movie) = sum(similarity of neighbors who picked movie)
               / sum(similarity of all chosen neighbors)
```

Use up to 40 neighbors with positive cosine similarity. More similar viewers contribute more weight. The UI explains how many chosen neighbors selected each recommendation. Forty is a fixed, documented baseline, not a claimed optimal hyperparameter.

### Item-Based collaborative filtering

```text
similarity(A, B) = viewers who picked both A and B
                   / sqrt(viewers who picked A × viewers who picked B)
score(movie) = average similarity(movie, selected favorite)
```

Films are related through their audiences. Genres, synopses and posters do not affect ranking. The explanation names the selected favorite with the strongest association.

### Popularity

```text
score(movie) = viewers who picked movie / total viewers
```

Used for empty selections and explicitly labeled fallbacks when personalization has no supporting candidates. Each method excludes selected movies, breaks score ties by ascending movie ID and returns fewer recommendations when the catalog is exhausted.

### Interpreting percentages

The UI multiplies each raw score by 100 and rounds for display. It never stretches the best result to 100%. Affinity is **not a calibrated probability**, and user-based and item-based scores have different meanings and scales. Popularity percentages are actual proportions of dataset viewers.

## Evaluation

Run `npm run evaluate`. Seed 42 produces an 80/20 split of preference-profile groups. Identical profiles stay in one partition, preventing duplicate-profile leakage. All models use only training users; test users are excluded entirely.

The split yields **644 training users** and **123 eligible test users** with at least six positive preferences. The same test cohort is evaluated with one, three and five revealed favorites. The remaining recorded positives are hidden targets. All 70 movies remain candidates, excluding revealed favorites.

| Known likes | Method     | Recall@5 | Hit Rate@5 | Observed Precision@5 |
| ----------- | ---------- | -------- | ---------- | -------------------- |
| 1           | User-Based | 22.02%   | 97.56%     | 70.08%               |
| 1           | Item-Based | 20.45%   | 97.56%     | 66.18%               |
| 1           | Popularity | 20.80%   | 95.12%     | 67.32%               |
| 3           | User-Based | 27.95%   | 99.19%     | 71.54%               |
| 3           | Item-Based | 24.05%   | 95.12%     | 65.69%               |
| 3           | Popularity | 22.77%   | 94.31%     | 63.41%               |
| 5           | User-Based | 31.26%   | 96.75%     | 64.23%               |
| 5           | Item-Based | 25.55%   | 91.87%     | 61.79%               |
| 5           | Popularity | 24.33%   | 90.24%     | 57.89%               |

Recall@5 is the fraction of hidden positives recovered. Hit Rate@5 is the fraction of test users with at least one recovered positive. Observed Precision@5 is recovered positives divided by five. Results are averaged per test user.

KNN performs best on this split, supporting its use as the default. This is a small, relatively dense, positive-only dataset: unrecovered or unrecorded preferences do not prove dislike. These results measure recovery of recorded positives, not true recommendation accuracy or statistical significance. Production recommendations use all 806 viewers; the held-out evaluation builds a separate training-only model.

## Refresh movie metadata

This is an optional maintenance step, separate from builds and deployment.

1. Create a local `.env` from `.env.example` and set a TMDB API Read Access Token. Never commit it.
2. Run `npm run catalog` to refresh English metadata and download missing posters.
3. Review and commit the prepared assets and catalog.

`data/tmdb-mapping.json` explicitly maps every assessment movie ID to a reviewed TMDB movie ID. For discovery, `npm run catalog -- --discover` writes candidates to the ignored generated directory for manual review. It does not automatically approve matches.

Notable matches: _Il Postino_ is TMDB's _The Postman_; _The Professional_ is _Léon: The Professional_; _Independence Day (ID4)_ maps to the feature, not its making-of documentary; the Wallace & Gromit entry maps to the exact 1996 compilation. TMDB dates _Monty Python and the Holy Grail_ to 1975 and _Army of Darkness_ to 1992, while the original dataset says 1974 and 1993 respectively. The UI uses TMDB release years; original source titles and IDs are preserved.

## Deployment

The public GitHub repository connects directly to Cloudflare Pages:

- Production branch: `main`.
- Build command: `npm run verify`.
- Build output directory: `.output/public`.
- Node version: `22.23.0`.
- Compatibility flag: `nodejs_compat`.

Pushes run typecheck, unit tests and build before deployment. Browser tests are run separately against the local production runtime and public demo. There is no GitHub Actions workflow and no build-time TMDB secret.

For a manual deployment after `npm run verify`, authenticate with `npx wrangler login`, check `npx wrangler whoami`, then run `npm run deploy`. The Wrangler configuration pins the personal Cloudflare account and project name. Pages deployment logs and `wrangler pages deployment tail` are available for runtime diagnosis.

## Credits and limits

Movie metadata, posters and the atmospheric _Blade Runner_ backdrop are provided by [TMDB](https://www.themoviedb.org). **This product uses the TMDB API but is not endorsed or certified by TMDB.** Fontsource supplies the self-hosted fonts. The preference dataset was supplied with the assessment.

Recommendations are limited to this fixed collection and positive preferences. A film you have watched but did not select may still be recommended. The app has no accounts, negative-feedback model, server-side preference storage or calibrated probability model.
