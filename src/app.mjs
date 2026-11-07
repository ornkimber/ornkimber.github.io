import { loadPublicProjects, renderCards } from './catalog.mjs';

const config = JSON.parse(document.querySelector('#site-config').textContent);
const grid = document.querySelector('#tool-grid');
const count = document.querySelector('#tool-count');
const status = document.querySelector('#collection-status');
const filters = document.querySelector('#filters');
const buttons = [...filters.querySelectorAll('button')];
let activeFilter = 'All';

function applyFilter() {
  const cards = [...grid.querySelectorAll('.tool-card')];
  for (const card of cards) card.hidden = activeFilter !== 'All' && card.dataset.category !== activeFilter;
  const shown = cards.filter(card => !card.hidden).length;
  count.textContent = `${String(shown).padStart(2, '0')} ${shown === 1 ? 'tool' : 'tools'}`;
  for (const button of buttons) button.setAttribute('aria-pressed', String(button.dataset.filter === activeFilter));
}

function updateFilters() {
  const categories = new Set([...grid.querySelectorAll('.tool-card')].map(card => card.dataset.category));
  if (activeFilter !== 'All' && !categories.has(activeFilter)) activeFilter = 'All';
  for (const button of buttons) button.hidden = button.dataset.filter !== 'All' && !categories.has(button.dataset.filter);
  filters.hidden = categories.size < 2;
  applyFilter();
}

for (const button of buttons) button.addEventListener('click', () => { activeFilter = button.dataset.filter; applyFilter(); });
updateFilters();

try {
  const projects = await loadPublicProjects(config, { signal: AbortSignal.timeout(10000) });
  // An empty, successful response is meaningful: removing the marker removes every card.
  grid.innerHTML = renderCards(projects);
  updateFilters();
  status.textContent = 'Collection up to date';
  status.dataset.state = 'live';
} catch {
  status.textContent = 'Showing the saved collection';
  status.dataset.state = 'saved';
}
