import { cp, mkdir, rm } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');

await mkdir(publicDir, { recursive: true });
await rm(resolve(publicDir, 'style.css'), { force: true });
await rm(resolve(publicDir, 'vendor/tailwind-browser.js'), { force: true });

for (const file of [
  'main.js',
  'robots.txt',
  'sitemap.xml',
  'llms.txt',
  'CNAME',
  '.nojekyll',
]) {
  await cp(resolve(root, file), resolve(publicDir, file));
}

await cp(resolve(root, 'assets'), resolve(publicDir, 'assets'), { recursive: true });
const vendorDir = resolve(publicDir, 'vendor');
await mkdir(vendorDir, { recursive: true });
for (const file of ['alpine.min.js', 'lenis.css', 'lenis.min.js']) {
  await cp(resolve(root, 'vendor', file), resolve(vendorDir, file));
}
