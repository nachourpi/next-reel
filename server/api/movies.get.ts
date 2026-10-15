import catalog from '../../data/catalog.json'

export default defineEventHandler((event) => {
  setHeader(event, 'Cache-Control', 'public, max-age=3600')
  return { movies: catalog, stats: { movieCount: 70, userCount: 806, preferenceCount: 15344 } }
})
