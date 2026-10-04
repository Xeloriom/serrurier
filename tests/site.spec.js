import { expect, test } from '@playwright/test';

const pages = [
  { path: '/', title: /Serrurier à Lyon/ },
  { path: '/ouverture-porte-lyon/', title: /ouverture de porte/i },
  { path: '/serrure-porte-blindee-lyon/', title: /serrure et porte blindée/i },
  { path: '/volet-roulant-lyon/', title: /volet roulant/i },
  { path: '/vitrerie-lyon/', title: /vitrerie/i },
  { path: '/zone-intervention-serrurier-lyon/', title: /zone d'intervention serrurier/i },
];

for (const { path, title } of pages) {
  test(`${path} loads without browser errors`, async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const errors = [];
    page.on('console', (message) => {
      if (message.type() === 'error') errors.push(message.text());
    });
    page.on('pageerror', (error) => errors.push(error.message));

    const response = await page.goto(path);
    expect(response?.status(), `${path} should return HTTP 200`).toBe(200);
    await expect(page).toHaveTitle(title);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
      'href',
      `https://xn--serrurierdpannagerapide-kcc.fr${path}`,
    );
    await expect(page.locator('meta[property="og:url"]')).toHaveAttribute(
      'content',
      `https://xn--serrurierdpannagerapide-kcc.fr${path}`,
    );
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      'content',
      'index, follow, max-image-preview:large',
    );
    await page.waitForTimeout(500);

    expect(errors, `Browser console errors on ${path}`).toEqual([]);
  });
}

test('crawler discovery files list all canonical public pages', async ({ request }) => {
  const [robots, sitemap, llms] = await Promise.all([
    request.get('/robots.txt'),
    request.get('/sitemap.xml'),
    request.get('/llms.txt'),
  ]);

  expect(robots.status()).toBe(200);
  expect(await robots.text()).toContain(
    'Sitemap: https://xn--serrurierdpannagerapide-kcc.fr/sitemap.xml',
  );
  expect(sitemap.status()).toBe(200);
  expect(llms.status()).toBe(200);

  const sitemapText = await sitemap.text();
  const llmsText = await llms.text();
  for (const { path } of pages) {
    const canonical = `https://xn--serrurierdpannagerapide-kcc.fr${path}`;
    expect(sitemapText).toContain(`<loc>${canonical}</loc>`);
    expect(llmsText).toContain(canonical);
  }
});

test('homepage menu and quote form work without browser errors', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const errors = [];
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text());
  });
  page.on('pageerror', (error) => errors.push(error.message));

  await page.goto('/');

  const menuButton = page.locator('button[aria-controls="mobile-navigation"]');
  await menuButton.click();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'true');
  await menuButton.click();
  await expect(menuButton).toHaveAttribute('aria-expanded', 'false');

  await page.locator('#quote-form').evaluate((form) => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
  });
  await expect(page.locator('#quote-form-status')).toContainText('Indiquez votre nom');
  expect(errors, 'Browser console errors during homepage interactions').toEqual([]);
});

test('mobile layout fits narrow screens and updates hero images while scrolling', async ({ page }) => {
  for (const width of [320, 375, 390]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/');
    await expect(page.locator('.hero-photo').first()).toBeVisible();
    await page.waitForFunction(() => document.querySelector('.hero-photo')?.naturalWidth > 0);

    const dimensions = await page.evaluate(() => ({
      viewport: document.documentElement.clientWidth,
      content: document.documentElement.scrollWidth,
    }));
    expect(dimensions.content, `Horizontal overflow at ${width}px`).toBeLessThanOrEqual(dimensions.viewport);

    for (const [step, count, image] of [
      ['hero-step-1', '01', 'assets/locksmith-work.webp'],
      ['hero-step-2', '02', 'assets/security-door.webp'],
      ['hero-step-3', '03', 'assets/door-installation.webp'],
    ]) {
      await page.locator(`#${step}`).evaluate((element) => element.scrollIntoView({ block: 'center', behavior: 'instant' }));
      await expect(page.locator('#hero-image-current')).toHaveText(count);
      await expect.poll(async () => page.locator('.hero-photo.is-active').getAttribute('src')).toBe(image);
    }
  }
});

test('FAQ assistant answers questions locally and offers direct contact', async ({ page }) => {
  await page.goto('/');

  const toggle = page.getByRole('button', { name: 'Poser une question à l’assistant serrurerie' });
  const panel = page.getByRole('dialog', { name: 'Assistant serrurerie' });
  await expect(panel).toBeHidden();
  await toggle.click();
  await expect(panel).toBeVisible();
  await expect(toggle).toHaveAttribute('aria-expanded', 'true');

  await page.getByRole('button', { name: 'Disponibilité' }).click();
  await expect(panel).toContainText('Le service est annoncé 24h/24 et 7j/7');

  await page.getByLabel('Votre question').fill('Combien coûte une intervention ?');
  await page.getByRole('button', { name: 'Envoyer la question' }).click();
  await expect(panel).toContainText('Le site ne publie pas de tarif');
  await expect(panel.getByRole('link', { name: 'Appeler' })).toHaveAttribute('href', 'tel:+33778952440');
  await expect(panel.getByRole('link', { name: 'Écrire sur WhatsApp' })).toHaveAttribute('href', /wa\.me\/33778952440/);

  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});
