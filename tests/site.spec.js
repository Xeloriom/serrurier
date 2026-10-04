import { expect, test } from '@playwright/test';

const pages = [
  { path: '/', title: /Serrurier à Lyon/ },
  { path: '/ouverture-porte-lyon/', title: /ouverture de porte/i },
  { path: '/serrure-porte-blindee-lyon/', title: /serrure et porte blindée/i },
  { path: '/volet-roulant-lyon/', title: /volet roulant/i },
  { path: '/vitrerie-lyon/', title: /vitrerie/i },
  { path: '/zone-intervention-serrurier-lyon/', title: /zone d'intervention serrurier/i },
  { path: '/prix-serrurier-lyon/', title: /prix serrurier à Lyon/i },
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

test('production CSS is bundled and does not load the Tailwind browser compiler', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('link[rel="stylesheet"][href*="/_astro/"]')).toHaveCount(1);
  await expect(page.locator('script[src*="tailwind-browser"]')).toHaveCount(0);
  await expect.poll(() => page.locator('body').evaluate((element) => getComputedStyle(element).fontFamily))
    .toContain('Inter');
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

test('pricing guide cites dated competitor prices and separates them from our quote', async ({ page }) => {
  await page.goto('/prix-serrurier-lyon/');

  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Prix d’un serrurier à Lyon : comparer un devis',
  );
  await expect(page.locator('main')).toContainText('ne sont pas les tarifs de Serrurier Dépannage Rapide');
  await expect(page.locator('main')).toContainText('4 octobre 2026');
  await expect(page.locator('main')).toContainText('110 à 140 € TTC');
  await expect(page.locator('main')).toContainText('65 € HT + 65 € HT/heure');
  await expect(page.locator('main').getByRole('link', { name: 'Voir la page serrurier à Lyon ↗' }))
    .toHaveAttribute('href', 'https://www.mesdepanneurs.fr/serrurier/lyon');
  await expect(page.locator('main').getByRole('link', { name: /Voir le tarif de changement de serrure/ }))
    .toHaveAttribute('href', 'https://hop-serrurier.fr/tarifs-changement-de-serrure/');
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
  await expect(panel).toContainText('Le site ne publie pas ses tarifs');
  await expect(panel.locator('.faq-assistant-message-avatar svg use')).toHaveCount(3);
  await expect(panel.getByRole('link', { name: 'Appeler' })).toHaveAttribute('href', 'tel:+33778952440');
  await expect(panel.getByRole('link', { name: 'Écrire sur WhatsApp' })).toHaveAttribute('href', /wa\.me\/33778952440/);

  await page.keyboard.press('Escape');
  await expect(panel).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});

test('FAQ assistant handles every supported topic and uncertain questions safely', async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('analytics-consent'));
  await page.goto('/');
  await expect(page.locator('#analytics-consent')).toBeVisible();
  await page.getByRole('button', { name: 'Continuer sans accepter' }).click();
  await page.getByRole('button', { name: 'Poser une question à l’assistant serrurerie' }).click();

  const input = page.getByLabel('Votre question');
  const cases = [
    {
      question: 'Que faire si ma porte est claquée ?',
      answer: 'Évitez de forcer la porte ou la serrure',
    },
    {
      question: 'Bonjour, j’ai oublié mes clés chez moi et je suis dehors…',
      answer: 'Évitez de forcer la porte ou la serrure',
    },
    {
      question: 'Ma porte est verrouillée, que faire ?',
      answer: 'Évitez de forcer la porte ou la serrure',
    },
    {
      question: 'Ma serrure tourne dans le vide, vous pouvez aider ?',
      answer: 'Évitez de forcer la porte ou la serrure',
    },
    {
      question: 'Combien coûte une intervention ?',
      answer: 'Le site ne publie pas ses tarifs',
    },
    {
      question: 'C’est combien pour ouvrir une porte claquée ?',
      answer: 'Le site ne publie pas ses tarifs',
    },
    {
      question: 'Vous faites un devis gratuit ?',
      answer: 'ne précise pas si le devis est gratuit',
    },
    {
      question: 'Vous acceptez la carte bancaire ?',
      answer: 'ne précise pas les moyens de paiement acceptés',
    },
    {
      question: 'Combien de temps avant que vous arriviez ?',
      answer: 'Le délai dépend de votre commune',
    },
    {
      question: 'Vous êtes disponibles maintenant ?',
      answer: 'Le service est annoncé 24h/24 et 7j/7',
    },
    {
      question: 'Vous travaillez le dimanche soir ?',
      answer: 'Le service est annoncé 24h/24 et 7j/7',
    },
    {
      question: 'Vous intervenez à Lyon ce soir ?',
      answer: 'Le service est annoncé 24h/24 et 7j/7',
    },
    {
      question: 'Vous intervenez dans ma commune ?',
      answer: 'Le site cite Lyon, Meyzieu, Genas',
    },
    {
      question: 'Vous venez à Villeurbanne ?',
      answer: 'Cette liste ne garantit pas la prise en charge',
    },
    {
      question: 'Vous faites les portes blindées et la vitrerie ?',
      answer: 'Les prestations présentées sont le dépannage d’urgence',
    },
    {
      question: 'Faites-vous les ouvertures de porte ?',
      answer: 'Les prestations présentées sont le dépannage d’urgence',
    },
    {
      question: 'Comment puis-je vous contacter ?',
      answer: 'Vous pouvez appeler le serrurier ou lui écrire sur WhatsApp',
    },
    {
      question: 'Bonjour',
      answer: 'Je peux vous renseigner sur les dépannages',
    },
    {
      question: 'Merci beaucoup',
      answer: 'Avec plaisir',
    },
    {
      question: 'Pouvez-vous garantir une ouverture sans dégât et un délai de 10 minutes ?',
      answer: 'Le délai dépend de votre commune',
    },
    {
      question: '<img src=x onerror=alert(1)>',
      answer: 'Je n’ai pas trouvé de réponse fiable',
    },
  ];

  for (const { question, answer } of cases) {
    await input.fill(question);
    await input.press('Enter');
    await expect(page.locator('.faq-assistant-message--user').last()).toHaveText(question);
    await expect(page.locator('.faq-assistant-message--bot').last()).toContainText(answer);
  }

  await expect(page.locator('#faq-assistant-messages img')).toHaveCount(0);
  await expect(page.locator('.faq-assistant-message')).toHaveCount(1 + cases.length * 2);
});

