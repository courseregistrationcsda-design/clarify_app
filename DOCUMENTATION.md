# 📘 Clarify App: Official Documentation & Blueprint

## 1. Product Vision & Philosophy
**Clarify** is a next-generation, serverless AI meeting workspace designed for professionals with back-to-back meetings. 
Unlike competitors (e.g., Otter, Fireflies), Clarify operates on a **"Bot-Free, Human-in-the-Loop"** philosophy. It captures system/microphone audio locally, merges it with the user's manual keystrokes, and uses AI to enhance the notes post-meeting. It prioritizes structure, intentionality, and data privacy.

---

## 2. Technical Blueprint & Stack

### Architecture Overview
Clarify is a lightweight Single-Page Application (SPA) natively optimized for **Vercel Edge**. It avoids heavy frameworks (like React/Next.js client-side) to ensure zero-latency load times, but leverages serverless backends for intensive AI tasks.

*   **Frontend:** Vanilla ES6+ JavaScript, HTML5, CSS3 (No framework overhead).
*   **Backend / API:** Vercel Edge Functions (JavaScript/Node runtime).
*   **Real-Time Sync:** WebRTC via PeerJS (creates a serverless Peer-to-Peer mesh network between tabs/devices).
*   **Database / Storage:** Browser \`localStorage\` (with volatile in-memory fallback for iframe/restricted environments).
*   **AI Integration:** OpenAI API (GPT-4o-mini for enhancement, Whisper for transcription).

**Prototype access limitation:** The frontend opens a local workspace and does not implement account authentication or password recovery. The existing email/reset endpoints are prototypes, not a secure account system. Meetings stored in the browser are not protected by a login. Shared links are not access-controlled: the viewer role is only a display mode and can be changed to editor. Share only with trusted people, and never use the feature for sensitive data. The experimental in-memory HTTP relay is not used for syncing.

### Folder Structure
\`\`\`text
clarify-vercel-deploy/
├── index.html          # Core DOM structure, templates, and UI skeleton
├── vercel.json         # Vercel deployment config, API routing, and security headers
├── css/
│   └── styles.css      # Design system, Glassmorphism, Spring animations, Zen Mode
├── js/
│   └── app.js          # State management, WebRTC logic, UI controllers
└── api/
    ├── enhance.js      # Vercel Edge Function: OpenAI Text Structuring
    └── transcribe.js   # Vercel Edge Function: OpenAI Whisper Audio processing
\`\`\`

---

## 3. Core Mechanics & Data Flow

### A. Storage & State Management
*   The application state is a single JSON object containing \`meetings\` and \`teams\`.
*   Every keystroke triggers \`saveImmediate()\`, which writes to \`localStorage\` and immediately broadcasts the \`UPDATE\` payload via WebRTC to any connected peers.

### B. Multiplayer & Real-Time Sync (WebRTC)
*   **Host:** When a user toggles "Share Link", their browser initializes a PeerJS node (\`clarify-{meeting_id}\`).
*   **Viewer/Collaborator:** Opening a shared link initiates a connection to the Host's Peer ID.
*   **Handshake:** The Viewer requests the current state. The Host sends a \`STATE_PAYLOAD\`. Both browsers render dynamic Avatars in the topbar to confirm connection.
*   **Constraint:** Because this is true P2P, the Host must keep their browser tab open for Viewers to maintain access. If the Host closes the tab, Viewers see a "Host Disconnected" state.

### C. Audio Capture ("Granola Mode")
*   **Mic Dictation:** Uses the browser's native Web Speech API (\`webkitSpeechRecognition\`) to transcribe the user's local voice directly into the active agenda block.
*   **Tab Capture:** Uses \`navigator.mediaDevices.getDisplayMedia({ audio: true })\` to intercept the audio of a specific browser tab (e.g., a Google Meet call). The \`MediaRecorder\` chunks this audio and sends it to \`/api/transcribe\`.

---

## 4. Standard Operating Procedures (SOPs)

### SOP 1: Production Deployment (Vercel)
1.  **Initialize Git:** Commit the \`clarify-vercel-deploy\` directory to a new GitHub repository.
2.  **Vercel Import:** In the Vercel dashboard, click "Add New Project" and select the repository.
3.  **Environment Setup:** Navigate to *Settings > Environment Variables*.
    *   Add \`OPENAI_API_KEY\` and paste your active OpenAI platform key.
4.  **Deploy:** Click Deploy. Vercel will automatically detect the \`/api\` folder and map the Edge Functions.

### SOP 2: Local Development & Testing
*   **Running Locally:** Do NOT open \`index.html\` using the \`file://\` protocol if you intend to test API routes or WebRTC, as CORS and security policies will block them. Use a local server (e.g., \`npx serve\` or VS Code Live Server).
*   **Simulating APIs Offline:** The frontend \`app.js\` is programmed with local fallbacks. If it cannot reach \`/api/enhance\` (or if the API key is missing), it will simulate an AI response using basic string manipulation.

### SOP 3: WebRTC Troubleshooting
*   If a Viewer is stuck on "Waiting for host...", ensure:
    1.  The Host tab is actively open and not suspended by the browser's memory saver.
    2.  The Viewer is not using an in-app browser (like Facebook Messenger) which blocks WebRTC. (The app will show an error advising them to use Safari/Chrome).

---

## 5. UI/UX Design System Rules

**Rule 1: Spatial UI & Glassmorphism**
*   Never use solid block backgrounds for floating elements.
*   Modals, sidebars, and dropdowns must use:
    \`background: rgba(255, 255, 255, 0.65); backdrop-filter: blur(28px) saturate(180%);\`

**Rule 2: Fluid Spring Physics**
*   Do not use linear or basic ease animations for structural UI shifts.
*   All panel slides, modal pops, and button scales must use the custom Apple-style spring bezier:
    \`transition: all 500ms cubic-bezier(0.175, 0.885, 0.32, 1.15);\`

**Rule 3: AI Representation (The Siri Glow)**
*   When AI is processing text, never use a static "Loading..." label.
*   The targeted text area must inherit the \`.textarea-enhancing\` class, which applies a moving conic/linear text-gradient shimmer to visually represent the LLM "reading."

**Rule 4: Zen Viewer Mode**
*   Guests with \`?role=viewer\` links must not see disabled UI forms.
*   The DOM must apply the \`.role-viewer\` class to the \`<body>\`, which strips borders, hides inputs, and transforms the notes into a clean, 16px, high-line-height reading canvas (similar to a Medium article).

---

## 6. Security & Privacy Rules
1.  **Audio Deletion:** Audio data is strictly transient. System tab audio chunks sent to \`/api/transcribe\` must be held only in memory, processed by the Whisper API, and immediately discarded. Never write audio blobs to disk/storage.
2.  **Link Revocation:** If a Host toggles Share to "Off", the app must immediately trigger \`peer.destroy()\` and sever all active P2P connections, instantly kicking Viewers out of the live session.
3.  **Destructive Actions:** Viewer mode hides some destructive controls for presentation only. CSS is not an authorization boundary, and the current sharing prototype does not securely enforce read-only access.
