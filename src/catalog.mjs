export function validateConfig(config) {
  if (!config || !/^[a-z\d](?:[a-z\d-]{0,37}[a-z\d])?$/i.test(config.owner ?? '') ||
      !/^[a-z\d][a-z\d-]{0,49}$/.test(config.topic ?? '')) {
    throw new Error('Set a valid GitHub owner and listing topic in site.config.json.');
  }
  return config;
}

const text = (value, limit) => typeof value === 'string' ? value.trim().slice(0, limit) : '';
const lower = (value) => typeof value === 'string' ? value.toLowerCase() : '';

export function safeWebsite(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}

export function selectProjects(repositories, config) {
  validateConfig(config);
  if (!Array.isArray(repositories)) throw new Error('GitHub returned an invalid repository list.');
  const seen = new Set();
  return repositories.filter(repo => {
    if (!repo || repo.private !== false || repo.visibility !== 'public' ||
        repo.archived !== false || repo.disabled !== false || repo.fork !== false ||
        lower(repo.owner?.login) !== lower(config.owner) ||
        !/^[a-z\d_.-]+$/i.test(repo.name ?? '') ||
        !Array.isArray(repo.topics) || !repo.topics.includes(config.topic) ||
        (config.exclude ?? []).some(name => lower(name) === lower(repo.name))) return false;
    const key = lower(repo.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map(repo => {
    const entry = Object.entries(config.projects ?? {}).find(([name]) => lower(name) === lower(repo.name));
    const meta = entry?.[1] ?? {};
    const category = ['Documents', 'Utilities', 'Other'].includes(meta.category) ? meta.category : 'Other';
    return {
      name: repo.name,
      title: text(meta.title, 80) || repo.name.replace(/[-_]/g, ' '),
      description: text(meta.description, 300) || text(repo.description, 300) || 'Explore this tool and its getting-started guide on GitHub.',
      category,
      platform: text(meta.platform, 40),
      visual: ['document', 'switch'].includes(meta.visual) ? meta.visual : 'tool',
      detail: text(meta.detail, 100),
      order: Number.isFinite(meta.order) ? meta.order : 100,
      url: `https://github.com/${encodeURIComponent(config.owner)}/${encodeURIComponent(repo.name)}`,
      website: safeWebsite(repo.homepage)
    };
  }).sort((a, b) => a.order - b.order || a.title.localeCompare(b.title));
}

// Shared by the browser and the build. Read public repositories only; never /user/repos.
export async function loadPublicProjects(config, { fetcher = fetch, token, signal } = {}) {
  validateConfig(config);
  const repositories = [];
  for (let page = 1; page <= 20; page++) {
    const url = new URL(`https://api.github.com/users/${encodeURIComponent(config.owner)}/repos`);
    url.search = new URLSearchParams({ type: 'owner', sort: 'full_name', per_page: '100', page: String(page) });
    const headers = { Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2026-03-10' };
    if (token) headers.Authorization = `Bearer ${token}`;
    const response = await fetcher(url, { headers, signal, credentials: 'omit' });
    if (!response.ok) throw new Error(`GitHub catalog request failed (HTTP ${response.status}).`);
    const batch = await response.json();
    if (!Array.isArray(batch)) throw new Error('GitHub returned an invalid repository list.');
    repositories.push(...batch);
    if (batch.length < 100) return selectProjects(repositories, config);
  }
  throw new Error('Repository pagination exceeded 2,000 entries; the catalog was not changed.');
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[char]));
}

const arrow = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

function illustration(project) {
  if (project.visual === 'document') return `<div class="paper-back"></div><div class="paper"><div class="paper-mark"></div><div class="paper-title"></div><div class="paper-subtitle"></div><div class="paper-rule"></div><div class="paper-heading"></div><div class="paper-line"></div><div class="paper-line short"></div><div class="paper-heading second"></div><div class="paper-line"></div><div class="paper-line short"></div></div><div class="file-tag"><span class="file-dot"></span> .docx</div><span class="visual-note">A little more put-together.</span>`;
  if (project.visual === 'switch') return `<div class="switch-unit"><div class="switch-top"><span>ETHERNET</span><span class="switch-lamp"></span></div><div class="switch-cover"><div class="power-button"><svg viewBox="0 0 40 40" fill="none"><path d="M20 6v14m-9-8a14 14 0 1 0 18 0" stroke="currentColor" stroke-width="3" stroke-linecap="round"/></svg></div></div><div class="switch-bottom"><span>LINK CONTROL</span><i></i><i></i></div></div><span class="visual-note">Sometimes, you just need a switch.</span>`;
  return `<div class="generic-tool"><svg viewBox="0 0 80 80" fill="none"><rect x="15" y="29" width="50" height="34" rx="8" stroke="currentColor" stroke-width="2"/><path d="M29 29v-7a5 5 0 0 1 5-5h12a5 5 0 0 1 5 5v7M15 43h50M35 39v8h10v-8" stroke="currentColor" stroke-width="2"/></svg></div><span class="visual-note">One more useful thing.</span>`;
}

export function renderCards(projects) {
  if (!projects.length) return '<div class="empty-state"><h3>Nothing on this shelf just yet.</h3><p>Check back for something useful.</p></div>';
  return projects.map((project, index) => `<article class="tool-card" data-category="${escapeHtml(project.category)}" data-name="${escapeHtml(project.name)}">
    <div class="tool-visual visual-${escapeHtml(project.visual)}" aria-hidden="true"><span class="tool-index">${String(index + 1).padStart(2, '0')}</span>${illustration(project)}</div>
    <div class="tool-content"><div class="tool-meta"><span>${escapeHtml(project.category)}</span>${project.platform ? `<span>${escapeHtml(project.platform)}</span>` : ''}</div>
    <h3>${escapeHtml(project.title)}</h3><p class="tool-description">${escapeHtml(project.description)}</p>
    ${project.detail ? `<p class="tool-detail">${escapeHtml(project.detail)}</p>` : ''}
    <div class="tool-links"><a class="project-link" href="${escapeHtml(project.url)}" aria-label="Explore ${escapeHtml(project.title)} on GitHub">Explore the tool ${arrow}</a>${project.website ? `<a class="website-link" href="${escapeHtml(project.website)}">Visit website <span aria-hidden="true">↗</span></a>` : '<span class="source-label">On GitHub</span>'}</div></div>
  </article>`).join('\n');
}
