import { expect, test } from '@playwright/test';

const paths = [
  '/',
  '/ouverture-porte/',
  '/serrure-porte-blindee/',
  '/volet-roulant/',
  '/vitrerie/',
  '/zone-intervention-serrurier/',
  '/prix-serrurier/',
];

test('all pages enforce CSP and block inline scripts', async ({ page }) => {
  for (const path of paths) {
    await page.goto(path);
    const policy = await page.locator('meta[http-equiv="Content-Security-Policy"]').getAttribute('content');

    expect(policy).toContain(
      "script-src 'self' https://unpkg.com/leaflet@1.9.4/dist/leaflet.js https://plausible.io/js/script.js",
    );
    expect(policy).not.toContain("'unsafe-eval'");
    await expect(page.locator('meta[name="referrer"]')).toHaveAttribute(
      'content',
      'strict-origin-when-cross-origin',
    );

    const unsafeExternalLinks = await page.locator('a[target="_blank"]').evaluateAll((links) => (
      links.filter((link) => !link.relList.contains('noopener')).map((link) => link.href)
    ));
    expect(unsafeExternalLinks).toEqual([]);
  }

  await page.goto('/');
  const inlineScriptExecuted = await page.evaluate(() => new Promise((resolve) => {
    document.addEventListener('securitypolicyviolation', (event) => {
      if (event.violatedDirective.startsWith('script-src')) resolve(false);
    }, { once: true });
    const script = document.createElement('script');
    script.textContent = 'window.__unexpectedInlineScript = true;';
    document.head.append(script);
    setTimeout(() => resolve(window.__unexpectedInlineScript === true), 250);
  }));
  expect(inlineScriptExecuted).toBe(false);
});
