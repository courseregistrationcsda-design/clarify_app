const { test, expect } = require('@playwright/test');

const sharedMeeting = {
  id: 'shared-123',
  title: 'Shared meeting',
  date: '2026-10-28',
  status: 'ongoing',
  shareEnabled: true,
  lastUpdated: 1,
  items: [{ id: 'topic-1', title: 'Shared agenda', notes: 'Shared notes' }],
  tasks: [],
  activeId: 'topic-1',
};

function trackErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  return errors;
}

test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', route => route.abort());
});

test('guest links are validated and an offline host gets a way back home', async ({ page, baseURL }) => {
  const errors = trackErrors(page);
  await page.route('**/api/sync?**', route => route.fulfill({ status: 404, body: '{}' }));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Join a shared meeting' }).click();
  await page.getByRole('button', { name: 'Join Meeting', exact: true }).click();
  await expect(page.locator('#authToastText')).toHaveText('Please enter a valid shared meeting link or ID.');
  await page.locator('#guestLinkInput').fill('https://example.com/no-meeting');
  await page.getByRole('button', { name: 'Join Meeting', exact: true }).click();
  await expect(page.locator('#authToastText')).toHaveText('Please enter a valid shared meeting link or ID.');

  await page.locator('#guestLinkInput').fill('https://another-host.example/?id=guest-123&role=editor');
  await Promise.all([
    page.waitForURL('**/?id=guest-123&role=editor'),
    page.getByRole('button', { name: 'Join Meeting', exact: true }).click(),
  ]);
  expect(new URL(page.url()).origin).toBe(new URL(baseURL).origin);
  await expect(page.locator('#syncLoader')).toContainText('Waiting for host', { timeout: 10000 });
  await expect(page.locator('body')).not.toHaveClass(/role-viewer/);
  await page.getByRole('button', { name: 'Go to home' }).click();
  await expect(page.locator('#authScreen')).toBeVisible();
  expect(errors).toEqual([]);
});

test('a bare meeting ID defaults to read-only access', async ({ page }) => {
  const errors = trackErrors(page);
  await page.route('**/api/sync?**', route => route.fulfill({ status: 404, body: '{}' }));
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Join a shared meeting' }).click();
  await page.locator('#guestLinkInput').fill('some-meeting');
  await Promise.all([
    page.waitForURL('**/?id=some-meeting&role=viewer'),
    page.locator('#guestLinkInput').press('Enter'),
  ]);
  await expect(page.locator('body')).toHaveClass(/role-viewer/);
  await expect(page.locator('#syncLoader')).toBeVisible();
  expect(errors).toEqual([]);
});

test('the HTTP fallback loads a guest meeting and keeps the viewer role on reload', async ({ page }) => {
  const errors = trackErrors(page);
  let requests = 0;
  let writes = 0;
  await page.route('**/api/sync', route => {
    if (route.request().method() === 'POST') writes++;
    return route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.route('**/api/sync?**', route => {
    requests++;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sharedMeeting) });
  });
  await page.goto('/?id=shared-123&role=viewer', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#meetingTitleDisplay')).toHaveText('Shared meeting');
  await expect(page.locator('#focusInner')).toContainText('Shared agenda');
  await expect(page.locator('#syncLoader')).toHaveCount(0);
  await expect(page.locator('body')).toHaveClass(/role-viewer/);

  await page.reload({ waitUntil: 'domcontentloaded' });
  await expect(page.locator('#meetingTitleDisplay')).toHaveText('Shared meeting');
  await expect(page.locator('#focusInner')).toContainText('Shared agenda');
  await expect(page.locator('#syncLoader')).toHaveCount(0);
  await expect(page.locator('body')).toHaveClass(/role-viewer/);
  expect(requests).toBeGreaterThanOrEqual(2);
  expect(writes).toBe(0);

  await page.locator('#backHome').click();
  await expect(page.locator('#authScreen')).toBeVisible();
  await page.getByRole('button', { name: 'Open local workspace' }).click();
  await expect(page.locator('body')).not.toHaveClass(/role-viewer/);
  await expect(page.locator('#openNewMeeting')).toBeVisible();
  expect(writes).toBe(0);
  expect(errors).toEqual([]);
});

test('a PeerJS state payload also dismisses the guest loader', async ({ page }) => {
  const errors = trackErrors(page);
  await page.route('**/api/sync?**', route => route.fulfill({ status: 404, body: '{}' }));
  await page.addInitScript(meeting => {
    window.sentPeerMessages = [];
    window.Peer = class {
      on(event, callback) {
        if (event === 'open') setTimeout(() => callback('guest'), 0);
        return this;
      }
      connect(id) {
        window.connectedPeerId = id;
        const handlers = {};
        setTimeout(() => {
          handlers.open?.();
          handlers.data?.({ type: 'STATE_PAYLOAD', meeting });
        }, 20);
        return {
          open: true,
          on(event, callback) { handlers[event] = callback; },
          send(message) { window.sentPeerMessages.push(message); },
        };
      }
      destroy() {}
    };
  }, sharedMeeting);
  await page.goto('/?id=shared-123&role=viewer', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#meetingTitleDisplay')).toHaveText('Shared meeting');
  await expect(page.locator('#focusInner')).toContainText('Shared agenda');
  await expect(page.locator('#syncLoader')).toHaveCount(0);
  expect(await page.evaluate(() => window.connectedPeerId)).toBe('clarify-shared-123');
  expect(await page.evaluate(() => window.sentPeerMessages)).toContainEqual({ type: 'REQUEST_STATE', id: 'shared-123' });
  expect(errors).toEqual([]);
});

test('a delayed relay response cannot overwrite newer peer data during startup', async ({ page }) => {
  const errors = trackErrors(page);
  let releaseRelay;
  const heldRelay = new Promise(resolve => { releaseRelay = resolve; });
  await page.route('**/api/sync?**', async route => {
    await heldRelay;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sharedMeeting) }).catch(() => {});
  });
  await page.addInitScript(meeting => {
    window.Peer = class {
      on(event, callback) {
        if (event === 'open') setTimeout(callback, 0);
        return this;
      }
      connect() {
        const handlers = {};
        setTimeout(() => handlers.data?.({ type: 'STATE_PAYLOAD', meeting }), 20);
        return { open: false, on(event, callback) { handlers[event] = callback; }, send() {} };
      }
      destroy() {}
    };
  }, { ...sharedMeeting, title: 'Newer peer data', lastUpdated: 2 });

  try {
    await page.goto('/?id=shared-123&role=viewer', { waitUntil: 'domcontentloaded' });
    await expect(page.locator('#meetingTitleDisplay')).toHaveText('Newer peer data');
    releaseRelay();
    await expect.poll(() => page.evaluate(() => window.httpConnected)).toBe(true);
    await expect(page.locator('#meetingTitleDisplay')).toHaveText('Newer peer data');
    const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('facilitate.v4')));
    expect(stored.meetings[0].title).toBe('Newer peer data');
    expect(errors).toEqual([]);
  } finally {
    releaseRelay();
  }
});