test('FAQ assistant suggestions, close button, and mobile positioning work', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 });
  await page.addInitScript(() => localStorage.removeItem('analytics-consent'));
  await page.goto('/');
  await expect(page.locator('#analytics-consent')).toBeVisible();
  await page.getByRole('button', { name: 'Continuer sans accepter' }).click();

  const toggle = page.getByRole('button', { name: 'Poser une question à l’assistant serrurerie' });
  const panel = page.getByRole('dialog', { name: 'Assistant serrurerie' });
  await toggle.click();

  for (const [label, answer] of [
    ['Porte claquée', 'Évitez de forcer la porte ou la serrure'],
    ['Ma commune', 'Le site cite Lyon, Meyzieu, Genas'],
    ['Disponibilité', 'Le service est annoncé 24h/24 et 7j/7'],
    ['Vos services', 'Les prestations présentées sont le dépannage d’urgence'],
  ]) {
    await page.getByRole('button', { name: label }).click();
    await expect(page.locator('.faq-assistant-message--bot').last()).toContainText(answer);
  }

  await expect(panel).toBeInViewport();
  await expect(toggle).toBeInViewport();
  await page.getByRole('button', { name: 'Fermer l’assistant' }).click();
  await expect(panel).toBeHidden();
  await expect(toggle).toHaveAttribute('aria-expanded', 'false');
});
