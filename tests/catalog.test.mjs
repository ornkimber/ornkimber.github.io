import test from 'node:test';
import assert from 'node:assert/strict';
import { loadPublicProjects, selectProjects, renderCards, safeWebsite } from '../src/catalog.mjs';

const config = { owner: 'example', topic: 'toolbox-listed', exclude: ['example.github.io'] };
const repo = (name, changes = {}) => ({ name, owner: { login: 'example' }, private: false, visibility: 'public', archived: false, disabled: false, fork: false, topics: ['toolbox-listed'], ...changes });

test('only explicitly opted-in, public, active, owned source repositories are listed', () => {
  const result = selectProjects([
    repo('useful'), repo('private', { private: true, visibility: 'private' }),
    repo('archived', { archived: true }), repo('fork', { fork: true }),
    repo('disabled', { disabled: true }), repo('unlisted', { topics: [] }),
    repo('other-owner', { owner: { login: 'somebody-else' } }), repo('example.github.io'),
    repo('incomplete', { visibility: undefined }), repo('useful'), null
  ], config);
  assert.deepEqual(result.map(project => project.name), ['useful']);
});

test('new tools need only the topic and About fields; profile data is discarded', () => {
  const result = selectProjects([repo('new-tool', { description: 'One useful thing.', homepage: 'https://example.com/tool', owner: { login: 'example', name: 'Never publish', email: 'private@example.invalid' }, language: 'Rust', stargazers_count: 987 })], config);
  assert.equal(result[0].description, 'One useful thing.');
  assert.equal(result[0].website, 'https://example.com/tool');
  assert.equal(result[0].url, 'https://github.com/example/new-tool');
  assert.doesNotMatch(JSON.stringify(result), /Never publish|private@example|stargazers|language/);
});

test('pagination includes marked projects beyond the first 100 repositories', async () => {
  const requests = [];
  const fetcher = async (url, options) => {
    requests.push({ url, options });
    return { ok: true, json: async () => url.searchParams.get('page') === '1' ? Array.from({ length: 100 }, (_, i) => repo(`unlisted-${i}`, { topics: [] })) : [repo('page-two')] };
  };
  assert.equal((await loadPublicProjects(config, { fetcher }))[0].name, 'page-two');
  assert.equal(requests.length, 2);
  assert.equal(requests[0].url.pathname, '/users/example/repos');
  assert.equal(requests[0].options.credentials, 'omit');
  assert.equal(requests[0].options.headers.Authorization, undefined);
});

test('partial pages, malformed responses, and rate limits fail instead of replacing the catalog', async () => {
  await assert.rejects(loadPublicProjects(config, { fetcher: async () => ({ ok: false, status: 403 }) }), /HTTP 403/);
  await assert.rejects(loadPublicProjects(config, { fetcher: async () => ({ ok: true, json: async () => ({ error: 'bad' }) }) }), /invalid repository list/);
  let calls = 0;
  await assert.rejects(loadPublicProjects(config, { fetcher: async () => ++calls === 1 ? { ok: true, json: async () => Array.from({ length: 100 }, (_, i) => repo(`tool-${i}`)) } : { ok: false, status: 503 } }), /HTTP 503/);
});

test('a successful empty catalog removes all listings', async () => {
  assert.deepEqual(await loadPublicProjects(config, { fetcher: async () => ({ ok: true, json: async () => [] }) }), []);
  assert.match(renderCards([]), /Nothing on this shelf/);
});

test('GitHub text is escaped and links cannot run scripts', () => {
  const projects = selectProjects([repo('safe-name', { html_url: 'javascript:alert(1)', description: '<img src=x onerror=alert(1)>', homepage: 'javascript:alert(1)' })], config);
  const html = renderCards(projects);
  assert.ok(html.includes('&lt;img'));
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('href="javascript:'));
  assert.equal(projects[0].website, null);
  assert.equal(safeWebsite('https://name:secret@example.com'), null);
  assert.equal(safeWebsite('http://example.com'), null);
});

test('curated initial metadata never opts in a repository by itself', () => {
  const overrides = { ...config, projects: { hidden: { title: 'Hidden tool', order: 1 }, visible: { title: 'Visible tool', order: 2 } } };
  const result = selectProjects([repo('hidden', { topics: [] }), repo('visible')], overrides);
  assert.deepEqual(result.map(project => project.title), ['Visible tool']);
  assert.deepEqual(selectProjects([repo('visible', { private: true })], overrides), []);
});
