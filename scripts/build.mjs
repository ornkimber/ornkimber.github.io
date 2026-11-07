import { mkdir, readFile, writeFile, copyFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { renderCards, validateConfig } from '../src/catalog.mjs';

export const root = fileURLToPath(new URL('../', import.meta.url));
export async function build() {
  const config = validateConfig(JSON.parse(await readFile(new URL('../site.config.json', import.meta.url), 'utf8')));
  const catalog = JSON.parse(await readFile(new URL('../data/catalog.json', import.meta.url), 'utf8'));
  if (catalog.owner !== config.owner || catalog.topic !== config.topic || !Array.isArray(catalog.projects)) throw new Error('Saved catalog does not match site.config.json. Run npm run sync.');
  let html = await readFile(new URL('../src/index.html', import.meta.url), 'utf8');
  html = html.replace('<!-- TOOL_CARDS -->', () => renderCards(catalog.projects))
    .replace('<!-- TOOL_COUNT -->', `${String(catalog.projects.length).padStart(2, '0')} ${catalog.projects.length === 1 ? 'tool' : 'tools'}`)
    .replace('<!-- SITE_CONFIG -->', () => JSON.stringify(config).replace(/</g, '\\u003c'));
  const output = new URL('../dist/', import.meta.url);
  await mkdir(output, { recursive: true });
  await writeFile(new URL('index.html', output), html);
  for (const file of ['styles.css', 'favicon.svg', 'app.mjs', 'catalog.mjs']) await copyFile(new URL(`../src/${file}`, import.meta.url), new URL(file, output));
  await copyFile(new URL('../data/catalog.json', import.meta.url), new URL('catalog.json', output));
  await writeFile(new URL('.nojekyll', output), '');
  console.log(`Built ${catalog.projects.length} tools into dist/.`);
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await build();
