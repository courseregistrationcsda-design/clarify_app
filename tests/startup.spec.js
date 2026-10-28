const { test, expect } = require('@playwright/test');

const ownedMeeting = {
  id: 'owned-123',
  title: 'Existing meeting',
  date: '2026-10-28',
  status: 'ongoing',
  items: [{ id: 'topic-1', title: 'Existing topic', notes: 'Keep these notes' }],
  tasks: [],
  activeId: 'topic-1',
};

function trackErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  return errors;
}

test.beforeEach(async ({ page }) => {
  // The workspace must boot even if optional fonts and PeerJS are unavailable.
  await page.route('https://**/*', route => route.abort());
});

test('a new user can enter, create a meeting, and find it after reloading', async ({ page }) => {
  const errors = trackErrors(page);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#authScreen')).toBeVisible();
  await expect(page.locator('#startupError')).toBeHidden();
  await page.getByRole('button', { name: 'Open local workspace' }).click();

  await expect(page.locator('#introSplash')).toBeHidden();
  await expect(page.locator('#homeHeading')).toHaveText('Welcome to Clarify');
  await page.locator('#openNewMeeting').click();
  await page.locator('#meetingTitleInput').fill('Startup regression');
  await page.locator('#createMeetingBtn').click();
  await expect(page.locator('#meetingTitleDisplay')).toHaveText('Startup regression');

  await page.locator('#newItemInput').fill('Agenda topic');
  await page.locator('#newItemInput').press('Enter');
  await expect(page.locator('.agenda-item')).toHaveCount(1);
  await page.locator('#workPanel [data-close]').click();
  await page.locator('#notesPreview').click();
  await page.locator('#notesArea').fill('Saved notes');
  await page.locator('#workPanel [data-close]').click();
  await page.locator('#backHome').click();
  await expect(page.locator('.meeting-row')).toHaveCount(1);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Skip intro' }).click();
  await expect(page.locator('#introSplash')).toBeHidden();
  await expect(page.locator('.meeting-row')).toContainText('Startup regression');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('facilitate.v4')));
  expect(stored.meetings[0].items[0].notes).toBe('Saved notes');

  await page.locator('#homeSearchBtn').click();
  await page.locator('#searchInput').fill('Saved notes');
  await expect(page.locator('.search-result-item')).toContainText('Startup regression');
  await page.keyboard.press('Escape');
  await page.locator('[data-tab="teams"]').click();
  await expect(page.locator('#viewTeams')).toBeVisible();
  await expect(page.locator('#openNewMeeting')).toBeHidden();
  await page.locator('[data-tab="meetings"]').click();
  await expect(page.locator('#openNewMeeting')).toBeVisible();
  expect(errors).toEqual([]);
});

test('returning users automatically leave the intro and keep their saved meetings', async ({ page }) => {
  const errors = trackErrors(page);
  await page.addInitScript(meeting => {
    localStorage.setItem('clarify_user', 'existing@example.com');
    localStorage.setItem('facilitate.v4', JSON.stringify({ meetings: [meeting], teams: [], theme: 'light' }));
  }, ownedMeeting);
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#introSplash')).toBeVisible();
  await expect(page.locator('#introSplash')).toBeHidden({ timeout: 5000 });
  await expect(page.locator('.meeting-row')).toContainText('Existing meeting');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('facilitate.v4')));
  expect(stored.meetings[0].items[0].notes).toBe('Keep these notes');
  expect(errors).toEqual([]);
});

for (const hasSession of [false, true]) {
  test(`a locally owned meeting link opens ${hasSession ? 'with' : 'without'} an existing local session`, async ({ page }) => {
    const errors = trackErrors(page);
    await page.addInitScript(({ meeting, signedIn }) => {
      localStorage.setItem('facilitate.v4', JSON.stringify({ meetings: [meeting], teams: [], theme: 'light' }));
      if (signedIn) localStorage.setItem('clarify_user', 'existing@example.com');
    }, { meeting: ownedMeeting, signedIn: hasSession });
    await page.goto('/?id=owned-123&role=editor', { waitUntil: 'domcontentloaded' });
    if (!hasSession) {
      await expect(page.locator('#authScreen')).toBeVisible();
      await page.getByRole('button', { name: 'Open local workspace' }).click();
    }
    await expect(page.locator('#meetingTitleDisplay')).toHaveText('Existing meeting');
    await expect(page.locator('#focusInner')).toContainText('Existing topic');
    await expect(page.locator('#introSplash')).toBeHidden();
    expect(errors).toEqual([]);
  });
}

