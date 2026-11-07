import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';

const config = JSON.parse(await readFile(new URL('../../site.config.json', import.meta.url), 'utf8'));
const repo = (name, changes = {}) => ({ name, owner: { login: config.owner }, private: false, visibility: 'public', archived: false, disabled: false, fork: false, topics: [config.topic], ...changes });
const examples = [repo('resume-studio'), repo('LANnihilator')];
const respond = (page, body) => page.route('https://api.github.com/**', route => route.fulfill({ json: body, headers: { 'access-control-allow-origin': '*' } }));

test('live collection, filters, keyboard focus, and outgoing links', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await respond(page, examples);
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Collection up to date');
  await expect(page.locator('.tool-card:visible')).toHaveCount(2);
  await page.getByRole('button', { name: 'Documents', exact: true }).click();
  await expect(page.locator('.tool-card:visible')).toHaveCount(1);
  await expect(page.getByRole('heading', { name: 'Resume Studio' })).toBeVisible();
  await expect(page.locator('#tool-count')).toHaveText('01 tool');
  await page.getByRole('button', { name: 'All tools', exact: true }).click();
  await expect(page.locator('.tool-card:visible')).toHaveCount(2);
  await expect(page.getByRole('link', { name: 'Explore LANnihilator on GitHub' })).toHaveAttribute('href', 'https://github.com/ornkimber/LANnihilator');
  await page.getByRole('link', { name: 'Skip to the tools' }).focus();
  await expect(page.getByRole('link', { name: 'Skip to the tools' })).toBeInViewport();
  expect(errors).toEqual([]);
});

test('new marked public tools appear without a homepage edit; unsafe metadata stays text', async ({ page }) => {
  await respond(page, [...examples, repo('fresh-tool', { description: '<img src=x onerror=alert(1)>', homepage: 'javascript:alert(1)' }), repo('private-project', { private: true }), repo('archived-project', { archived: true }), repo('unlisted-project', { topics: [] })]);
  await page.goto('/');
  await expect(page.locator('.tool-card')).toHaveCount(3);
  await expect(page.getByRole('heading', { name: 'fresh tool' })).toBeVisible();
  await expect(page.getByText('<img src=x onerror=alert(1)>', { exact: true })).toBeVisible();
  await expect(page.locator('#tool-grid img')).toHaveCount(0);
  await expect(page.getByText('private-project')).toHaveCount(0);
  await page.getByRole('button', { name: 'Other', exact: true }).click();
  await expect(page.locator('.tool-card:visible')).toHaveCount(1);
});

test('successful removal of all markers clears the saved cards', async ({ page }) => {
  await respond(page, examples.map(item => ({ ...item, topics: [] })));
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Collection up to date');
  await expect(page.locator('.tool-card')).toHaveCount(0);
  await expect(page.getByText('Nothing on this shelf just yet.')).toBeVisible();
  await expect(page.locator('#filters')).toBeHidden();
});

test('GitHub outage keeps the saved collection useful', async ({ page }) => {
  await page.route('https://api.github.com/**', route => route.fulfill({ status: 503, json: { message: 'Unavailable' } }));
  await page.goto('/');
  await expect(page.getByRole('status')).toHaveText('Showing the saved collection');
  await expect(page.getByRole('heading', { name: 'Resume Studio' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Explore Resume Studio on GitHub' })).toBeVisible();
});

for (const width of [320, 390, 768, 1440]) {
  test(`layout fits a ${width}px viewport`, async ({ page }) => {
    await page.setViewportSize({ width, height: 950 });
    await respond(page, examples);
    await page.goto('/');
    await expect(page.getByRole('status')).toHaveText('Collection up to date');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.getByRole('link', { name: 'The idea' }).click();
    await expect(page.getByRole('heading', { name: 'Useful is enough.' })).toBeInViewport();
    await page.screenshot({ path: `.cache/preview-${width}.png`, fullPage: true });
  });
}

test('the saved tools and navigation work without JavaScript', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto('http://127.0.0.1:4173/');
  await expect(page.getByRole('heading', { name: 'Resume Studio' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Explore Resume Studio on GitHub' })).toHaveAttribute('href', 'https://github.com/ornkimber/resume-studio');
  await expect(page.locator('#filters')).toBeHidden();
  await context.close();
});
