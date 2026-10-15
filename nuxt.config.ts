export default defineNuxtConfig({
  compatibilityDate: '2026-10-14',
  devtools: { enabled: false },
  css: ['@fontsource-variable/fraunces', '@fontsource-variable/manrope', '~/assets/css/main.css'],
  app: {
    head: {
      title: 'Next Reel · Find your kind of film',
      htmlAttrs: { lang: 'en' },
      meta: [
        {
          name: 'description',
          content:
            'Pick a few films you love. Discover your next favorite through shared taste, with thoughtful recommendations from 806 movie lovers.',
        },
      ],
      link: [{ rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' }],
    },
  },
  nitro: {
    preset: 'cloudflare_pages',
    output: { dir: '.output/public' },
    prerender: { routes: ['/', '/explain'] },
    cloudflare: { pages: { defaultRoutes: false, routes: { include: ['/api/*'], exclude: [] } } },
  },
  typescript: { strict: true },
})
