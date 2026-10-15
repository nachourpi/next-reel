import { expect, test } from '@playwright/test'

test('selects, filters, saves and removes favorites', async ({ page }) => {
  await page.goto('/')
  const toyStory = page.getByRole('button', { name: 'Select Toy Story', exact: true })
  await expect(toyStory).toHaveAttribute('aria-pressed', 'false')
  await toyStory.click()
  await expect(toyStory).toHaveAttribute('aria-pressed', 'true')
  await expect(page.getByRole('searchbox', { name: 'Search movies' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Search & filters' }).click()
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

test('personalizes, expands, switches methods and returns to the saved selection', async ({
  page,
}) => {
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
  await expect(page.getByRole('tab')).toHaveCount(3)
  await page.getByRole('tab', { name: 'Item-Based' }).click()
  await expect(page.getByRole('tabpanel', { name: 'Item-Based' })).toBeVisible()
  await page.getByRole('tab', { name: 'Popularity' }).click()
  await expect(page.locator('.result-item').first()).toContainText('of viewers')
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
  await expect(page.getByRole('tab', { name: 'User-Based KNN' })).toBeDisabled()
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

test('prevents changes and duplicate submissions while finding recommendations', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Select Toy Story', exact: true }).click()
  let release!: () => void
  const waiting = new Promise<void>((resolve) => {
    release = resolve
  })
  await page.route('**/api/recommendations', async (route) => {
    await waiting
    await route.continue()
  })
  await page.getByRole('button', { name: 'Find my next reel', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Finding your next reel' })).toBeDisabled()
  await expect(
    page.getByRole('button', { name: 'Select Toy Story', exact: true, includeHidden: true }),
  ).toBeDisabled()
  release()
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
  await page.getByRole('button', { name: 'Search & filters' }).click()
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

test('hides active filters cleanly and starts over with an empty saved selection', async ({
  page,
}) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Select Toy Story', exact: true }).click()
  await page.getByRole('button', { name: 'Search & filters' }).click()
  await page.getByRole('searchbox', { name: 'Search movies' }).fill('alien')
  await page.getByRole('button', { name: 'Hide filters' }).click()
  await expect(page.locator('.movie-card')).toHaveCount(70)
  await page.getByRole('button', { name: 'Find my next reel', exact: true }).click()
  await page.getByRole('button', { name: 'Start over', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Good films. Your kind of good.' })).toBeVisible()
  await expect(page.locator('.selection-count')).toContainText('Your next favorite starts here')
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('next-reel:likes')!))).toEqual(
    [],
  )
})

test('adjusts both algorithms explicitly and explains real calculation snapshots', async ({
  page,
}) => {
  const browserErrors: string[] = []
  page.on('pageerror', (error) => browserErrors.push(error.message))
  await page.goto('/')
  for (const title of ['Toy Story', 'The Shawshank Redemption'])
    await page.getByRole('button', { name: `Select ${title}`, exact: true }).click()
  await page.getByRole('button', { name: 'Find my next reel', exact: true }).click()
  await page.getByRole('button', { name: 'Algorithm settings', exact: true }).click()
  await page.getByLabel('Neighbors (K)', { exact: true }).fill('12')
  await page.getByLabel('Viewer similarity', { exact: true }).selectOption('jaccard')
  await page.getByLabel('Movie similarity', { exact: true }).selectOption('jaccard')
  await page.getByLabel('Combine associations', { exact: true }).selectOption('max')
  const recResponse = page.waitForResponse(
    (response) =>
      response.url().endsWith('/api/recommendations') && response.request().method() === 'POST',
  )
  await page.getByRole('button', { name: 'Apply & recalculate' }).click()
  const result = await (await recResponse).json()
  expect(result.parameters).toEqual({
    neighbors: 12,
    userMetric: 'jaccard',
    itemMetric: 'jaccard',
    itemAggregation: 'max',
  })
  await expect(page.getByRole('button', { name: 'Apply & recalculate' })).toBeEnabled()
  const firstUserScore = Math.round(result.results[0].recommendations[0].score * 100)
  await page.getByRole('link', { name: 'Why this film?' }).first().click()
  await expect(page.getByRole('heading', { name: 'Find viewers with shared taste.' })).toBeVisible()
  await expect(page.locator('.explanation-score')).toContainText(`${firstUserScore}%`)
  await expect(page.locator('.calculation-steps')).toContainText('12 closest positive matches')
  await expect(page.locator('math')).toHaveCount(2)
  await expect(page.getByRole('img', { name: /Actual User-Based KNN evidence/ })).toBeVisible()
  await page.getByRole('link', { name: 'Back to your picks', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Your next great watch.' })).toBeVisible()
  await expect(page).toHaveTitle('Next Reel · Find your kind of film')
  await expect(page.getByLabel('Neighbors (K)', { exact: true })).toHaveValue('12')
  await page.getByRole('tab', { name: 'Item-Based' }).click()
  await page.getByRole('tab', { name: 'Item-Based' }).press('ArrowRight')
  await expect(page.getByRole('tab', { name: 'Popularity' })).toBeFocused()
  await page.getByRole('tab', { name: 'Item-Based' }).click()
  await page.getByRole('link', { name: 'How this method works', exact: false }).click()
  await expect(page.getByRole('heading', { name: 'Take the strongest connection.' })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Take the strongest connection.' })).toBeVisible()
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  )
  expect(browserErrors).toEqual([])
})

test('explains cold start and recovers from explanation API errors', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: 'Find my next reel', exact: true }).click()
  await page.route(
    '**/api/explanations',
    (route) => route.fulfill({ status: 500, json: { message: 'Unavailable' } }),
    { times: 1 },
  )
  await page.getByRole('link', { name: 'Why this film?' }).first().click()
  await expect(page.getByRole('alert')).toContainText('We could not load this calculation')
  await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Divide by the whole community.' })).toBeVisible()
  await expect(page.locator('.final-calculation')).toContainText('72%')
})

test('validates explanation inputs and keeps evidence anonymous', async ({ request }) => {
  for (const data of [
    { likedMovieIds: [1], algorithm: 'invalid' },
    { likedMovieIds: [1], movieId: 1 },
    { likedMovieIds: [1], movieId: 999 },
    { likedMovieIds: [1], parameters: { neighbors: 0 } },
  ])
    expect((await request.post('/api/explanations', { data })).status()).toBe(400)
  const response = await request.post('/api/explanations', {
    data: { likedMovieIds: [1], algorithm: 'user', parameters: { neighbors: 40 } },
  })
  expect(response.headers()['cache-control']).toBe('no-store')
  const data = await response.json()
  expect(data.trace.neighbors).toHaveLength(40)
  for (const neighbor of data.trace.neighbors) {
    expect(neighbor).not.toHaveProperty('user_id')
    expect(neighbor).not.toHaveProperty('likes')
    expect(neighbor.sharedMovieIds).toEqual([1])
  }
})
