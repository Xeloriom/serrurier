import { cp, mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = process.cwd();
const publicDir = resolve(root, 'public');

await mkdir(publicDir, { recursive: true });

for (const file of [
  'main.js',
  'style.css',
  'robots.txt',
  'sitemap.xml',
  'llms.txt',
  'CNAME',
  '.nojekyll',
]) {
  await cp(resolve(root, file), resolve(publicDir, file));
}

for (const directory of ['assets', 'vendor']) {
  await cp(resolve(root, directory), resolve(publicDir, directory), { recursive: true });
}
