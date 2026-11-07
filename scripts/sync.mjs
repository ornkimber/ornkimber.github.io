import { mkdir, readFile, writeFile, rename } from 'node:fs/promises';
import { loadPublicProjects } from '../src/catalog.mjs';

try {
  const config = JSON.parse(await readFile(new URL('../site.config.json', import.meta.url), 'utf8'));
  const projects = await loadPublicProjects(config, { token: process.env.GITHUB_TOKEN, signal: AbortSignal.timeout(30000) });
  const catalog = { owner: config.owner, topic: config.topic, generatedAt: new Date().toISOString(), projects };
  await mkdir(new URL('../data/', import.meta.url), { recursive: true });
  const target = new URL('../data/catalog.json', import.meta.url);
  const temp = new URL('../data/catalog.json.tmp', import.meta.url);
  await writeFile(temp, `${JSON.stringify(catalog, null, 2)}\n`);
  await rename(temp, target);
  console.log(`Saved ${projects.length} public, opted-in tools. No profile or contributor data was collected.`);
} catch (error) {
  console.error(`Catalog refresh failed: ${error.message} The existing catalog was kept.`);
  process.exitCode = 1;
}
