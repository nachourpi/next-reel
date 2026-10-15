import { expect, test } from '@playwright/test'

test('selects, filters, saves and removes favorites', async ({ page }) => {
  await page.goto('/')
  const toyStory = page.getByRole('button', { name: 'Select Toy Story', exact: true })
  await expect(toyStory).toHaveAttribute('aria-pressed', 'false')
  await toyStory.click()
  await expect(toyStory).toHaveAttribute('aria-pressed', 'true')
  await page.getByRole('searchbox', { name: 'Search movies' }).fill('alien')
  await expect(page.getByRole('button', { name: 'Select Alien', exact: true })).toBeVisible()
  await expect(toyStory).toHaveCount(0)
  await page.reload()
  await expect(page.getByRole('button', { name: 'Select Toy Story', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByRole('button', { name: 'Remove Toy Story', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Select Toy Story', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
})

test('opens an accessible movie dialog and restores focus on escape', async ({ page }) => {
  await page.goto('/')
  const details = page.getByRole('button', { name: 'About Toy Story', exact: true })
  await details.click()
  const dialog = page.getByRole('dialog', { name: 'Toy Story', exact: true })
  await expect(dialog).toBeVisible()
  await expect(dialog).toContainText('1995')
  await expect(dialog).toContainText('81 min')
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0)
  await expect(details).toBeFocused()
})

test('personalizes, expands, compares and returns to the saved selection', async ({
  page,
}, testInfo) => {
  await page.goto('/')
  for (const title of ['Toy Story', 'Twelve Monkeys', 'Braveheart'])
    await page.getByRole('button', { name: `Select ${title}`, exact: true }).click()
  await page.getByRole('button', { name: 'Find my next reel', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Your next great watch.' })).toBeVisible()
  await expect(page.locator('.result-item')).toHaveCount(5)
  await expect(
    page
      .locator('.result-grid')
      .getByRole('button', { name: 'Details for Toy Story', exact: true }),
  ).toHaveCount(0)
  await page.getByRole('button', { name: 'Five more possibilities' }).click()
  await expect(page.locator('.result-item')).toHaveCount(10)
  await page.getByRole('button', { name: 'Compare methods' }).click()
  await expect(page.locator('.method-panel')).toHaveCount(3)
  if (testInfo.project.name === 'mobile') {
    await page.getByRole('tab', { name: 'Connected films' }).click()
    await expect(page.getByRole('tabpanel', { name: 'Connected films' })).toBeVisible()
    await expect(page.getByRole('tabpanel', { name: 'Shared taste' })).toBeHidden()
  }
  await page.getByRole('button', { name: 'Edit your taste' }).click()
  await expect(page.getByRole('button', { name: 'Select Toy Story', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByRole('button', { name: 'Clear selection' }).click()
  await expect(page.getByRole('button', { name: 'Select Toy Story', exact: true })).toHaveAttribute(
    'aria-pressed',
    'false',
  )
})

test('offers clearly labeled popular picks with no favorites', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Find my next reel', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'A good place to start.' })).toBeVisible()
  await expect(page.locator('.result-item')).toHaveCount(5)
  await expect(page.locator('.result-item').first()).toContainText('Star Wars')
  await expect(page.locator('.result-item').first()).toContainText('72')
  await expect(page.locator('.result-item').first()).toContainText('of viewers')
  await expect(page.getByRole('button', { name: 'Compare methods' })).toHaveCount(0)
})

test('recovers from a recommendation error without losing favorites', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Select Toy Story', exact: true }).click()
  await page.route(
    '**/api/recommendations',
    (route) => route.fulfill({ status: 500, json: { message: 'Unavailable' } }),
    { times: 1 },
  )
  await page.getByRole('button', { name: 'Find my next reel', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Please try again')
  await expect(page.getByRole('button', { name: 'Select Toy Story', exact: true })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await page.getByRole('button', { name: 'Find my next reel', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Your next great watch.' })).toBeVisible()
})

test('handles empty search, missing posters and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.route('**/posters/1-*.webp', (route) => route.abort())
  await page.goto('/')
  await expect(page.getByRole('button', { name: 'Select Toy Story', exact: true })).toContainText(
    'Poster unavailable',
  )
  expect(
    await page
      .locator('.movie-card')
      .first()
      .evaluate((el) => getComputedStyle(el).animationName),
  ).toBe('none')
  await page.getByRole('searchbox', { name: 'Search movies' }).fill('not-a-real-movie')
  await expect(page.getByRole('heading', { name: 'No films in this frame.' })).toBeVisible()
  await page.getByRole('button', { name: 'Reset filters' }).click()
  await expect(page.locator('.movie-card')).toHaveCount(70)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
})

test('handles a completely selected catalog', async ({ page }) => {
  await page.addInitScript(() =>
    localStorage.setItem(
      'next-reel:likes',
      JSON.stringify(Array.from({ length: 70 }, (_, i) => i + 1)),
    ),
  )
  await page.goto('/')
  await expect(page.locator('.selection-count')).toContainText('70')
  await page.getByRole('button', { name: 'Find my next reel', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'You’ve covered the collection.' })).toBeVisible()
})

test('validates the public API and exposes no historical profiles', async ({ request }) => {
  const catalog = await request.get('/api/movies')
  const data = await catalog.json()
  expect(data.movies).toHaveLength(70)
  expect(data).not.toHaveProperty('users')
  const bad = await request.post('/api/recommendations', { data: { likedMovieIds: [999] } })
  expect(bad.status()).toBe(400)
  const good = await request.post('/api/recommendations', {
    data: { likedMovieIds: [1, 1], compare: true, limit: 5 },
  })
  const result = await good.json()
  expect(result.results).toHaveLength(3)
  for (const method of result.results) {
    expect(method.recommendations).toHaveLength(5)
    expect(method.recommendations.every((item: { movieId: number }) => item.movieId !== 1)).toBe(
      true,
    )
  }
})