test('a stalled optional PeerJS download does not block startup', async ({ page }) => {
  const errors = trackErrors(page);
  let release;
  let notifyRequested;
  const held = new Promise(resolve => { release = resolve; });
  const requested = new Promise(resolve => { notifyRequested = resolve; });
  await page.route('**/peerjs.min.js', async route => {
    notifyRequested();
    await held;
    await route.abort().catch(() => {});
  });
  try {
    await page.goto('/', { waitUntil: 'domcontentloaded', timeout: 3000 });
    await requested;
    await expect(page.getByRole('button', { name: 'Open local workspace' })).toBeVisible({ timeout: 2000 });
    await page.getByRole('button', { name: 'Open local workspace' }).click();
    await expect(page.locator('#openNewMeeting')).toBeVisible();
    expect(errors).toEqual([]);
  } finally {
    release();
  }
});

test('startup assets work when the app is served at a nested route', async ({ page }) => {
  const errors = trackErrors(page);
  // Simulate the SPA rewrite used in production, retaining the nested URL.
  await page.route('**/nested/', route => route.fulfill({ path: 'index.html', contentType: 'text/html' }));
  await page.goto('/nested/', { waitUntil: 'domcontentloaded' });
  await expect(page.getByRole('button', { name: 'Open local workspace' })).toBeVisible();
  await page.getByRole('button', { name: 'Open local workspace' }).click();
  await expect(page.locator('#openNewMeeting')).toBeVisible();
  expect(errors).toEqual([]);
});

test('blocked browser storage warns the user but still permits a temporary workspace', async ({ page }) => {
  const errors = trackErrors(page);
  await page.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      get() { throw new DOMException('Blocked', 'SecurityError'); },
    });
  });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Open local workspace' }).click();
  await expect(page.locator('#authToastText')).toContainText('Browser storage is unavailable');
  await page.locator('#openNewMeeting').click();
  await page.locator('#meetingTitleInput').fill('Temporary meeting');
  await page.locator('#createMeetingBtn').click();
  await expect(page.locator('#meetingTitleDisplay')).toHaveText('Temporary meeting');
  expect(errors).toEqual([]);
});

test('a missing main script shows a retry screen instead of an endless splash', async ({ page }) => {
  let attempts = 0;
  await page.route('**/js/app.js*', route => ++attempts === 1 ? route.abort() : route.continue());
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#startupError')).toBeVisible();
  await expect(page.locator('#startupError')).toContainText('saved meetings will not be removed');
  await page.getByRole('button', { name: 'Reload Clarify' }).click();
  await expect(page.locator('#authScreen')).toBeVisible();
  await expect(page.locator('#startupError')).toBeHidden();
  expect(attempts).toBeGreaterThanOrEqual(2);
});

test('the startup watchdog reports a script parse failure', async ({ page }) => {
  const errors = trackErrors(page);
  await page.addInitScript(() => {
    const realSetTimeout = window.setTimeout.bind(window);
    window.setTimeout = (fn, delay, ...args) => realSetTimeout(fn, delay === 8000 ? 50 : delay, ...args);
  });
  await page.route('**/js/app.js*', route => route.fulfill({ status: 200, contentType: 'text/javascript', body: 'const = invalid;' }));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#startupError')).toBeVisible();
  expect(errors.some(error => /Unexpected token/.test(error))).toBe(true);
});

test.describe('when JavaScript is disabled', () => {
  test.use({ javaScriptEnabled: false });
  test('explains why the app cannot start', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    const notice = page.locator('noscript .startup-error');
    await expect(notice).toBeVisible();
    await expect(notice).toContainText('JavaScript is required');
  });
});
