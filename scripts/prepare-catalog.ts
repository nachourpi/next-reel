import { readFile, writeFile, mkdir, access } from 'node:fs/promises'
import sharp from 'sharp'
import type { Dataset, Movie } from '../shared/types'

interface TMDBMovie {
  id: number
  title: string
  release_date: string
  overview: string
  poster_path: string | null
  runtime?: number
  genres?: { id: number; name: string }[]
}

const root = new URL('../', import.meta.url)
const token = process.env.TMDB_READ_ACCESS_TOKEN
if (!token) throw new Error('Set TMDB_READ_ACCESS_TOKEN in your local .env file.')
const dataset: Dataset = JSON.parse(await readFile(new URL('movies.json', root), 'utf8'))

async function api<T>(path: string): Promise<T> {
  const response = await fetch(`https://api.themoviedb.org/3/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(20000),
  })
  if (!response.ok) throw new Error(`TMDB returned HTTP ${response.status}.`)
  return response.json() as Promise<T>
}

if (process.argv.includes('--discover')) {
  const candidates = []
  for (const [id, sourceTitle] of Object.entries(dataset.movies)) {
    const title = sourceTitle.replace(/ \(\d{4}\)$/, '').replace(/^(.*), (The|An|A)$/, '$2 $1')
    const year = Number(sourceTitle.match(/\((\d{4})\)$/)?.[1])
    const search = await api<{ results: TMDBMovie[] }>(
      `search/movie?language=en-US&query=${encodeURIComponent(title)}`,
    )
    const matches = [...search.results]
      .sort(
        (a, b) =>
          Math.abs(Number(a.release_date?.slice(0, 4)) - year) -
          Math.abs(Number(b.release_date?.slice(0, 4)) - year),
      )
      .slice(0, 4)
    candidates.push({
      id: Number(id),
      sourceTitle,
      matches: matches.map((m) => ({
        id: m.id,
        title: m.title,
        year: m.release_date,
        poster: !!m.poster_path,
      })),
    })
  }
  await mkdir(new URL('.generated/', root), { recursive: true })
  await writeFile(
    new URL('.generated/tmdb-candidates.json', root),
    JSON.stringify(candidates, null, 2),
  )
  console.log(
    'Review .generated/tmdb-candidates.json, then create data/tmdb-mapping.json with the verified IDs.',
  )
} else {
  const mapping: Record<string, number> = JSON.parse(
    await readFile(new URL('data/tmdb-mapping.json', root), 'utf8'),
  )
  await mkdir(new URL('public/posters/', root), { recursive: true })
  const catalog: Movie[] = []
  for (const [id, sourceTitle] of Object.entries(dataset.movies)) {
    if (!mapping[id])
      throw new Error(`Missing verified TMDB mapping for movie ${id}: ${sourceTitle}`)
    const movie = await api<TMDBMovie>(`movie/${mapping[id]}?language=en-US`)
    if (!movie.overview.trim())
      throw new Error(`Missing English synopsis for movie ${id}: ${sourceTitle}`)
    for (const width of [342, 500]) {
      if (!movie.poster_path) continue
      const destination = new URL(`public/posters/${id}-${width}.webp`, root)
      try {
        await access(destination)
        continue
      } catch {
        /* Download only missing posters. */
      }
      const response = await fetch(`https://image.tmdb.org/t/p/w${width}${movie.poster_path}`, {
        signal: AbortSignal.timeout(20000),
      })
      if (!response.ok) throw new Error(`Could not download poster for movie ${id}.`)
      await sharp(Buffer.from(await response.arrayBuffer()))
        .webp({ quality: 82 })
        .toFile(destination.pathname)
    }
    catalog.push({
      id: Number(id),
      sourceTitle,
      title: movie.title,
      year: Number(movie.release_date.slice(0, 4)),
      genres: movie.genres?.map((g) => g.name) ?? [],
      overview: movie.overview,
      runtime: movie.runtime || null,
      tmdbId: movie.id,
      poster: movie.poster_path ? `/posters/${id}-342.webp` : null,
      posterLarge: movie.poster_path ? `/posters/${id}-500.webp` : null,
    })
    console.log(`Prepared ${id}/70: ${movie.title} (${movie.release_date.slice(0, 4)})`)
  }
  await writeFile(new URL('data/catalog.json', root), JSON.stringify(catalog, null, 2) + '\n')
  const backdrop = new URL('public/cinema-backdrop.webp', root)
  try {
    await access(backdrop)
  } catch {
    const source = await api<{ backdrop_path: string }>('movie/78')
    const image = await fetch(`https://image.tmdb.org/t/p/w1280${source.backdrop_path}`, {
      signal: AbortSignal.timeout(20000),
    })
    if (!image.ok) throw new Error('Could not download the Blade Runner backdrop.')
    await sharp(Buffer.from(await image.arrayBuffer()))
      .webp({ quality: 75 })
      .toFile(backdrop.pathname)
  }
  console.log('Catalog complete. Credentials are not needed for builds or deployment.')
}
