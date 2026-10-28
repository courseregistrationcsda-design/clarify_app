# Clarify

Clarify is a browser-based meeting workspace built with HTML, CSS, and vanilla JavaScript.

## Run locally

Serve the repository over HTTP (rather than opening `index.html` directly):

```sh
python3 -m http.server 4173 --bind 0.0.0.0
```

Open the served page and choose **Open local workspace**, or join using a shared meeting link. The static server serves the frontend only; the Vercel functions in `api/` require a Vercel environment to run.

## Storage and access

Meetings are stored in the current browser's local storage. There is no account authentication or working password recovery backend in this prototype; local access is not password-protected. A browser that blocks storage can still open a temporary workspace, but its meetings will be lost when the page closes.

Shared links require a live PeerJS connection and the host to keep the meeting open. Sharing is experimental and not access-controlled: a viewer can change their link to edit, so share only with trusted people and do not share sensitive information. The prototype in-memory HTTP relay is not used for syncing.

## Tests

With Node.js 20+ and Python 3 installed:

```sh
npm ci
npx playwright install chromium
npm test
```

The browser tests cover startup, local storage, meeting creation, and shared-link recovery. They mock external services rather than testing a live Vercel deployment or PeerJS server.
