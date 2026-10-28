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

const ownedMeeting = {
  id: 'owned-123', title: 'My private meeting', date: '2026-10-28', status: 'ongoing',
  items: [{ id: 'private-topic', title: 'Private topic', notes: 'Keep these notes' }],
  tasks: [], activeId: 'private-topic',
};

function trackErrors(page) {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  return errors;
}

async function installGuestPeer(page, meeting) {
  await page.addInitScript(initialMeeting => {
    window.sentPeerMessages = [];
    window.Peer = class {
      on(event, callback) {
        if (event === 'open') setTimeout(() => callback('guest'), 0);
        return this;
      }
      connect(id) {
        window.connectedPeerId = id;
        const handlers = {};
        window.emitPeerData = data => handlers.data?.(data);
        setTimeout(() => {
          handlers.open?.();
          handlers.data?.({ type: 'STATE_PAYLOAD', meeting: initialMeeting });
        }, 20);
        return {
          open: true,
          on(event, callback) { handlers[event] = callback; },
          send(message) { window.sentPeerMessages.push(message); },
        };
      }
      destroy() {}
    };
  }, meeting);
}

async function seedLocalWorkspace(page) {
  await page.addInitScript(meeting => {
    if (sessionStorage.getItem('seeded')) return;
    localStorage.setItem('clarify_user', 'local');
    localStorage.setItem('facilitate.v4', JSON.stringify({
      meetings: [meeting], teams: [{ id: 'team-1', name: 'Private team', members: [] }], theme: 'light',
    }));
    sessionStorage.setItem('seeded', 'yes');
  }, ownedMeeting);
}

test.beforeEach(async ({ page }) => {
  await page.route('https://**/*', route => route.abort());
});

