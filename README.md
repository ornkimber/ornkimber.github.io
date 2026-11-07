# Small Tools

A quiet directory of useful software. No biography, résumé, contact details, skill badges, or contributor profiles. Hosted at **https://ornkimber.github.io/** using GitHub Pages.

## Put another tool on the page

1. Finish cleaning the project's repository and make it public when it is ready.
2. On its GitHub page, open the gear beside **About**.
3. Add the topic **`toolbox-listed`**. Write a short, public-safe **Description** of what the tool does. Optionally set **Website** to its HTTPS app or documentation URL.
4. Save. The next successful live page load includes the tool. No homepage source edit or deployment is needed.

Remove that topic to take a tool off the live listing. Private, archived, disabled, forked, and other owners' repositories are always excluded. The directory's own repository is excluded too. The page is deliberately opt-in: public visibility alone is insufficient.

Only Resume Studio and LANnihilator are initially selected. Their display names, editorial descriptions, platforms and illustrations live in `site.config.json`. Those overrides do **not** opt them in. New repositories use their name, About description, and optional Website automatically, with a generic illustration. Optional visual/category overrides can be added later; they are never required to list a tool.

Keep About descriptions and Website links free of personal details. This site does not fetch account profiles, avatars, READMEs, authors, commit history, email addresses, or private repository lists. The GitHub handle necessarily appears in the hosting address and project URLs. No analytics, external fonts, cookies, visitor accounts, or embedded trackers are added.

## How automatic updates work

- A complete static page is generated with a saved catalog. It works with JavaScript disabled.
- Each page load requests public repository metadata from `api.github.com/users/ornkimber/repos`, checks the marker and visibility, and replaces the cards after all pages of results load successfully.
- A newly empty listing is respected. An incomplete response, network failure, timeout or rate limit keeps the saved catalog visible and labels it as such. There are no tokens in the browser, local storage, or cookies. Visitors' browsers contact GitHub's API directly, so GitHub receives those requests.
- GitHub Actions refreshes the saved catalog daily at **03:23 UTC**, and on pushes or a manual run. API failure fails the build and preserves the previous deployment.
- Browser API calls are unauthenticated and subject to GitHub's shared-IP rate limits. The saved catalog is the fallback, not a guarantee of instant removal: it may still show a previously listed project until a successful deployment replaces it. After removing a sensitive listing, manually run **Pages → Run workflow** to refresh the fallback too. Already published Git history is not erased by changing visibility or removing a topic.
- GitHub can delay scheduled jobs and disables scheduled workflows in public repositories after 60 days without repository activity. Live browser discovery continues independently; re-enable the workflow in Actions when necessary to refresh the saved copy. There is no automatic keepalive commit or personal access token.

## Local development

Node **24 LTS** is recommended; Node 22.16+ works. The site and its build use only built-in Node APIs. Playwright is a development-only browser-testing dependency.

```powershell
cd small-tools
npm run dev
```

Open **http://127.0.0.1:4173/**. Edit `src/` and refresh the browser. No install is needed just to preview or build the saved version. To refresh repository data first:

```powershell
npm run sync
npm run build
```

For tests:

```powershell
npm ci
npm test
npx playwright install chromium
npm run test:ui
```

The catalog tests cover opt-in/visibility boundaries, pagination, failure handling, escaping, and metadata minimization. Browser tests cover live updates, filters, removals, fallback, no-JavaScript use, and desktop/tablet/mobile widths. Browser screenshots and traces stay in ignored local directories.

## GitHub Pages deployment

The repository is named `ornkimber.github.io`, so it uses the default account Pages address; no custom domain or DNS configuration is involved. In **Settings → Pages → Build and deployment**, choose **GitHub Actions**.

`.github/workflows/pages.yml` tests pull requests, then refreshes, builds and deploys the site on main, the daily schedule, or a manual workflow run. Only the deploy job gets `pages: write` and `id-token: write`. Public catalog requests in the build use GitHub's short-lived built-in token; it never reaches `dist/`. No additional repository secrets are needed.

Source files are in `src/`, public display settings in `site.config.json`, and the checked-in fallback in `data/catalog.json`. The deploy job refreshes the catalog in its temporary checkout without making automatic source commits. Only `dist/` is published; build scripts, tests, repository metadata, and development dependencies are not uploaded to Pages.

References: [repository topics](https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/classifying-your-repository-with-topics), [Pages workflows](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages), [scheduled workflow behavior](https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows#schedule).
