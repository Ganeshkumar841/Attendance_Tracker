# QA test runner

This repository has no root `package.json` or existing build/test scripts. The QA suite uses Playwright Test and axe-core as developer-only tools under `qa/`; it does not change application source.

## Install and run

From the repository root:

```bash
cd qa && npm install --save-dev @playwright/test @axe-core/playwright && npx playwright install chromium firefox webkit
npx playwright test
```

To test the deployed site or a local server, set `BASE_URL` (defaults to the supplied Vercel URL):

```bash
BASE_URL=https://attendxtracker.vercel.app npx playwright test
```

Do not run mutating authentication/event workflows against production. The starter suite only performs normal page loads and browser-side layout/accessibility checks. It does not submit login or event forms.

## Coverage and limitations

- Main shell/login screen appears after scripts load.
- Responsive viewport overflow checks at 320, 375, 414, 768, 1024, 1280, 1440, and 1920 CSS px.
- Basic axe scan of the initial screen.
- A small route smoke check for SPA fallback.

The repository currently has no dependency manifest, local server command, test account fixture, or defined auth test endpoint. Add isolated test data and approved staging credentials before covering account, coordinator, student, event, attendance, realtime, and email transactions. Test Firefox/WebKit execution may require platform libraries; Playwright will report environment setup errors distinctly.