test('guest links are validated and an offline host gets a way back home', async ({ page, baseURL }) => {
  const errors = trackErrors(page);
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

test('a bare meeting ID defaults to viewer display mode', async ({ page }) => {
  const errors = trackErrors(page);
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

test('a PeerJS snapshot dismisses the loader and viewer navigation sends no updates', async ({ page }) => {
  const errors = trackErrors(page);
  let relayRequests = 0;
  await page.route('**/api/sync**', route => {
    relayRequests++;
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(sharedMeeting) });
  });
  await installGuestPeer(page, sharedMeeting);
  await page.goto('/?id=shared-123&role=viewer', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#meetingTitleDisplay')).toHaveText('Shared meeting');
  await expect(page.locator('#focusInner')).toContainText('Shared agenda');
  await expect(page.locator('#syncLoader')).toHaveCount(0);
  await expect(page.locator('body')).toHaveClass(/role-viewer/);
  expect(await page.evaluate(() => window.connectedPeerId)).toBe('clarify-shared-123');
  expect(await page.evaluate(() => window.sentPeerMessages)).toContainEqual({ type: 'REQUEST_STATE', id: 'shared-123' });
  expect(await page.locator('#meetingTitleDisplay').evaluate(el => getComputedStyle(el).pointerEvents)).toBe('none');

  // Rendering and saving in viewer display mode must not send a write or use the HTTP relay.
  await page.evaluate(() => { saveImmediate(); save(); });
  expect((await page.evaluate(() => window.sentPeerMessages)).filter(message => message.type === 'UPDATE')).toEqual([]);
  expect(relayRequests).toBe(0);
  expect(errors).toEqual([]);
});

test('shared updates preserve private data and cached guests cannot become owned meetings', async ({ page }) => {
  const errors = trackErrors(page);
  await seedLocalWorkspace(page);
  await installGuestPeer(page, sharedMeeting);
  await page.goto('/?id=shared-123&role=editor', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#meetingTitleDisplay')).toHaveText('Shared meeting');

  // An old client might send its entire state. Only the currently shared meeting is accepted.
  await page.evaluate(meeting => window.emitPeerData({
    type: 'UPDATE',
    state: {
      meetings: [{ ...meeting, title: 'Newer shared state', lastUpdated: 3 }, { id: 'unrelated', title: 'Injected' }],
      teams: [], currentId: 'unrelated', theme: 'dark',
    },
  }), sharedMeeting);
  await expect(page.locator('#meetingTitleDisplay')).toHaveText('Newer shared state');
  let stored = await page.evaluate(() => JSON.parse(localStorage.getItem('facilitate.v4')));
  expect(stored.currentId).toBe('shared-123');
  expect(stored.teams[0].name).toBe('Private team');
  expect(stored.meetings.map(meeting => meeting.id).sort()).toEqual(['owned-123', 'shared-123']);
  expect(stored.meetings.find(meeting => meeting.id === 'owned-123').items[0].notes).toBe('Keep these notes');

  // A delayed older snapshot does not replace a more recent one.
  await page.evaluate(meeting => window.emitPeerData({ type: 'STATE_PAYLOAD', meeting }), sharedMeeting);
  await expect(page.locator('#meetingTitleDisplay')).toHaveText('Newer shared state');

  // Editors send only the shared meeting, not their unrelated meetings or teams.
  await page.locator('#meetingTitleDisplay').fill('Edited shared state');
  const messages = await page.evaluate(() => window.sentPeerMessages.filter(message => message.type === 'UPDATE'));
  expect(messages.length).toBeGreaterThan(0);
  expect(messages.at(-1).state.meetings.map(meeting => meeting.id)).toEqual(['shared-123']);
  expect(messages.at(-1).state.teams).toBeUndefined();

  await page.locator('#backHome').click();
  await page.getByRole('button', { name: 'Skip intro' }).click();
  await expect(page.locator('.meeting-row')).toHaveCount(1);
  await expect(page.locator('.meeting-row')).toContainText('My private meeting');
  await page.locator('#homeSearchBtn').click();
  await page.locator('#searchInput').fill('Edited shared state');
  await expect(page.locator('.search-result-item')).toHaveCount(0);
  await page.keyboard.press('Escape');
  await page.evaluate(() => openMeeting('shared-123'));
  await expect(page.locator('#homeScreen')).not.toHaveClass(/hidden/);
  stored = await page.evaluate(() => JSON.parse(localStorage.getItem('facilitate.v4')));
  expect(stored.meetings.find(meeting => meeting.id === 'owned-123').items[0].notes).toBe('Keep these notes');
  expect(errors).toEqual([]);
});

test('untrusted shared task fields cannot inject markup or executable links', async ({ page }) => {
  const errors = trackErrors(page);
  const evilTopicId = 'topic" onmouseover="window.injected=1';
  const evilTaskId = 'task" onmouseover="window.injected=2';
  const unsafe = {
    ...sharedMeeting,
    items: [{ id: evilTopicId, title: 'Safe topic', notes: '', limitMin: '<img src=x onerror="window.injected=3">' }],
    activeId: evilTopicId,
    tasks: [{
      id: evilTaskId, itemId: evilTopicId, name: 'Safe task',
      status: '<img src=x onerror="window.injected=4">', notes: '',
      links: [{ id: 'link" onmouseover="window.injected=5', label: 'Unsafe link', url: 'javascript:window.injected=6' }],
    }],
    expandedTasks: { [evilTaskId]: true },
  };
  await installGuestPeer(page, unsafe);
  await page.goto('/?id=shared-123&role=editor', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#focusInner')).toContainText('Safe topic');
  await page.locator('#notesPreview').click();
  await expect(page.locator('.action-name')).toHaveText('Safe task');
  await expect(page.locator('.status-pill')).toHaveText('ongoing');
  await expect(page.locator('.link-text')).toHaveAttribute('href', '');
  await expect(page.locator('#agendaList img, #actionListLocal img')).toHaveCount(0);
  expect(await page.evaluate(() => window.injected)).toBeUndefined();
  expect(errors).toEqual([]);
});

test('a slow PeerJS script can connect after the initial waiting screen', async ({ page }) => {
  const errors = trackErrors(page);
  await page.clock.install();
  await page.addInitScript(meeting => {
    window.installLatePeer = () => {
      window.Peer = class {
        on(event, callback) { if (event === 'open') setTimeout(callback, 0); return this; }
        connect() {
          const handlers = {};
          setTimeout(() => handlers.data?.({ type: 'STATE_PAYLOAD', meeting }), 20);
          return { open: false, on(event, callback) { handlers[event] = callback; }, send() {} };
        }
        destroy() {}
      };
      document.getElementById('peerScript').dispatchEvent(new Event('load'));
    };
  }, sharedMeeting);
  await page.goto('/?id=shared-123&role=viewer', { waitUntil: 'domcontentloaded' });
  await page.clock.fastForward(8500);
  await expect(page.locator('#syncLoader')).toContainText('Waiting for host');
  await page.evaluate(() => window.installLatePeer());
  await page.clock.fastForward(100);
  await expect(page.locator('#meetingTitleDisplay')).toHaveText('Shared meeting');
  await expect(page.locator('#syncLoader')).toHaveCount(0);
  expect(errors).toEqual([]);
});

test('the host applies only the shared meeting and never broadcasts its private workspace', async ({ page }) => {
  const errors = trackErrors(page);
  const hostMeeting = { ...sharedMeeting, id: 'host-123', title: 'Hosted meeting' };
  await page.addInitScript(({ privateMeeting, meeting }) => {
    localStorage.setItem('clarify_user', 'local');
    localStorage.setItem('facilitate.v4', JSON.stringify({
      meetings: [privateMeeting, meeting], teams: [{ id: 'team-1', name: 'Private team', members: [] }], theme: 'light',
    }));
    window.hostMessages = [];
    window.Peer = class {
      constructor(id) { window.hostPeerId = id; }
      on(event, callback) { if (event === 'connection') window.acceptFakeConnection = callback; return this; }
      destroy() {}
    };
    window.connectFakeGuest = () => {
      const handlers = {};
      const connection = {
        open: true,
        on(event, callback) { handlers[event] = callback; },
        send(message) { window.hostMessages.push(message); },
      };
      window.acceptFakeConnection(connection);
      window.sendToHost = data => handlers.data?.(data);
    };
  }, { privateMeeting: ownedMeeting, meeting: hostMeeting });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Skip intro' }).click();
  await page.getByRole('button', { name: /Open meeting: Hosted meeting/ }).click();
  expect(await page.evaluate(() => window.hostPeerId)).toBe('clarify-host-123');
  await page.evaluate(() => window.connectFakeGuest());
  await page.evaluate(() => window.sendToHost({ type: 'REQUEST_STATE', id: 'wrong-id' }));
  expect(await page.evaluate(() => window.hostMessages)).toEqual([]);
  await page.evaluate(() => window.sendToHost({ type: 'REQUEST_STATE', id: 'host-123' }));
  expect((await page.evaluate(() => window.hostMessages))[0].meeting.id).toBe('host-123');

  await page.evaluate(meeting => window.sendToHost({
    type: 'UPDATE', state: {
      meetings: [{ ...meeting, title: 'Guest update', lastUpdated: 2 }, { id: 'unrelated', title: 'Injected' }],
      teams: [], currentId: 'unrelated',
    },
  }), hostMeeting);
  await expect(page.locator('#meetingTitleDisplay')).toHaveText('Guest update');
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('facilitate.v4')));
  expect(stored.currentId).toBe('host-123');
  expect(stored.teams[0].name).toBe('Private team');
  expect(stored.meetings.map(meeting => meeting.id).sort()).toEqual(['host-123', 'owned-123']);
  expect(stored.meetings.find(meeting => meeting.id === 'owned-123').items[0].notes).toBe('Keep these notes');
  await page.locator('#meetingTitleDisplay').fill('Host update');
  const update = (await page.evaluate(() => window.hostMessages)).find(message => message.type === 'UPDATE');
  expect(update.state.meetings.map(meeting => meeting.id)).toEqual(['host-123']);
  expect(update.state.teams).toBeUndefined();
  expect(errors).toEqual([]);
});

test('leaving a meeting cancels a pending late PeerJS setup', async ({ page }) => {
  const errors = trackErrors(page);
  await page.clock.install();
  await page.addInitScript(meeting => {
    localStorage.setItem('clarify_user', 'local');
    localStorage.setItem('facilitate.v4', JSON.stringify({ meetings: [meeting], teams: [], theme: 'light' }));
    window.peerStarts = 0;
    window.installLatePeer = () => {
      window.Peer = class { constructor() { window.peerStarts++; } on() { return this; } destroy() {} };
      document.getElementById('peerScript').dispatchEvent(new Event('load'));
    };
  }, { ...sharedMeeting, id: 'host-123', title: 'Hosted meeting' });
  await page.goto('/', { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Skip intro' }).click();
  await page.getByRole('button', { name: /Open meeting: Hosted meeting/ }).click();
  await page.clock.fastForward(8500);
  await page.locator('#backHome').click();
  await page.evaluate(() => window.installLatePeer());
  await page.clock.fastForward(100);
  expect(await page.evaluate(() => window.peerStarts)).toBe(0);
  await expect(page.locator('.meeting-row')).toContainText('Hosted meeting');
  expect(errors).toEqual([]);
});
