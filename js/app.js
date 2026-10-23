
/* ==================== AUTHENTICATION & PASSWORD RESET ==================== */
const authScreen = document.getElementById('authScreen');
const authLoginView = document.getElementById('authLoginView');
const authForgotView = document.getElementById('authForgotView');

const forgotStep1 = document.getElementById('forgotStep1');
const forgotStep2 = document.getElementById('forgotStep2');
const forgotSubtitle = document.getElementById('forgotSubtitle');

// Navigation
document.getElementById('navToForgotBtn')?.addEventListener('click', () => {
  authLoginView.style.display = 'none';
  authForgotView.style.display = 'block';
  forgotStep1.style.display = 'block';
  forgotStep2.style.display = 'none';
  forgotSubtitle.textContent = 'Enter your email to receive a 6-digit reset code.';
});

document.getElementById('navToLoginBtn')?.addEventListener('click', () => {
  authForgotView.style.display = 'none';
  authLoginView.style.display = 'block';
});


const authGuestView = document.getElementById('authGuestView');

document.getElementById('navToGuestBtn')?.addEventListener('click', () => {
  authLoginView.style.display = 'none';
  authGuestView.style.display = 'block';
});

document.getElementById('navToLoginFromGuestBtn')?.addEventListener('click', () => {
  authGuestView.style.display = 'none';
  authLoginView.style.display = 'block';
});

document.getElementById('joinGuestBtn')?.addEventListener('click', (e) => {
  const link = document.getElementById('guestLinkInput').value.trim();
  if (!link) return alert('Please enter a valid shared meeting link or ID.');
  
  const btn = e.target;
  btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Connecting...';
  btn.disabled = true;
  
  setTimeout(() => {
    // Basic parser for if they pasted a full URL vs just the ID
    let targetId = link;
    let targetRole = 'viewer'; // Default for manual guest entry unless URL specifies
    
    if (link.includes('?')) {
      try {
        const urlParams = new URLSearchParams(link.split('?')[1]);
        if (urlParams.get('id')) targetId = urlParams.get('id');
        if (urlParams.get('role')) targetRole = urlParams.get('role');
      } catch (err) {}
    }
    
    // Auto route them to the meeting
    window.location.search = '?id=' + targetId + '&role=' + targetRole;
  }, 1000);
});

// Login Simulation
document.getElementById('loginBtn')?.addEventListener('click', (e) => {
  const email = document.getElementById('loginEmail').value.trim();
  const pass = document.getElementById('loginPass').value.trim();
  
  if (!email || !pass) {
    alert('Please enter both email and password.');
    return;
  }
  
  const btn = e.target;
  requestAnimationFrame(() => {
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Authenticating...';
    btn.disabled = true;
    
    setTimeout(() => {
    try { localStorage.setItem('clarify_user', email); } catch(e) {}
    authScreen.classList.remove('show');
    btn.innerHTML = 'Sign In';
    btn.disabled = false;
    
    // Boot the app normally
    queueMicrotask(() => {
      saveImmediate();
      renderHome();
      
      // If it's a completely new user, show the splash screen
      if (!state.meetings.length) {
        introDismissed = false; // Reset the flag so it doesn't freeze!
        document.getElementById('homeScreen').classList.add('intro-active');
        document.getElementById('introSplash').classList.remove('hidden');
        introTimer = setTimeout(() => dismissIntro(), 3000);
      }
    });
  }, 1200);
  });
});


let currentResetCode = null;

function showAuthToast(msg, duration=5000) {
  const toast = document.getElementById('authToast');
  const text = document.getElementById('authToastText');
  if(toast && text) {
    text.innerHTML = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), duration);
  } else {
    alert(msg.replace(/<[^>]*>?/gm, ''));
  }
}

async function handleSendCode(btnElement) {
  const email = document.getElementById('forgotEmail').value.trim();
  if (!email) return alert('Please enter your email address.');
  
  btnElement.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Sending...';
  btnElement.disabled = true;
  
  try {
    const res = await fetch('/api/send-code', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email })
    });
    
    if (res.ok) {
      const data = await res.json();
      currentResetCode = data.code; // Store locally to validate
      
      forgotStep1.style.display = 'none';
      forgotStep2.style.display = 'block';
      forgotSubtitle.innerHTML = `We sent a secure code to <strong>${email}</strong>.<br>Please enter it below.`;
      
      if (data.mock) {
        showAuthToast(`<strong>Demo Mode:</strong> Your reset code is <strong style="letter-spacing:2px; color:var(--accent);">${data.code}</strong><br><span style="font-size:11px; color:var(--muted);">Add RESEND_API_KEY in Vercel to email this.</span>`, 8000);
      } else {
        showAuthToast('Reset code sent to your email!');
      }
    } else {
      alert("Failed to connect to the server.");
    }
  } catch (e) {
    // Offline simulation fallback
    currentResetCode = "123456";
    forgotStep1.style.display = 'none';
    forgotStep2.style.display = 'block';
    forgotSubtitle.innerHTML = `We sent a secure code to <strong>${email}</strong>.<br>Please enter it below.`;
    showAuthToast('<strong>Offline Fallback:</strong> Your reset code is <strong style="letter-spacing:2px; color:var(--accent);">123456</strong>');
  }
  
  btnElement.innerHTML = btnElement.id === 'sendCodeBtn' ? 'Send Reset Code' : 'Resend Code';
  btnElement.disabled = false;
}

// Forgot Password - Step 1: Send Code
document.getElementById('sendCodeBtn')?.addEventListener('click', (e) => handleSendCode(e.target));
document.getElementById('resendCodeBtn')?.addEventListener('click', (e) => handleSendCode(e.target));

// Forgot Password - Step 2: Reset & Login
document.getElementById('resetPassBtn')?.addEventListener('click', (e) => {
  const code = document.getElementById('resetCode').value.trim();
  const newPass = document.getElementById('newPass').value.trim();
  
  if (code !== currentResetCode) {
    alert('Invalid or expired reset code.');
    return;
  }
  if (newPass.length < 6) {
    alert('Password must be at least 6 characters.');
    return;
  }
  
  const btn = e.target;
  
  requestAnimationFrame(() => {
    btn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Resetting...';
    btn.disabled = true;
    
    // Simulate password update in database
    setTimeout(() => {
      const email = document.getElementById('forgotEmail').value.trim();
      try { localStorage.setItem('clarify_user', email); } catch(e) {} // Auto-login after reset
      authScreen.classList.remove('show');
      
      btn.innerHTML = 'Reset Password & Login';
      btn.disabled = false;
      
      queueMicrotask(() => {
        saveImmediate();
        renderHome();
      });
    }, 1200);
  });
});

// Logout
// Logout
document.getElementById('logoutBtn')?.addEventListener('click', () => {
  try { localStorage.removeItem('clarify_user'); } catch(e) {}
  window.location.reload();
});


/* ==================== VOICE UI (TALK TO NOTES) ==================== */
const voiceOrb = document.getElementById('voiceOrb');
const voiceToast = document.getElementById('voiceToast');
let orbRecog = null;
let isOrbListening = false;
let synthVoice = null;

function initOrbRecognition() {
  const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SR) return null;
  const r = new SR();
  r.continuous = false;
  r.interimResults = false;
  
  r.onstart = () => {
    isOrbListening = true;
    voiceOrb.classList.add('listening');
    voiceToast.textContent = "Listening...";
    voiceToast.classList.add('show');
  };
  
  r.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    voiceToast.textContent = '"' + transcript + '"';
    setTimeout(() => {
      processVoiceQuery(transcript);
    }, 800);
  };
  
  r.onerror = (e) => {
    console.warn("Orb Speech Error", e);
    isOrbListening = false;
    voiceOrb.classList.remove('listening');
    voiceToast.classList.remove('show');
  };
  
  r.onend = () => { 
    isOrbListening = false;
    voiceOrb.classList.remove('listening');
  };
  return r;
}

voiceOrb?.addEventListener('click', () => {
  // Load voices if not loaded
  if (!synthVoice && window.speechSynthesis) {
    const voices = window.speechSynthesis.getVoices();
    synthVoice = voices.find(v => v.lang === 'en-US' && v.name.includes('Samantha')) || voices[0];
  }

  if (isOrbListening) {
     orbRecog?.stop();
     return;
  }
  if (!orbRecog) orbRecog = initOrbRecognition();
  
  if (orbRecog) {
    try { orbRecog.start(); } catch(e) {}
  } else {
    alert("Voice UI not supported in this browser.");
  }
});

function processVoiceQuery(query) {
  voiceOrb.classList.add('speaking');
  
  // Basic RAG (Retrieval-Augmented Generation) Simulation
  let answer = "I couldn't find anything related to that in your notes.";
  const q = query.toLowerCase();
  
  // Aggregate all notes
  let allContent = '';
  state.meetings.forEach(m => {
    allContent += m.title.toLowerCase() + " ";
    m.items.forEach(i => allContent += (i.notes||'').toLowerCase() + " ");
    m.tasks.forEach(t => allContent += (t.name||'').toLowerCase() + " " + (t.notes||'').toLowerCase() + " ");
  });
  
  const ignoreWords = ['what','who','where','when','why','how','did','we','decide','about','the','in','on','at','is','a','an','to','for','with'];
  const keywords = q.split(' ').filter(x => x.length > 3 && !ignoreWords.includes(x));
  
  if (keywords.length > 0 && keywords.some(k => allContent.includes(k))) {
     
  }
  
  if (q.includes("marketing") || q.includes("launch")) {
    answer = "In your previous meeting, it was noted to delay the launch by two days to finalize assets.";
  } else if (q.includes("budget") || q.includes("finance")) {
    answer = "According to your notes, the Q3 budget was approved last Thursday.";
  
     
     // Specific Easter Eggs for Demo Magic
     if (q.includes("marketing") || q.includes("launch")) {
       answer = "In your previous meeting, it was noted to delay the launch by two days to finalize assets.";
     } else if (q.includes("budget") || q.includes("finance")) {
       answer = "According to your notes, the Q3 budget was approved last Thursday.";
     }
  }
  
  voiceToast.textContent = answer;
  
  if (window.speechSynthesis) {
    const msg = new SpeechSynthesisUtterance(answer);
    if (synthVoice) msg.voice = synthVoice;
    msg.rate = 1.05;
    msg.pitch = 1.1;
    msg.onend = () => {
      voiceOrb.classList.remove('speaking');
      setTimeout(() => voiceToast.classList.remove('show'), 2000);
    };
    window.speechSynthesis.speak(msg);
  } else {
    voiceOrb.classList.remove('speaking');
    setTimeout(() => voiceToast.classList.remove('show'), 3000);
  }
}


/* ==================== GLOBAL SEARCH ==================== */
const searchModal = document.getElementById('searchModal');
const searchInput = document.getElementById('searchInput');
const searchResults = document.getElementById('searchResults');
const searchEmpty = document.getElementById('searchEmpty');
let searchSelectedIndex = -1;

function toggleSearch() {
  if (searchModal.classList.contains('show')) {
    closeSearch();
  } else {
    searchModal.classList.add('show');
    searchInput.value = '';
    searchResults.innerHTML = '';
    searchResults.classList.remove('has-results');
    searchEmpty.classList.remove('show');
    setTimeout(() => searchInput.focus(), 100);
  }
}

function closeSearch() {
  searchModal.classList.remove('show');
  searchInput.blur();
}

document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
    e.preventDefault();
    toggleSearch();
  }
  if (e.key === 'Escape' && searchModal.classList.contains('show')) {
    closeSearch();
  }
});

document.getElementById('homeSearchBtn')?.addEventListener('click', toggleSearch);
searchModal?.addEventListener('click', (e) => { if (e.target === searchModal) closeSearch(); });

searchInput?.addEventListener('input', (e) => {
  const q = e.target.value.toLowerCase().trim();
  if (!q) {
    searchResults.innerHTML = '';
    searchResults.classList.remove('has-results');
    searchEmpty.classList.remove('show');
    return;
  }
  
  let matches = [];
  
  (state.meetings || []).forEach(m => {
    // Check Title
    if ((m.title || '').toLowerCase().includes(q)) {
      matches.push({ meeting: m, type: 'Meeting', context: m.title || 'Untitled' });
    } else {
      // Check Topics
      let foundTopic = m.items.find(t => (t.title||'').toLowerCase().includes(q) || (t.notes||'').toLowerCase().includes(q));
      if (foundTopic) {
        matches.push({ meeting: m, type: 'Topic', context: foundTopic.title || 'In Notes' });
      } else {
        // Check Tasks
        let foundTask = m.tasks.find(t => (t.name||'').toLowerCase().includes(q) || (t.notes||'').toLowerCase().includes(q));
        if (foundTask) {
          matches.push({ meeting: m, type: 'Action Item', context: foundTask.name || 'In Task Notes' });
        }
      }
    }
  });
  
  // Render results
  if (matches.length > 0) {
    searchEmpty.classList.remove('show');
    searchResults.classList.add('has-results');
    searchResults.innerHTML = matches.map((m, i) => `
      <div class="search-result-item" data-id="${m.meeting.id}">
        <div class="search-result-title">${escapeHTML(m.meeting.title || 'Untitled Meeting')}</div>
        <div class="search-result-context">Matched in ${m.type}: ${escapeHTML(m.context)}</div>
      </div>
    `).join('');
    
    // Bind clicks
    searchResults.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', () => {
        closeSearch();
        openMeeting(item.dataset.id);
      });
    });
  } else {
    searchResults.innerHTML = '';
    searchResults.classList.remove('has-results');
    searchEmpty.classList.add('show');
  }
});
/* ======================================================= */

/* ============================= STATE / STORAGE ============================ */
const STORAGE_KEY = 'facilitate.v4';
const LEGACY_KEYS = ['facilitate.v3','facilitate.v2','facilitate.v1'];
const STATUSES = ['ongoing','done','abandoned'];     // task statuses
const M_STATUSES = ['ongoing','scheduled','done'];   // meeting statuses

const todayISO = () => {
  const d = new Date();
  return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
};
const uid = () => Math.random().toString(36).slice(2, 10);

const newMeeting = (title='', date=todayISO()) => ({
  id: uid(),
  title: title || 'Untitled meeting',
  date,
  status: 'scheduled',
  createdAt: new Date().toISOString(),
  lastOpenedAt: null,
  items: [],
  tasks: [],
  activeId: null,
  expandedTasks: {},
  statusFilter: 'all',
  selectedTaskId: null,
  // Session timing
  durationSec: 0,             // accumulated duration across all sessions (seconds)
  sessionStartedAt: null,     // ISO timestamp when current session started (null if not running)
  endedAt: null,              // ISO timestamp when meeting was marked done
});

const defaultState = () => ({
  meetings: [],
  teams: [],
  currentId: null,
  theme: 'light',
  });

let inMemoryStorage = {};
const getStorage = (k = STORAGE_KEY) => {
  try { return localStorage.getItem(k); } 
  catch(e) { return inMemoryStorage[k] || null; }
};
const setStorage = (val, k = STORAGE_KEY) => {
  try { localStorage.setItem(k, val); } 
  catch(e) { inMemoryStorage[k] = val; }
};
let state = load();
state.teams = state.teams || [];
function load() {
  try {
    const raw = getStorage();
    if (raw) {
      const parsed = JSON.parse(raw);
      const s = Object.assign(defaultState(), parsed);
      s.meetings = (s.meetings || []).map(normalizeMeeting);
      return s;
    }
    // Migrate from v3 (single meeting) / v1-v2 (no meeting wrapper)
    for (const key of LEGACY_KEYS) {
      const legacy = getStorage(key);
      if (!legacy) continue;
      const v = JSON.parse(legacy);
      const s = defaultState();
      const m = newMeeting(v.meeting?.title || '', v.meeting?.date || todayISO());
      m.items = v.items || [];
      m.tasks = (v.tasks || []).map(t => ({
        ...t,
        status: t.status || (t.done ? 'done' : 'ongoing'),
        notes: t.notes || '',
        links: t.links || [],
      }));
      m.activeId = v.activeId || null;
      m.expandedTasks = v.expandedTasks || {};
      m.statusFilter = v.statusFilter || 'all';
      m.status = computeAutoStatus(m);
      s.meetings.push(m);
      return s;
    }
    return defaultState();
  } catch { return defaultState(); }
}
function normalizeMeeting(m) {
  return {
    ...newMeeting(),
    ...m,
    items: m.items || [],
    tasks: (m.tasks || []).map(t => ({
      status: t.status || (t.done ? 'done' : 'ongoing'),
      notes: t.notes || '', links: t.links || [],
      ...t,
      status: t.status || (t.done ? 'done' : 'ongoing'),
    })),
    expandedTasks: m.expandedTasks || {},
    statusFilter: m.statusFilter || 'all',
    selectedTaskId: m.selectedTaskId || null,
    durationSec: typeof m.durationSec === 'number' ? m.durationSec : 0,
    visibility: m.visibility || 'private',
    teamId: m.teamId || null,
    sessionStartedAt: m.sessionStartedAt || null,
    endedAt: m.endedAt || null,
    status: M_STATUSES.includes(m.status) ? m.status : 'scheduled',
  };
}
function computeAutoStatus(m) {
  if (m.status === 'done') return 'done';
  // if user added content, probably ongoing
  if (m.items.length || m.tasks.length) return 'ongoing';
  if (m.date > todayISO()) return 'scheduled';
  return 'ongoing';
}






let save = (() => {
  let t; return () => {
    clearTimeout(t);
    t = setTimeout(() => {
      setStorage(JSON.stringify(state));
    }, 150);
  };
})();
let saveImmediate = () => {
  setStorage(JSON.stringify(state));
};

function cm() { return state.meetings.find(m => m.id === state.currentId); }

/* ============================== HELPERS ================================== */
const $ = (s, el=document) => el.querySelector(s);
const $$ = (s, el=document) => [...el.querySelectorAll(s)];

/* ---- Modal focus management (a11y) ----
 * Moves focus into a dialog on open, traps Tab within it, and restores
 * focus to the previously-focused element on close. */
const FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
const _trapState = new WeakMap();
function trapFocus(container, firstFocusEl) {
  const opener = document.activeElement;
  const onKey = (e) => {
    if (e.key !== 'Tab') return;
    const items = [...container.querySelectorAll(FOCUSABLE)].filter(el => el.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  };
  container.addEventListener('keydown', onKey);
  _trapState.set(container, { onKey, opener });
  const target = firstFocusEl || container.querySelector(FOCUSABLE);
  setTimeout(() => target?.focus(), 60);
}
function releaseFocus(container) {
  const st = _trapState.get(container);
  if (!st) return;
  container.removeEventListener('keydown', st.onKey);
  _trapState.delete(container);
  st.opener?.focus?.();
}

function activeItem() { const m = cm(); return m && m.items.find(i => i.id === m.activeId); }
function escapeHTML(s='') {
  return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
function escapeAttr(s='') { return escapeHTML(s); }
function formatDateShort(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00');
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
}
function formatDateLong(iso) {
  if (!iso) return '';
  const d = new Date(iso + 'T00:00');
  return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
}
function relDate(iso) {
  if (!iso) return '';
  const t = todayISO();
  if (iso === t) return 'Today';
  // tomorrow?
  const tomorrow = (() => { const d = new Date(); d.setDate(d.getDate()+1); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); })();
  const yesterday = (() => { const d = new Date(); d.setDate(d.getDate()-1); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); })();
  if (iso === tomorrow) return 'Tomorrow';
  if (iso === yesterday) return 'Yesterday';
  return formatDateLong(iso);
}
function normalizeHref(raw) {
  if (!raw) return '';
  let s = String(raw).trim();
  if (!s) return '';
  if (/^[a-z][a-z0-9+\-.]*:/i.test(s)) return s;
  if (/^\\\\/.test(s)) return 'file://' + s.replace(/\\/g,'/').replace(/^\/\//,'');
  if (/^[a-zA-Z]:[\\/]/.test(s)) return 'file:///' + s.replace(/\\/g,'/');
  if (s.startsWith('/')) return 'file://' + s;
  if (s.startsWith('~/')) return 'file://' + s;
  if (/^[\w.-]+\.[a-z]{2,}([/?#].*)?$/i.test(s)) return 'https://' + s;
  return 'file://' + s;
}
function isLocalLink(href) { return /^file:/i.test(href); }
function linkDisplay(href) {
  if (!href) return '';
  if (/^file:\/\//i.test(href)) {
    return href.replace(/^file:\/\/\/?/i, '').replace(/\//g, navigator.platform.indexOf('Win')>-1?'\\':'/');
  }
  return href;
}
function linkHostname(href) { try { return new URL(href).hostname || ''; } catch { return ''; } }

/* ============================== HOME / LIST ============================== */
const homeEl  = $('#homeScreen');
const appEl   = $('#app');
const groupsEl = $('#meetingGroups');
const homeHeading = $('#homeHeading');
const homeSub = $('#homeSub');
const introSplash = $('#introSplash');

let introDismissed = false;
let introTimer = null;

function dismissIntro() {
  if (introDismissed) return;
  introDismissed = true;
  homeEl.classList.remove('intro-active');
  introSplash?.classList.add('hidden');
}

function meetingRowHTML(m) {
  const d = new Date(m.date + 'T00:00');
  const mon = d.toLocaleDateString(undefined, { month: 'short' });
  const day = d.getDate();
  const isToday = m.date === todayISO();
  const taskCount = m.tasks.length;
  const itemCount = m.items.length;
  // Compute live duration (in case it's still ticking — should only happen if user navigates away mid-session)
  let liveDur = m.durationSec || 0;
  if (m.sessionStartedAt) liveDur += Math.max(0, (Date.now() - new Date(m.sessionStartedAt).getTime())/1000);
  const showDur = liveDur > 0 && (m.status === 'done' || m.status === 'ongoing');
  const subParts = [
    `<span class="chip">${escapeHTML(relDate(m.date))}</span>`,
    itemCount ? `<span class="chip">${itemCount} topic${itemCount===1?'':'s'}</span>` : '',
    taskCount ? `<span class="chip">${taskCount} task${taskCount===1?'':'s'}</span>` : '',
    showDur ? `<span class="chip dur" title="${m.status==='done'?'Total meeting duration':'Time spent so far'}">⏱ ${fmtDurationHuman(liveDur)}</span>` : '',
  ].filter(Boolean).join('');

  return `
    <div class="meeting-row ${isToday?'is-today':''}" data-id="${m.id}" role="button" tabindex="0" aria-label="Open meeting: ${escapeAttr(m.title || 'Untitled meeting')}, ${escapeAttr(relDate(m.date))}, ${escapeAttr(m.status)}">
      <div class="meeting-row-date">
        <div class="mon">${mon}</div>
        <div class="day">${day}</div>
      </div>
      <div class="meeting-row-body">
        <div class="meeting-row-title">${escapeHTML(m.title || 'Untitled meeting')}</div>
        <div class="meeting-row-meta">${subParts}</div>
      </div>
      <span class="status-tag ${m.status}">${m.status}</span>
      <div class="meeting-row-actions">
        ${m.status === 'done' ? `
          <button class="mini-btn" data-act="reopen" title="Reopen as ongoing" aria-label="Reopen meeting as ongoing">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 9-9"/><polyline points="3 4 3 10 9 10"/></svg>
          </button>` : ''}
        <button class="mini-btn danger" data-act="delete" title="Delete meeting" aria-label="Delete meeting">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </div>
    </div>
  `;
}


function updateBentoAnalytics() {
  const bentoGrid = document.getElementById('bentoGrid');
  if (!bentoGrid || !state.meetings.length) {
    if(bentoGrid) bentoGrid.style.display = 'none';
    return;
  }
  bentoGrid.style.display = 'grid';

  // Calculate Time
  let totalSec = 0;
  let totalTasks = 0;
  let doneTasks = 0;

  state.meetings.forEach(m => {
    totalSec += m.durationSec || 0;
    totalTasks += m.tasks.length;
    doneTasks += m.tasks.filter(t => t.status === 'done').length;
  });

  const hours = Math.floor(totalSec / 3600);
  const mins = Math.floor((totalSec % 3600) / 60);
  document.getElementById('bentoTime').textContent = hours > 0 ? `${hours}h ${mins}m` : `${mins}m`;

  // Calculate Tasks
  const percent = totalTasks === 0 ? 0 : Math.round((doneTasks / totalTasks) * 100);
  document.getElementById('bentoTasks').textContent = `${percent}%`;
  document.getElementById('bentoTaskCount').textContent = `${doneTasks}/${totalTasks}`;

  // Animate SVG Ring (Circumference ~175)
  const ring = document.getElementById('bentoProgress');
  if (ring) {
    const offset = 175 - (175 * (percent / 100));
    setTimeout(() => { ring.style.strokeDashoffset = offset; }, 100);
  }
}

function renderHome() {
  const byStatus = { ongoing: [], scheduled: [], done: [] };
  state.meetings.forEach(m => byStatus[m.status]?.push(m));
  byStatus.scheduled.sort((a,b) => a.date.localeCompare(b.date));
  byStatus.ongoing.sort((a,b) => (b.lastOpenedAt||b.createdAt||'').localeCompare(a.lastOpenedAt||a.createdAt||''));
  byStatus.done.sort((a,b) => b.date.localeCompare(a.date));

  const total = state.meetings.length;
  updateBentoAnalytics();
  if(homeHeading) homeHeading.textContent = total ? 'Your Meetings' : 'Welcome to Clarify';
  if(homeSub) homeSub.textContent = total ? 'Pick one to open or start a new one.' : 'Create your first meeting to get started.';

  groupsEl.innerHTML = '';
  if (!total) {
    groupsEl.innerHTML = `
      <div class="empty-state">
        <h3>It’s quiet in here</h3>
        <p>No meetings found. Start planning your next conversation.</p>
      </div>`;
    return;
  }

  const renderGroup = (label, arr, gClass) => {
    if (!arr.length) return;
    const g = document.createElement('div'); g.className = 'meeting-group ' + gClass;
    g.innerHTML = `<div class="meeting-group-label"><span class="dot"></span>${label}</div>`;
    const list = document.createElement('div'); list.className = 'meeting-list';
    arr.forEach(m => {
      list.innerHTML += meetingRowHTML(m);
    });
    g.appendChild(list);
    groupsEl.appendChild(g);
  };

  renderGroup('Ongoing', byStatus.ongoing, 'group-ongoing');
  renderGroup('Scheduled', byStatus.scheduled, 'group-scheduled');
  renderGroup('Done', byStatus.done, 'group-done');
}

function showHome() {
  pauseSession();
  if (timerInt) { clearInterval(timerInt); timerInt = null; }
  appEl.style.display = 'none';
  homeEl.classList.remove('hidden');
  state.currentId = null;
  saveImmediate();
  renderHome();
}
function showApp() {
  homeEl.classList.add('hidden');
  appEl.style.display = '';
  renderMeetingHeader();
  renderAgenda();
  renderFocus(false);
  // Auto-start the meeting session timer (unless meeting is already done)
  const m = cm();
  if (m && m.status !== 'done') startSession();
  else updateTimer();
  if (!timerInt) timerInt = setInterval(updateTimer, 1000);
  
  const isHost = !new URLSearchParams(window.location.search).get('id');
  if (m && isHost && m.shareEnabled) {
    initP2P(m, true);
  }
  if (document.body.classList.contains('role-viewer')) {
    const micBtn = document.getElementById('topbarMicBtn');
    if (micBtn) micBtn.style.display = 'none';
    const tabBtn = document.getElementById('topbarTabAudioBtn');
    if (tabBtn) tabBtn.style.display = 'none';
    const vidBtn = document.getElementById('topbarVideoBtn');
    if (vidBtn) vidBtn.style.display = 'none';
  }
}

groupsEl.addEventListener('click', e => {
  const row = e.target.closest('.meeting-row');
  if (!row) return;
  const id = row.dataset.id;
  const btn = e.target.closest('[data-act]');
  if (btn) {
    const act = btn.dataset.act;
    const m = state.meetings.find(x => x.id === id);
    if (!m) return;
    if (act === 'delete') {
      if (confirm('Delete meeting "'+(m.title||'Untitled')+'"?')) {
        state.meetings = state.meetings.filter(x => x.id !== id);
        saveImmediate(); renderHome();
      }
    } else if (act === 'reopen') {
      m.status = 'ongoing'; m.endedAt = null;
      saveImmediate(); renderHome();
    }
    return;
  }
  openMeeting(id);
});

function openMeeting(id) {
  const m = state.meetings.find(x => x.id === id); if (!m) return;
  state.currentId = id;
  m.lastOpenedAt = new Date().toISOString();
  if (m.status === 'scheduled') m.status = 'ongoing';
  saveImmediate();
  showApp();
}



/* ========================== NEW MEETING MODAL ============================ */
const modal = $('#newMeetingModal');
const calGrid = $('#calGrid');
const calMonth = $('#calMonth');
const meetingTitleInput = $('#meetingTitleInput');
const selectedDateLabel = $('#selectedDateLabel');

let calView = { year: 0, month: 0 };
let pickedISO = todayISO();

function setPicked(iso) {
  pickedISO = iso;
  selectedDateLabel.textContent = (iso === todayISO())
    ? `Today · ${formatDateLong(iso)}`
    : formatDateLong(iso);
  renderCal();
}
function renderCal() {
  const monthName = new Date(calView.year, calView.month, 1)
    .toLocaleDateString(undefined, { month: 'long', year: 'numeric' });
  calMonth.textContent = monthName;
  calGrid.innerHTML = '';
  ['S','M','T','W','T','F','S'].forEach(d => {
    const el = document.createElement('div'); el.className = 'cal-dow'; el.textContent = d;
    calGrid.appendChild(el);
  });
  const first = new Date(calView.year, calView.month, 1);
  const startDow = first.getDay();
  const daysInMonth = new Date(calView.year, calView.month+1, 0).getDate();
  const daysPrev = new Date(calView.year, calView.month, 0).getDate();
  const totalCells = Math.ceil((startDow + daysInMonth) / 7) * 7;
  const today = todayISO();
  for (let i = 0; i < totalCells; i++) {
    const cell = document.createElement('button'); cell.type = 'button'; cell.className = 'cal-day';
    let y = calView.year, m = calView.month, d;
    if (i < startDow) { d = daysPrev - startDow + 1 + i; m = calView.month - 1; if (m < 0) { m = 11; y--; } cell.classList.add('other'); }
    else if (i >= startDow + daysInMonth) { d = i - startDow - daysInMonth + 1; m = calView.month + 1; if (m > 11) { m = 0; y++; } cell.classList.add('other'); }
    else d = i - startDow + 1;
    const iso = `${y}-${String(m+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    cell.textContent = d;
    cell.setAttribute('aria-label', formatDateLong(iso));
    if (iso === today) cell.classList.add('today');
    if (iso === pickedISO) { cell.classList.add('selected'); cell.setAttribute('aria-current', 'date'); }
    cell.addEventListener('click', () => {
      if (cell.classList.contains('other')) { calView.year = y; calView.month = m; }
      setPicked(iso);
    });
    calGrid.appendChild(cell);
  }
}

function openNewMeeting() {
  pickedISO = todayISO();
  populateVisibilityDropdown();
  if ($('#meetingTemplateInput')) {
    $('#meetingTemplateInput').value = 'none';
    $('#meetingTitleInput').placeholder = 'e.g. Weekly product review';
  }
  $('#meetingVisibility').value = 'private';
  const t = new Date();
  calView = { year: t.getFullYear(), month: t.getMonth() };
  meetingTitleInput.value = '';
  setPicked(pickedISO);
  modal.classList.add('show');
  trapFocus(modal, meetingTitleInput);
}
function closeNewMeeting() { modal.classList.remove('show'); releaseFocus(modal); }

$('#openNewMeeting').addEventListener('click', openNewMeeting);
if ($('#meetingTemplateInput')) {
  $('#meetingTemplateInput').addEventListener('change', (e) => {
    const val = e.target.value;
    const t = document.getElementById('meetingTitleInput');
    if (val === 'none') {
      t.placeholder = 'e.g. Weekly product review';
    } else {
      t.placeholder = MEETING_TEMPLATES[val].title;
    }
  });
}
$('#cancelNewMeeting').addEventListener('click', closeNewMeeting);
modal.addEventListener('click', (e) => { if (e.target === modal) closeNewMeeting(); });

$('#calPrev').addEventListener('click', () => {
  calView.month--; if (calView.month < 0) { calView.month = 11; calView.year--; }
  renderCal();
});
$('#calNext').addEventListener('click', () => {
  calView.month++; if (calView.month > 11) { calView.month = 0; calView.year++; }
  renderCal();
});
$('#calToday').addEventListener('click', () => {
  const t = new Date();
  calView = { year: t.getFullYear(), month: t.getMonth() };
  setPicked(todayISO());
});

meetingTitleInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); createMeeting(); }
});
$('#createMeetingBtn').addEventListener('click', createMeeting);



function triggerIntegrationToast() {
  const toast = document.getElementById('integrationToast');
  if (!toast) return;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

/* ============================== TEAMS LOGIC ============================== */
let currentTeamMembers = [];
let editingTeamId = null;

function renderTeams() {
  const list = $('#teamList');
  if (!state.teams || !state.teams.length) {
    list.innerHTML = `
      <div class="empty-state">
        <h3>No teams yet</h3>
        <p>Create a team to start sharing meetings and collaborating.</p>
      </div>`;
    return;
  }
  list.innerHTML = state.teams.map(t => `
    <div class="team-card" data-id="${t.id}">
      <div class="team-name">${escapeHTML(t.name)}</div>
      ${t.description ? `<div class="team-desc">${escapeHTML(t.description)}</div>` : ''}
      <div class="team-meta">
        <span>👥 ${t.members.length} member${t.members.length===1?'':'s'}</span>
      </div>
    </div>
  `).join('');
}

$$('#homeTabs .tab').forEach(tab => {
  tab.addEventListener('click', () => {
    $$('#homeTabs .tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    if (tab.dataset.tab === 'meetings') {
      $('#viewMeetings').style.display = '';
      $('#viewTeams').style.display = 'none';
    } else {
      $('#viewMeetings').style.display = 'none';
      $('#viewTeams').style.display = '';
      renderTeams();
    }
  });
});

$('#teamList')?.addEventListener('click', e => {
  const card = e.target.closest('.team-card');
  if (card) openEditTeam(card.dataset.id);
});

function renderMembersList() {
  const list = $('#membersList');
  if (!currentTeamMembers.length) {
    list.innerHTML = '<div style="padding: 12px; font-size: 13px; color: var(--subtle); text-align: center;">No members added yet.</div>';
    return;
  }
  list.innerHTML = currentTeamMembers.map((m, i) => `
    <div class="member-row">
      <div class="member-email">${escapeHTML(m.email)}</div>
      <div class="member-actions">
        <select class="role-select" data-index="${i}">
          <option value="owner" ${m.role==='owner'?'selected':''}>Owner</option>
          <option value="editor" ${m.role==='editor'?'selected':''}>Editor</option>
          <option value="viewer" ${m.role==='viewer'?'selected':''}>Viewer</option>
        </select>
        <button class="delete-btn" data-remove-index="${i}" title="Remove member" style="padding:4px;">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
    </div>
  `).join('');
  
  list.querySelectorAll('.role-select').forEach(sel => {
    sel.addEventListener('change', e => {
      currentTeamMembers[e.target.dataset.index].role = e.target.value;
    });
  });
  list.querySelectorAll('[data-remove-index]').forEach(btn => {
    btn.addEventListener('click', e => {
      currentTeamMembers.splice(e.target.closest('button').dataset.removeIndex, 1);
      renderMembersList();
    });
  });
}

$('#openNewTeamBtn').addEventListener('click', () => {
  editingTeamId = null;
  $('#teamModalEyebrow').textContent = 'Create Team';
  $('#teamNameInput').value = '';
  $('#teamDescInput').value = '';
  $('#teamEmailInput').value = '';
  currentTeamMembers = [];
  renderMembersList();
  $('#teamModal').classList.add('show');
  trapFocus($('#teamModal'), $('#teamNameInput'));
});

function openEditTeam(id) {
  const t = state.teams.find(x => x.id === id);
  if (!t) return;
  editingTeamId = id;
  $('#teamModalEyebrow').textContent = 'Edit Team';
  $('#teamNameInput').value = t.name;
  $('#teamDescInput').value = t.description || '';
  $('#teamEmailInput').value = '';
  currentTeamMembers = JSON.parse(JSON.stringify(t.members || []));
  renderMembersList();
  $('#teamModal').classList.add('show');
  trapFocus($('#teamModal'), $('#teamNameInput'));
}

$('#cancelTeamBtn').addEventListener('click', () => {
  $('#teamModal').classList.remove('show');
  releaseFocus($('#teamModal'));
});

$('#addMemberBtn').addEventListener('click', () => {
  const em = $('#teamEmailInput').value.trim();
  if (!em) return;
  const emails = em.split(',').map(e => e.trim()).filter(Boolean);
  emails.forEach(email => {
    if (!currentTeamMembers.find(m => m.email === email)) {
      currentTeamMembers.push({ email, role: 'viewer' });
    }
  });
  $('#teamEmailInput').value = '';
  renderMembersList();
});

$('#teamEmailInput').addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); $('#addMemberBtn').click(); }
});

$('#saveTeamBtn').addEventListener('click', () => {
  const name = $('#teamNameInput').value.trim();
  if (!name) return alert('Team name is required');
  
  state.teams = state.teams || [];
  if (editingTeamId) {
    const t = state.teams.find(x => x.id === editingTeamId);
    if (t) {
      t.name = name;
      t.description = $('#teamDescInput').value.trim();
      t.members = currentTeamMembers;
    }
  } else {
    state.teams.push({
      id: uid(),
      name,
      description: $('#teamDescInput').value.trim(),
      members: currentTeamMembers
    });
  }
  saveImmediate();
  $('#teamModal').classList.remove('show');
  renderTeams();
  populateVisibilityDropdown();
});

function populateVisibilityDropdown() {
  const sels = [$('#meetingVisibility'), $('#shareVisibility')];
  sels.forEach(sel => {
    if (!sel) return;
    const currentVal = sel.value;
    sel.innerHTML = '<option value="private">Private (Only me)</option>';
    (state.teams || []).forEach(t => {
      sel.innerHTML += `<option value="${t.id}">Share with: ${escapeHTML(t.name)}</option>`;
    });
    // Try to restore previous value if it exists in the new options
    if (Array.from(sel.options).some(o => o.value === currentVal)) {
      sel.value = currentVal;
    }
  });
}

// Share Meeting Modal Logic
$('#topbarShareBtn')?.addEventListener('click', () => {
  const m = cm(); if (!m) return;
  populateVisibilityDropdown();
  $('#shareVisibility').value = m.teamId || 'private';
  $('#shareToggle').checked = !!m.shareEnabled;
  updateShareLinks(m);
  $('#shareModal').classList.add('show');
});
$('#cancelShareBtn')?.addEventListener('click', () => {
  $('#shareModal').classList.remove('show');
});
$('#shareVisibility')?.addEventListener('change', (e) => {
  const m = cm(); if(!m) return;
  const val = e.target.value;
  m.teamId = val === 'private' ? null : val;
  m.visibility = m.teamId ? 'team' : 'private';
  saveImmediate();
  renderMeetingHeader();
});
$('#shareToggle')?.addEventListener('change', (e) => {
  const m = cm(); if(!m) return;
  m.shareEnabled = e.target.checked;
  saveImmediate();
  updateShareLinks(m);
  renderMeetingHeader();
  if (m.shareEnabled) {
    initP2P(m, true);
  } else {
    if (peer) { peer.destroy(); peer = null; p2pConns = []; }
  }
});
function updateShareLinks(m) {
  const container = $('#shareLinksContainer');
  if (!container) return;
  if (m.shareEnabled) {
    container.style.display = 'flex';
    const baseUrl = window.location.origin + window.location.pathname;
    $('#collabLinkInput').value = baseUrl + '?id=' + m.id + '&role=editor';
    $('#viewerLinkInput').value = baseUrl + '?id=' + m.id + '&role=viewer';
  } else {
    container.style.display = 'none';
  }
}
$('#copyCollabBtn')?.addEventListener('click', () => {
  navigator.clipboard.writeText($('#collabLinkInput').value);
  const btn = $('#copyCollabBtn'); btn.textContent = 'Copied!'; setTimeout(()=>btn.textContent='Copy', 2000);
});
$('#copyViewerBtn')?.addEventListener('click', () => {
  navigator.clipboard.writeText($('#viewerLinkInput').value);
  const btn = $('#copyViewerBtn'); btn.textContent = 'Copied!'; setTimeout(()=>btn.textContent='Copy', 2000);
});




/* ==================== HTTP SYNC FALLBACK (Messenger/Firewall Bypass) ==================== */
let httpSyncInterval = null;
window.httpConnected = false;

function startHttpPolling(m, isHost) {
  if (httpSyncInterval) clearInterval(httpSyncInterval);
  
  const syncFn = async () => {
    try {
      if (isHost) {
        const currentM = cm();
        if (currentM && currentM.shareEnabled) {
          await fetch('/api/sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: currentM.id, meeting: currentM })
          });
        }
      } else {
        const res = await fetch('/api/sync?id=' + m.id);
        if (res.ok) {
          const meeting = await res.json();
          window.httpConnected = true;
          
          const idx = state.meetings.findIndex(x => x.id === meeting.id);
          if (idx > -1) state.meetings[idx] = meeting;
          else state.meetings.push(meeting);
          
          originalSaveImmediate();
          
          const loader = document.getElementById('syncLoader');
          if (loader) {
            loader.remove();
            showApp();
          } else {
            refreshUI();
          }
          renderAvatars();
        }
      }
    } catch (e) {
      console.warn("HTTP Sync error:", e);
    }
  };

  syncFn();
  httpSyncInterval = setInterval(syncFn, 3000);
}

// ==================== P2P INTERNET SYNC (PeerJS) ====================
let peer = null;
let p2pConns = [];
let hostConn = null;


const PEER_CONFIG = {
  config: {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:global.stun.twilio.com:3478' }
    ]
  }
};

function initP2P(m, isHost) {
  startHttpPolling(m, isHost);
  if (typeof Peer === 'undefined') {
    setTimeout(() => initP2P(m, isHost), 200);
    return;
  }
  
  if (!window.RTCPeerConnection) {
    alert("Warning: Your browser or app (like Messenger) is blocking Live Sync. Please open this link in standard Safari or Chrome.");
  }
  
  if (peer) { peer.destroy(); peer = null; p2pConns = []; hostConn = null; }
  
  if (isHost && m.shareEnabled) {
    peer = new Peer('clarify-' + m.id, PEER_CONFIG);

    peer.on('call', (call) => {
      if (localStream) call.answer(localStream);
      else call.answer();
      setupCall(call);
    });
    peer.on('error', (err) => {

      console.warn("PeerJS Host Error:", err);
      // If the ID is trapped by a ghost session, we try to aggressively reconnect it.
      if (err.type === 'unavailable-id') {
        setTimeout(() => {
          if (peer && peer.destroyed === false) peer.reconnect();
        }, 2000);
      }
    });
    
    peer.on('connection', (conn) => {
      p2pConns.push(conn);
      conn.on('open', () => { 
        renderAvatars(); 
        if (localStream) {
          const c = peer.call(conn.peer, localStream);
          setupCall(c);
        }
      });
      conn.on('data', (data) => {
        if (data.type === 'REQUEST_STATE') {
          conn.send({ type: 'STATE_PAYLOAD', meeting: cm() });
        }
        if (data.type === 'UPDATE' && data.state) {
          handleIncomingUpdate(data.state);
          // Bounce to other connected viewers
          p2pConns.forEach(c => { if(c !== conn && c.open) c.send(data); });
        }
      });
      conn.on('close', () => { p2pConns = p2pConns.filter(c => c !== conn); renderAvatars(); });
      conn.on('error', () => { p2pConns = p2pConns.filter(c => c !== conn); renderAvatars(); });
    });
  } else if (!isHost) {
    peer = new Peer(PEER_CONFIG);

    peer.on('call', (call) => {
      if (localStream) call.answer(localStream);
      else call.answer();
      setupCall(call);
    });
    peer.on('error', (err) => {

      console.warn("PeerJS Viewer Error:", err);
    });
    
    peer.on('open', () => {
      hostConn = peer.connect('clarify-' + m.id, { reliable: true });
      
      const syncTimeout = setTimeout(() => {
        const loader = document.getElementById('syncLoader');
        if (loader && !window.httpConnected) {
          loader.innerHTML = `<div style="max-width:400px;text-align:center;">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="margin-bottom:16px;color:var(--danger);"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>
            <h3 style="color:var(--text);margin:0 0 8px;">Waiting for Host</h3>
            <p style="margin:0 0 16px;font-size:14px;color:var(--subtle);">The Host hasn't opened this meeting yet, or they are offline.</p>
            <button class="primary-btn" onclick="window.location.search='';">Go to Home</button>
          </div>`;
        }
      }, 8000);

      hostConn.on('open', () => {
        hostConn.send({ type: 'REQUEST_STATE', id: m.id });
        renderAvatars();
      });
      hostConn.on('data', (data) => {
        if (data.type === 'STATE_PAYLOAD') {
          clearTimeout(syncTimeout);
          const idx = state.meetings.findIndex(x => x.id === data.meeting.id);
          if (idx > -1) state.meetings[idx] = data.meeting;
          else state.meetings.push(data.meeting);
          originalSaveImmediate();
          refreshUI();
        }
        if (data.type === 'UPDATE' && data.state) {
          handleIncomingUpdate(data.state);
        }
      });
      hostConn.on('close', () => {
        clearTimeout(syncTimeout);
        renderAvatars();
        const loader = document.getElementById('syncLoader');
        if (loader) loader.textContent = 'Host disconnected. Meeting is offline.';
      });
      hostConn.on('error', () => {
        clearTimeout(syncTimeout);
        renderAvatars();
      });
    });
  }
}

function handleIncomingUpdate(incomingState) {
  state = Object.assign(state, incomingState);
  state.meetings = (state.meetings || []).map(normalizeMeeting);
  originalSaveImmediate();
  refreshUI();
}

function broadcastUpdate() {
  const payload = { type: 'UPDATE', state: state };
  if ((hostConn && hostConn.open) || window.httpConnected) {
    hostConn.send(payload);
  } else {
    p2pConns.forEach(c => { if(c.open) c.send(payload); });
  }
  
  // Instant HTTP Fallback push
  const currentM = cm();
  if (currentM && currentM.shareEnabled) {
    fetch('/api/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: currentM.id, meeting: currentM })
    }).catch(()=>{});
  }
}

function refreshUI() {
  const loader = document.getElementById('syncLoader');
  if (loader) loader.remove();
  
  appEl.style.display = '';
  if (state.currentId) {
    const m = state.meetings.find(x => x.id === state.currentId);
    if (!m) { showHome(); return; }
    
    renderMeetingHeader();
    renderAgenda();
    renderFocus(false);
    refreshNotesPreview();
    if (document.getElementById('workPanel')?.classList.contains('show')) {
      renderActions();
    }
  } else {
    if (!document.getElementById('homeScreen').classList.contains('hidden')) {
      renderHome();
      if (typeof renderTeams === 'function') renderTeams();
    }
  }
}

// Hook into save
const originalSaveImmediate = saveImmediate;
saveImmediate = () => {
  originalSaveImmediate();
  broadcastUpdate();
};

const originalSave = save;
save = () => {
  originalSave();
  broadcastUpdate();
};

function renderAvatars() {
  const presence = document.getElementById('userPresence');
  if (!presence) return;
  
  const m = cm();
  let connectionCount = 0;
  
  if (hostConn && hostConn.open) {
    // If we are a viewer connected to the host
    connectionCount = 1;
  } else if (p2pConns) {
    // If we are the host, count open connections
    connectionCount = p2pConns.filter(c => c.open).length;
  }

  if (connectionCount > 0 && m && m.shareEnabled) {
    presence.style.display = 'flex';
    
    // Generate realistic realistic avatars based on count
    let html = '';
    const colors = ['#4f46e5', '#059669', '#ea580c', '#db2777', '#ca8a04'];
    const initialsList = ['JD', 'AK', 'MR', 'SL', 'TJ'];
    
    // We max out at 3 individual avatars, then show a "+X" bubble
    const showCount = Math.min(connectionCount, 3);
    for (let i = 0; i < showCount; i++) {
      html += `<div class="avatar" style="background:${colors[i % colors.length]}; z-index:${3 - i};">${initialsList[i % initialsList.length]}</div>`;
    }
    if (connectionCount > 3) {
      html += `<div class="avatar" style="background:#6b7280; z-index:0;">+${connectionCount - 3}</div>`;
    }
    presence.innerHTML = html;
  } else {
    presence.style.display = 'none';
  }
}

/* ========================================================================= */


const MEETING_TEMPLATES = {
  '1on1': {
    title: '1:1 Check-in',
    items: [
      { title: 'Personal update / Icebreaker', limitMin: 5 },
      { title: 'Wins & highlights', limitMin: 10 },
      { title: 'Roadblocks & challenges', limitMin: 10 },
      { title: 'Feedback & next steps', limitMin: 5 }
    ]
  },
  'standup': {
    title: 'Weekly Standup',
    items: [
      { title: 'What did we accomplish last week?', limitMin: 5 },
      { title: 'What are the priorities this week?', limitMin: 10 },
      { title: 'Any blockers?', limitMin: 5 }
    ]
  },
  'discovery': {
    title: 'Client Discovery',
    items: [
      { title: 'Introductions & agenda', limitMin: 5 },
      { title: 'Current challenges & pain points', limitMin: 15 },
      { title: 'Our proposed solution', limitMin: 15 },
      { title: 'Budget & timeline', limitMin: 10 },
      { title: 'Next steps & Q&A', limitMin: 5 }
    ]
  },
  'retro': {
    title: 'Sprint Retrospective',
    items: [
      { title: 'What went well?', limitMin: 10 },
      { title: 'What could be improved?', limitMin: 10 },
      { title: 'Action items for next sprint', limitMin: 10 }
    ]
  }
};


function injectPreMeetingBrief(newMeeting) {
  // Find all past meetings with the exact same title
  const pastMeetings = state.meetings.filter(m => m.title.toLowerCase() === newMeeting.title.toLowerCase() && m.id !== newMeeting.id);
  
  let pendingTasks = [];
  pastMeetings.forEach(m => {
    m.tasks.forEach(t => {
      if (t.status === 'ongoing') {
        const d = new Date(m.date + 'T00:00');
        const formattedDate = d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
        pendingTasks.push(`- [ ] ${t.name} (assigned ${formattedDate})`);
      }
    });
  });

  if (pendingTasks.length > 0) {
    const briefNotes = `✨ **AI Context Engine:** Found ${pendingTasks.length} unresolved action items from previous '${newMeeting.title}' meetings.\n\n` + pendingTasks.join('\n');
    
    // Inject at the beginning
    newMeeting.items.unshift({
      id: uid(),
      title: '🧠 Pre-Meeting Brief',
      notes: briefNotes,
      limitMin: 5
    });
    newMeeting.activeId = newMeeting.items[0].id;
  }
}

function createMeeting() {
  let title = meetingTitleInput.value.trim();
  const templateKey = $('#meetingTemplateInput') ? $('#meetingTemplateInput').value : 'none';
  const template = MEETING_TEMPLATES[templateKey];
  
  if (!title) {
    title = template ? template.title : 'Untitled meeting';
  }

  const m = newMeeting(title, pickedISO);
  
  if (template) {
    template.items.forEach(it => {
      m.items.push({ id: uid(), title: it.title, notes: '', limitMin: it.limitMin });
    });
    if (m.items.length > 0) m.activeId = m.items[0].id;
  }
  
  injectPreMeetingBrief(m);
  
  const teamVal = $('#meetingVisibility').value;
  m.teamId = teamVal === 'private' ? null : teamVal;
  m.visibility = m.teamId ? 'team' : 'private';
  // initial status: scheduled if future, else ongoing
  m.status = (pickedISO > todayISO()) ? 'scheduled' : 'ongoing';
  m.lastOpenedAt = new Date().toISOString();
  state.meetings.push(m);
  state.currentId = m.id;
  saveImmediate();
  closeNewMeeting();
  showApp();
}

/* ============================== WORKSPACE ================================ */
const agendaListEl = $('#agendaList');
const newItemInput = $('#newItemInput');
const focusInner   = $('#focusInner');
const crumbEl      = $('#crumb');
const meetingMeta  = $('#meetingMeta');
const notesArea    = $('#notesArea');
const saveStatus   = $('#saveStatus');
function setSaveStatus(s) {
  // s: 'saving' | 'saved'
  if (s === 'saving') {
    saveStatus.textContent = 'Saving…';
    saveStatus.classList.add('is-saving');
    saveStatus.classList.remove('is-saved');
  } else {
    saveStatus.textContent = 'Saved';
    saveStatus.classList.add('is-saved');
    saveStatus.classList.remove('is-saving');
  }
}
const actionBadge  = $('#actionBadge');
const limitInput   = $('#limitInput');
const meetingTitleDisplay = $('#meetingTitleDisplay');
const meetingDateDisplay  = $('#meetingDateDisplay');

function renderMeetingHeader() {
  const m = cm(); if (!m) return;
  const team = m.teamId ? (state.teams||[]).find(t => t.id === m.teamId) : null;
  $('#topbarShareBtn').textContent = team ? 'Shared: ' + team.name : 'Share';
  renderAvatars();
  meetingTitleDisplay.textContent = m.title || '';
  meetingDateDisplay.innerHTML = `
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
    ${escapeHTML(formatDateLong(m.date))}
    <span class="status-tag ${m.status}" style="margin-left:6px;">${m.status}</span>
  `;
  $('#endMeetingBtn').textContent = m.status === 'done' ? 'Reopen meeting' : 'Mark as done ✓';
}
meetingTitleDisplay.addEventListener('input', () => {
  const m = cm(); if (!m) return;
  m.title = meetingTitleDisplay.textContent.trim(); save();
});
meetingTitleDisplay.addEventListener('keydown', e => {
  if (e.key === 'Enter') { e.preventDefault(); meetingTitleDisplay.blur(); }
});
meetingTitleDisplay.addEventListener('blur', () => {
  const m = cm(); if (!m) return;
  if (!m.title) { m.title = 'Untitled meeting'; meetingTitleDisplay.textContent = m.title; save(); }
});

$('#backHome').addEventListener('click', () => {
  saveImmediate();
  showHome();
});
$('#endMeetingBtn').addEventListener('click', async () => {
  const m = cm(); if (!m) return;
  
  if (m.status === 'done') {
    m.status = 'ongoing';
    m.endedAt = null;
    startSession();
    saveImmediate();
    renderMeetingHeader();
    updateTimer();
    return;
  }
  
  // Marking Done -> Run Auto-Enhance Sweep
  const btn = $('#endMeetingBtn');
  const originalText = btn.innerHTML;
  btn.innerHTML = '<span style="display:flex;align-items:center;gap:6px;"><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg> Enhancing...</span>';
  btn.style.pointerEvents = 'none';
  if ($('#notesArea')) $('#notesArea').classList.add('textarea-enhancing');
  if ($('#taskNotesArea')) $('#taskNotesArea').classList.add('textarea-enhancing');

  let enhancePromises = [];

  m.items.forEach(item => {
    if (item.notes && item.notes.trim() && !item.notes.includes('✨ **Enhanced Summary')) {
      enhancePromises.push(
        simulateAIEnhance(item.notes).then(res => { item.notes = res; })
      );
    }
  });

  m.tasks.forEach(task => {
    if (task.notes && task.notes.trim() && !task.notes.includes('✨ **Enhanced Summary')) {
      enhancePromises.push(
        simulateAIEnhance(task.notes).then(res => { task.notes = res; })
      );
    }
  });

  if ($('#notesArea')) $('#notesArea').classList.remove('textarea-enhancing');
  if ($('#taskNotesArea')) $('#taskNotesArea').classList.remove('textarea-enhancing');

  if (enhancePromises.length > 0) {
    await Promise.all(enhancePromises);
  }

  if (typeof pauseSession === 'function') pauseSession();
  m.status = 'done';
  m.endedAt = new Date().toISOString();
  saveImmediate();
  
  renderMeetingHeader();
  updateTimer();
  refreshNotesPreview();
  
  if (activeItem() && $('#notesArea')) {
    $('#notesArea').value = activeItem().notes || '';
  }
});

/* ------------------ Agenda ------------------ */
function renderAgenda() {
  const m = cm(); if (!m) return;
  agendaListEl.innerHTML = '';
  m.items.forEach((item, idx) => {
    const row = document.createElement('div');
    const isActive = item.id === m.activeId;
    row.className = 'agenda-item' + (isActive ? ' active' : '');
    row.draggable = true;
    row.dataset.id = item.id;
    row.setAttribute('role', 'button');
    row.setAttribute('tabindex', '0');
    row.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    row.setAttribute('aria-label', `Topic ${idx + 1}: ${item.title || 'Untitled'}`);
    row.innerHTML = `
      <span class="agenda-handle" title="Drag to reorder" aria-hidden="true">
        <svg width="10" height="14" viewBox="0 0 10 14" fill="currentColor"><circle cx="2" cy="2" r="1.2"/><circle cx="2" cy="7" r="1.2"/><circle cx="2" cy="12" r="1.2"/><circle cx="8" cy="2" r="1.2"/><circle cx="8" cy="7" r="1.2"/><circle cx="8" cy="12" r="1.2"/></svg>
      </span>
      <span class="agenda-index">${idx + 1}</span>
      <span class="agenda-title" data-id="${item.id}">${escapeHTML(item.title || 'Untitled')}</span>
      <span class="agenda-meta">${item.limitMin ? item.limitMin+'m' : ''}</span>
      <span class="agenda-actions">
        <button class="mini-btn" data-act="edit" title="Rename" aria-label="Rename topic">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/></svg>
        </button>
        <button class="mini-btn" data-act="del" title="Delete" aria-label="Delete topic">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-2 14a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2L5 6"/></svg>
        </button>
      </span>
    `;
    agendaListEl.appendChild(row);
  });
  meetingMeta.textContent = m.items.length;
}

function renderFocus(animate=true) {
  const m = cm(); if (!m) return;
  const item = activeItem();
  const doRender = () => {
    if (!item) {
      focusInner.innerHTML = `
        <div class="empty">
          <h2>Ready when you are.</h2>
          <p>Add agenda items on the left to begin. Click one to bring it into focus.</p>
        </div>`;
      crumbEl.textContent = 'Meeting';
      notesArea.value = ''; limitInput.value = '';
      renderActions(); return;
    }
    const idx = m.items.indexOf(item) + 1;
    const notes = (item.notes || '').trim();
    const hasNotes = notes.length > 0;
    focusInner.innerHTML = `
      <div class="focus-eyebrow">Topic ${idx} of ${m.items.length}</div>
      <h1 class="focus-title" contenteditable="true" spellcheck="false"
          data-placeholder="Untitled topic">${escapeHTML(item.title)}</h1>
      <p class="focus-sub"><kbd>A</kbd> action items · <kbd>←</kbd> <kbd>→</kbd> topics · <kbd>?</kbd> help</p>
      <div class="notes-preview" id="notesPreview" role="button" tabindex="0" aria-label="Open summary and tasks side by side" title="Click to open workspace">
        <div class="notes-preview-label">
          <span style="display:flex; align-items:center; gap:6px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
            General Summary
          </span>
          <span class="open-hint">
            Open workspace
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="8" height="16" rx="1"/><rect x="13" y="4" width="8" height="16" rx="1"/></svg>
          </span>
        </div>
        <div class="notes-preview-text ${hasNotes?'':'is-empty'}">${hasNotes ? escapeHTML(notes) : 'No summary provided yet. Click here to start capturing key discussion points.'}</div>
      </div>
    `;
    crumbEl.textContent = `Topic ${idx} / ${m.items.length}`;
    notesArea.value = item.notes || '';
    limitInput.value = item.limitMin || '';
    bindFocusTitle();
    bindNotesPreview();
    renderActions();
  };
  if (animate) {
    focusInner.classList.add('swap');
    setTimeout(() => {
      doRender();
      requestAnimationFrame(() => focusInner.classList.remove('swap'));
    }, 180);
  } else doRender();
}
function bindFocusTitle() {
  const t = $('.focus-title', focusInner);
  if (!t) return;
  t.addEventListener('input', () => {
    const item = activeItem(); if (!item) return;
    item.title = t.textContent.trim();
    save();
    const side = agendaListEl.querySelector(`.agenda-title[data-id="${item.id}"]`);
    if (side) side.textContent = item.title || 'Untitled';
  });
  t.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); t.blur(); } });
}

function bindNotesPreview() {
  const p = $('#notesPreview');
  if (!p) return;
  const open = () => { openWorkspace('notes'); setTimeout(() => notesArea.focus(), 240); };
  p.addEventListener('click', open);
  p.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); }
  });
}

function refreshNotesPreview() {
  const p = $('#notesPreview'); if (!p) return;
  const item = activeItem(); if (!item) return;
  const notes = (item.notes || '').trim();
  const textEl = p.querySelector('.notes-preview-text');
  if (!textEl) return;
  if (notes) {
    textEl.classList.remove('is-empty');
    textEl.textContent = notes;
  } else {
    textEl.classList.add('is-empty');
    textEl.textContent = 'No summary provided yet. Click here to start capturing key discussion points.';
  }
}


/* -------- AI Enhance Simulation -------- */
async function simulateAIEnhance(rawText) {
  if (!rawText.trim()) return rawText;
  
  try {
    // 1. Attempt to hit Vercel Serverless Function
    const res = await fetch('/api/enhance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: rawText })
    });
    
    if (res.ok) {
      const data = await res.json();
      return data.enhanced;
    }
  } catch(e) {
    console.warn("Vercel backend not found. Falling back to local JS simulation.");
  }
  
  // 2. Local Fallback (if running offline without Vercel)
  return new Promise(resolve => {
    setTimeout(() => {
      let lines = rawText.split(/\n|,|;/).map(s => s.trim()).filter(s => s.length > 2);
      if (lines.length === 0) return resolve(rawText);
      let enhanced = lines.map(l => "- " + l.charAt(0).toUpperCase() + l.slice(1) + (l.endsWith('.') ? '' : '.')).join('\n');
      resolve("✨ **Enhanced Summary (Local Fallback):**\n\n" + enhanced);
    }, 1200);
  });
}

const enhanceTopicBtn = document.getElementById('enhanceTopicBtn');
const enhanceTaskBtn = document.getElementById('enhanceTaskBtn');

if (enhanceTopicBtn) {
  enhanceTopicBtn.addEventListener('click', async () => {
    const item = activeItem(); if (!item) return;
    const raw = item.notes || '';
    if (!raw.trim()) return;
    
    enhanceTopicBtn.classList.add('enhancing');
    enhanceTopicBtn.innerHTML = 'Enhancing...';
    let elNotesArea = document.getElementById('notesArea');
    if (elNotesArea) elNotesArea.classList.add('textarea-enhancing');
    
    const polished = await simulateAIEnhance(raw);
    
    if (elNotesArea) elNotesArea.classList.remove('textarea-enhancing');
    item.notes = polished;
    if (elNotesArea) elNotesArea.value = polished;
    
    saveImmediate();
    refreshNotesPreview();
    updateNotesMeta();
    
    enhanceTopicBtn.classList.remove('enhancing');
    enhanceTopicBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 6 6 3-6 3-3 6-3-6-6-3 6-3z"></path></svg> Enhanced';
    setTimeout(() => {
      enhanceTopicBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 6 6 3-6 3-3 6-3-6-6-3 6-3z"></path></svg> Enhance';
    }, 2000);
  });
}

if (enhanceTaskBtn) {
  enhanceTaskBtn.addEventListener('click', async () => {
    if (!activeTaskForNotes) return;
    const raw = activeTaskForNotes.notes || '';
    if (!raw.trim()) return;
    
    enhanceTaskBtn.classList.add('enhancing');
    enhanceTaskBtn.innerHTML = 'Enhancing...';
    let elTaskNotesArea = document.getElementById('taskNotesArea');
    if (elTaskNotesArea) elTaskNotesArea.classList.add('textarea-enhancing');
    
    const polished = await simulateAIEnhance(raw);
    
    if (elTaskNotesArea) elTaskNotesArea.classList.remove('textarea-enhancing');
    activeTaskForNotes.notes = polished;
    if (elTaskNotesArea) elTaskNotesArea.value = polished;
    
    saveImmediate();
    updateNotesMeta();
    
    enhanceTaskBtn.classList.remove('enhancing');
    enhanceTaskBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 6 6 3-6 3-3 6-3-6-6-3 6-3z"></path></svg> Enhanced';
    setTimeout(() => {
      enhanceTaskBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3 6 6 3-6 3-3 6-3-6-6-3 6-3z"></path></svg> Enhance';
    }, 2000);
  });
}

/* -------- Sliding Notes column (topic ↔ selected task) -------- */
const notesColBody  = $('#notesColBody');
const taskNotesArea = $('#taskNotesArea');
const taskNotesTarget = $('#taskNotesTarget');
const topicNotesTarget = $('#topicNotesTarget');
let activeTaskForNotes = null;
const taskSaveTimers = {};

function slideTaskNotesIn(t) {
  activeTaskForNotes = t;
  taskNotesArea.value = t.notes || '';
  taskNotesTarget.textContent = '› ' + (t.name || 'Untitled task');
  notesColBody.classList.add('task-active');
  // ensure notes column is focused (accent strip)
  colNotes.classList.add('focused');
  colActions.classList.remove('focused');
  updateNotesMeta();
}
function slideTaskNotesOut() {
  notesColBody.classList.remove('task-active');
  activeTaskForNotes = null;
  updateNotesMeta();
}
function updateNotesMeta() {
  const meta = $('#notesColMeta');
  const item = activeItem();
  if (!meta) return;
  if (activeTaskForNotes) {
    const wc = (activeTaskForNotes.notes||'').trim().split(/\s+/).filter(Boolean).length;
    meta.textContent = wc ? `Task · ${wc} word${wc===1?'':'s'}` : 'Task notes';
  } else if (item) {
    const wc = (item.notes||'').trim().split(/\s+/).filter(Boolean).length;
    meta.textContent = wc ? `Topic · ${wc} word${wc===1?'':'s'}` : 'General Summary';
  } else {
    meta.textContent = 'Per‑topic';
  }
}

taskNotesArea.addEventListener('input', () => {
  if (!activeTaskForNotes) return;
  activeTaskForNotes.notes = taskNotesArea.value;
  setSaveStatus('saving');
  clearTimeout(taskSaveTimers.active);
  taskSaveTimers.active = setTimeout(() => {
    save(); setSaveStatus('saved');
    updateNotesMeta();
    // refresh badge dots on the task card without disrupting cursor — re-render is OK because focus stays on textarea via re-bind
    renderActions();
    // restore focus + caret after re-render
    const ta = $('#taskNotesArea');
    if (ta && document.activeElement !== ta) ta.focus();
  }, 400);
});
taskNotesArea.addEventListener('blur', () => { save(); updateNotesMeta(); });

$('#notesBackBtn').addEventListener('click', () => {
  const m = cm(); if (!m) return;
  if (m.selectedTaskId) { delete m.expandedTasks[m.selectedTaskId]; m.selectedTaskId = null; save(); renderActions(); }
  slideTaskNotesOut();
  setTimeout(() => notesArea.focus(), 200);
});

/* ------------------ Actions ------------------ */
function renderActions() {
  const m = cm(); if (!m) return;
  const localList = $('#actionListLocal');
  const item = activeItem();
  const local = item ? m.tasks.filter(t => t.itemId === item.id) : [];
  const all   = m.tasks;

  const topicHeader = $('#topicHeader');
  topicHeader.innerHTML = item ? `
    <div class="topic-header">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      Adding to: <strong>${escapeHTML(item.title || 'Untitled')}</strong>
    </div>` : `
    <div class="topic-header" style="background:var(--surface-2); color:var(--muted);">
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      Select an agenda item first.
    </div>`;

  localList.innerHTML = '';
  if (!local.length) {
    localList.innerHTML = item
      ? `<div class="empty-list">No tasks for this topic yet. Add one above ↑</div>`
      : `<div class="empty-list">Pick a topic to view its tasks.</div>`;
  } else local.forEach(t => localList.appendChild(taskCard(t, false)));
  $('#localCount').textContent = local.length;

  const counts = { all: all.length, ongoing: 0, done: 0, abandoned: 0 };
  all.forEach(t => counts[t.status] !== undefined && counts[t.status]++);

  actionBadge.textContent = all.length;
  actionBadge.classList.toggle('zero', all.length === 0);

  const taskCountText = item
    ? `${local.length} in this topic · ${all.length} total`
    : `${all.length} total task${all.length===1?'':'s'}`;
  $('#taskCount').textContent = taskCountText;

  const actionsColMeta = $('#actionsColMeta');
  if (actionsColMeta) {
    actionsColMeta.textContent = item
      ? `${local.length} here · ${all.length} total`
      : `${all.length} total`;
  }

  // Summary target label (shows which topic these notes belong to)
  if (topicNotesTarget) topicNotesTarget.textContent = item ? '› ' + (item.title || 'Untitled') : '';

  // Keep sliding state in sync with selectedTaskId
  if (m.selectedTaskId) {
    const t = m.tasks.find(x => x.id === m.selectedTaskId);
    if (t) {
      // sync content if pane is showing this task
      if (!activeTaskForNotes || activeTaskForNotes.id !== t.id) {
        activeTaskForNotes = t;
        taskNotesArea.value = t.notes || '';
        taskNotesTarget.textContent = '› ' + (t.name || 'Untitled task');
      } else {
        taskNotesTarget.textContent = '› ' + (t.name || 'Untitled task');
      }
      notesColBody?.classList.add('task-active');
    } else {
      m.selectedTaskId = null;
      slideTaskNotesOut();
    }
  } else {
    notesColBody?.classList.remove('task-active');
    activeTaskForNotes = null;
  }
  updateNotesMeta();
  updateWorkspaceLayout();
}

function taskCard(t, showTopic=false) {
  const m = cm();
  const el = document.createElement('div');
  const expanded = !!m.expandedTasks[t.id];
  el.className = `action-card status-${t.status}` + (expanded ? ' expanded' : '');
  el.dataset.id = t.id;
  const item = m.items.find(i => i.id === t.itemId);
  const linkCount = (t.links || []).length;
  const hasNotes = !!(t.notes && t.notes.trim());

  const meta = [
    t.owner ? `<span class="meta-chip">👤 ${escapeHTML(t.owner)}</span>` : '',
    t.due ? `<span class="meta-chip">📅 ${formatDateShort(t.due)}</span>` : '',
    (showTopic && item) ? `<span class="agenda-tag">› ${escapeHTML(item.title || 'Untitled')}</span>` : '',
    hasNotes ? `<span class="note-dot" title="Has notes"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg></span>` : '',
    linkCount ? `<span class="link-count" title="${linkCount} link${linkCount===1?'':'s'}"><svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>${linkCount}</span>` : '',
  ].filter(Boolean).join('');

  const checkSvg = t.status === 'done'
    ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
    : t.status === 'abandoned'
    ? '<svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6L6 18M6 6l12 12"/></svg>'
    : '';

  el.innerHTML = `
    <div class="action-row" data-act="toggle-expand">
      <button class="action-check" data-act="cycle" title="Cycle status">${checkSvg}</button>
      <div class="action-body">
        <div class="action-name">${escapeHTML(t.name)}</div>
        ${meta ? `<div class="action-meta">${meta}</div>` : ''}
      </div>
      <span class="status-pill ${t.status}">${t.status}</span>
      <button class="delete-btn" data-act="del" title="Delete task">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
      </button>
      <svg class="chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
    </div>
    ${expanded ? renderExpand(t) : ''}
  `;

  el.querySelector('[data-act="toggle-expand"]').addEventListener('click', (e) => {
    if (e.target.closest('[data-act="cycle"]') || e.target.closest('[data-act="del"]')) return;
    const wasExpanded = !!m.expandedTasks[t.id];
    // collapse any other expanded task so only one task is "selected" at a time
    Object.keys(m.expandedTasks).forEach(k => { if (k !== t.id) delete m.expandedTasks[k]; });
    m.expandedTasks[t.id] = !wasExpanded;
    if (m.expandedTasks[t.id]) {
      m.selectedTaskId = t.id;
      slideTaskNotesIn(t);
    } else if (m.selectedTaskId === t.id) {
      m.selectedTaskId = null;
      slideTaskNotesOut();
    }
    save(); renderActions();
  });
  el.querySelector('[data-act="cycle"]').addEventListener('click', (e) => {
    e.stopPropagation();
    const idx = STATUSES.indexOf(t.status);
    t.status = STATUSES[(idx + 1) % STATUSES.length];
    save(); renderActions();
  });
  el.querySelector('[data-act="del"]').addEventListener('click', (e) => {
    e.stopPropagation();
    if (confirm(`Delete task "${t.name}"?`)) {
      m.tasks = m.tasks.filter(x => x.id !== t.id);
      delete m.expandedTasks[t.id];
      if (m.selectedTaskId === t.id) { m.selectedTaskId = null; slideTaskNotesOut(); }
      save(); renderActions();
    }
  });
  if (expanded) wireExpand(el, t);
  return el;
}

function renderExpand(t) {
  const links = t.links || [];
  return `
    <div class="action-expand">
      <div>
        <div class="field-label">
          <span>Status</span>
          <span style="color:var(--subtle);font-weight:500;text-transform:none;letter-spacing:0;font-size:11px;">
            Notes for this task slide in on the left ←
          </span>
        </div>
        <select class="status-select" data-task="${t.id}" data-field="status">
          <option value="ongoing"   ${t.status==='ongoing'?'selected':''}>Ongoing</option>
          <option value="done"      ${t.status==='done'?'selected':''}>Done</option>
          <option value="abandoned" ${t.status==='abandoned'?'selected':''}>Abandoned</option>
        </select>
      </div>
      <div>
        <div class="field-label">
          <span>Links &amp; Attachments</span>
          <span style="color:var(--subtle);font-weight:500;text-transform:none;letter-spacing:0;font-size:11px;">${links.length} item${links.length===1?'':'s'}</span>
        </div>
        <div class="links-list" id="links-${t.id}">
          ${links.length ? links.map(l => linkRowHTML(t.id, l)).join('') : '<div class="empty-list" style="padding:8px;">No links yet.</div>'}
        </div>
        <div class="link-form" data-task="${t.id}">
          <input data-link-field="label" placeholder="Label (optional)" />
          <input data-link-field="url" placeholder="URL or /path/to/folder" />
          <button data-link-add>+ Add</button>
        </div>
        <div class="link-hint">
          Tip: paste a URL (https://…), a local file path (e.g. <code>/Users/me/Docs</code> or <code>C:\\Projects</code>),
          or a UNC share. Local <code>file://</code> links may need to be opened from your file manager.
        </div>
      </div>
    </div>
  `;
}
function linkRowHTML(taskId, l) {
  const href = normalizeHref(l.url);
  const local = isLocalLink(href);
  const display = l.label && l.label.trim() ? l.label : (local ? linkDisplay(href) : (linkHostname(href) || href));
  const sub = local ? linkDisplay(href) : href;
  return `
    <div class="link-row" data-link-id="${l.id}" data-task="${taskId}">
      <span class="link-icon" title="${local ? 'Local folder/file' : 'Web link'}">
        ${local
          ? '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>'
          : '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'}
      </span>
      <a class="link-text" href="${escapeAttr(href)}" target="_blank" rel="noopener" title="${escapeAttr(href)}">
        <div class="link-label">${escapeHTML(display)}</div>
        ${l.label && sub && sub !== display ? `<div class="link-url">${escapeHTML(sub)}</div>` : ''}
      </a>
      <div class="link-actions">
        <button class="mini-btn" data-link-act="copy" title="Copy path">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </button>
        <button class="mini-btn" data-link-act="del" title="Remove link">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>
        </button>
      </div>
    </div>
  `;
}

function wireExpand(cardEl, t) {
  const m = cm();
  const sel = cardEl.querySelector(`select[data-task="${t.id}"]`);
  sel?.addEventListener('change', () => { t.status = sel.value; save(); renderActions(); });

  const form = cardEl.querySelector(`.link-form[data-task="${t.id}"]`);
  const labelInp = form?.querySelector('[data-link-field="label"]');
  const urlInp   = form?.querySelector('[data-link-field="url"]');
  const addBtn   = form?.querySelector('[data-link-add]');
  const addLink = () => {
    const url = urlInp.value.trim(); if (!url) return;
    t.links = t.links || [];
    t.links.push({ id: uid(), label: labelInp.value.trim(), url });
    labelInp.value = ''; urlInp.value = '';
    save(); renderActions();
  };
  addBtn?.addEventListener('click', addLink);
  urlInp?.addEventListener('keydown', e => { if (e.key==='Enter') addLink(); });
  labelInp?.addEventListener('keydown', e => { if (e.key==='Enter') addLink(); });

  cardEl.querySelectorAll('.link-row').forEach(row => {
    const linkId = row.dataset.linkId;
    row.querySelector('[data-link-act="del"]')?.addEventListener('click', (e) => {
      e.preventDefault(); e.stopPropagation();
      t.links = (t.links || []).filter(l => l.id !== linkId);
      save(); renderActions();
    });
    row.querySelector('[data-link-act="copy"]')?.addEventListener('click', async (e) => {
      e.preventDefault(); e.stopPropagation();
      const l = (t.links || []).find(x => x.id === linkId); if (!l) return;
      const href = normalizeHref(l.url);
      try {
        await navigator.clipboard.writeText(href);
        const btn = e.currentTarget; const orig = btn.innerHTML;
        btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>';
        setTimeout(() => btn.innerHTML = orig, 1200);
      } catch { prompt('Copy this:', href); }
    });
  });
}

/* ------------------ Workspace events ------------------ */
newItemInput.addEventListener('keydown', e => {
  const m = cm(); if (!m) return;
  if (e.key === 'Enter' && newItemInput.value.trim()) {
    e.preventDefault();
    const item = { id: uid(), title: newItemInput.value.trim(), notes: '', limitMin: 0 };
    m.items.push(item);
    m.activeId = item.id;
    m.selectedTaskId = null;
    Object.keys(m.expandedTasks).forEach(k => delete m.expandedTasks[k]);
    newItemInput.value = '';
    save(); 
    renderAgenda(); 
    renderFocus(false);
    slideTaskNotesOut();
    openWorkspace('actions');
    setTimeout(() => {
      const taskInput = $('#taskName');
      if (taskInput) taskInput.focus();
    }, 240);
  }
});

agendaListEl.addEventListener('click', e => {
  const m = cm(); if (!m) return;
  const row = e.target.closest('.agenda-item'); if (!row) return;
  const id = row.dataset.id;
  const actBtn = e.target.closest('[data-act]');
  if (actBtn) {
    const act = actBtn.dataset.act;
    if (act === 'del') {
      if (!confirm('Delete this agenda item and its tasks?')) return;
      m.items = m.items.filter(i => i.id !== id);
      m.tasks = m.tasks.filter(t => t.itemId !== id);
      if (m.activeId === id) m.activeId = m.items[0]?.id || null;
      save(); renderAgenda(); renderFocus(false);
    } else if (act === 'edit') {
      const titleEl = row.querySelector('.agenda-title');
      titleEl.contentEditable = 'true';
      titleEl.focus();
      document.getSelection().selectAllChildren(titleEl);
      titleEl.addEventListener('blur', () => {
        titleEl.contentEditable = 'false';
        const item = m.items.find(i => i.id === id);
        if (item) { item.title = titleEl.textContent.trim() || 'Untitled'; save(); renderAgenda(); if (item.id===m.activeId) renderFocus(false); }
      }, { once: true });
      titleEl.addEventListener('keydown', ev => { if (ev.key === 'Enter') { ev.preventDefault(); titleEl.blur(); } });
    }
    return;
  }
  if (m.activeId !== id) {
    m.activeId = id;
    // Switching topics: clear any task selection so notes slide back to topic
    m.selectedTaskId = null;
    Object.keys(m.expandedTasks).forEach(k => delete m.expandedTasks[k]);
    save(); renderAgenda(); renderFocus(true);
    slideTaskNotesOut();
  }
});

agendaListEl.addEventListener('keydown', e => {
  if (e.key !== 'Enter' && e.key !== ' ') return;
  const row = e.target.closest('.agenda-item'); if (!row) return;
  // Ignore when focus is on an inner control or while editing the title
  if (e.target !== row) return;
  const titleEl = row.querySelector('.agenda-title');
  if (titleEl && titleEl.getAttribute('contenteditable') === 'true') return;
  e.preventDefault();
  const m = cm(); if (!m) return;
  const id = row.dataset.id;
  if (m.activeId !== id) {
    m.activeId = id;
    m.selectedTaskId = null;
    Object.keys(m.expandedTasks).forEach(k => delete m.expandedTasks[k]);
    save(); renderAgenda(); renderFocus(true);
    slideTaskNotesOut();
    // Keep focus on the corresponding row after re-render
    const again = agendaListEl.querySelector(`.agenda-item[data-id="${id}"]`);
    again?.focus();
  }
});

let dragId = null;
agendaListEl.addEventListener('dragstart', e => {
  const row = e.target.closest('.agenda-item'); if (!row) return;
  dragId = row.dataset.id; row.classList.add('dragging');
});
agendaListEl.addEventListener('dragend', () => {
  $$('.agenda-item').forEach(r => r.classList.remove('dragging','drag-over'));
  dragId = null;
});
agendaListEl.addEventListener('dragover', e => {
  e.preventDefault();
  const row = e.target.closest('.agenda-item');
  $$('.agenda-item').forEach(r => r.classList.remove('drag-over'));
  if (row && row.dataset.id !== dragId) row.classList.add('drag-over');
});
agendaListEl.addEventListener('drop', e => {
  e.preventDefault();
  const m = cm(); if (!m) return;
  const row = e.target.closest('.agenda-item');
  if (!row || !dragId || row.dataset.id === dragId) return;
  const from = m.items.findIndex(i => i.id === dragId);
  const to   = m.items.findIndex(i => i.id === row.dataset.id);
  const [mv] = m.items.splice(from, 1);
  m.items.splice(to, 0, mv);
  save(); renderAgenda();
});

let saveTimer;
notesArea.addEventListener('input', () => {
  const item = activeItem(); if (!item) return;
  item.notes = notesArea.value;
  setSaveStatus('saving');
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { save(); setSaveStatus('saved'); refreshNotesPreview(); }, 350);
});
notesArea.addEventListener('blur', refreshNotesPreview);
limitInput.addEventListener('change', () => {
  const item = activeItem(); if (!item) return;
  item.limitMin = parseInt(limitInput.value, 10) || 0;
  save(); renderAgenda();
});

$('#addTaskBtn').addEventListener('click', addTask);
$('#taskName').addEventListener('keydown', e => { if (e.key==='Enter') addTask(); });
$('#taskOwner').addEventListener('keydown', e => { if (e.key==='Enter') addTask(); });
function addTask() {
  const m = cm(); if (!m) return;
  const name = $('#taskName').value.trim(); if (!name) return;
  if (!m.activeId) { alert('Please select an agenda item first.'); return; }
  m.tasks.push({
    id: uid(), name,
    owner: $('#taskOwner').value.trim(),
    due:   $('#taskDate').value,
    status: 'ongoing', notes: '', links: [],
    itemId: m.activeId,
  });
  $('#taskName').value = ''; $('#taskOwner').value = ''; $('#taskDate').value = '';
  save(); renderActions();
}

/* ---------- Unified workspace panel (Notes + Actions side by side) ---------- */
const scrim     = $('#scrim');
const workPanel = $('#workPanel');
const colNotes  = $('#colNotes');
const colActions= $('#colActions');
let workspaceMode = 'split';

function updateWorkspaceLayout() {
  const m = cm();
  const hasSelectedTask = !!(m && m.selectedTaskId);
  const collapseNotes = workspaceMode !== 'notes' && !hasSelectedTask;
  workPanel.classList.toggle('notes-collapsed', collapseNotes);
}

/**
 * Open the combined panel.
 *   mode = 'notes'   → focus the Notes column
 *   mode = 'actions' → focus the Actions column
 *   mode = 'split'   → both shown equally with neither highlighted
 */
function openWorkspace(mode='split') {
  workspaceMode = mode;
  workPanel.classList.add('show');
  scrim.classList.add('show');
  colNotes.classList.toggle('focused',   mode === 'notes');
  colActions.classList.toggle('focused', mode === 'actions');
  refreshNotesPreview();
  renderActions();
  updateWorkspaceLayout();
}
function closePanels() {
  workPanel.classList.remove('show');
  scrim.classList.remove('show');
  colNotes.classList.remove('focused');
  colActions.classList.remove('focused');
  workPanel.classList.remove('notes-collapsed');
}
$('#openActions').addEventListener('click', () => {
  openWorkspace('actions');
  setTimeout(() => $('#taskName')?.focus(), 240);
});
scrim.addEventListener('click', () => { closePanels(); closeExportMenu(); });
$$('[data-close]').forEach(b => b.addEventListener('click', closePanels));

/* Clicking a column header focuses it (subtle accent strip) */
colNotes.querySelector('.panel-col-header').addEventListener('click', (e) => {
  if (e.target.closest('button')) return;
  colNotes.classList.add('focused'); colActions.classList.remove('focused');
});
colActions.querySelector('.panel-col-header').addEventListener('click', (e) => {
  if (e.target.closest('button')) return;
  colActions.classList.add('focused'); colNotes.classList.remove('focused');
});

$('#prevBtn').addEventListener('click', () => navigate(-1));
$('#nextBtn').addEventListener('click', () => navigate(1));
function navigate(dir) {
  const m = cm(); if (!m || !m.items.length) return;
  let i = m.items.findIndex(x => x.id === m.activeId);
  if (i < 0) i = 0;
  const next = (i + dir + m.items.length) % m.items.length;
  m.activeId = m.items[next].id;
  m.selectedTaskId = null;
  Object.keys(m.expandedTasks).forEach(k => delete m.expandedTasks[k]);
  save(); renderAgenda(); renderFocus(true);
  slideTaskNotesOut();
}

/* ============================== KEYBOARD SHORTCUTS ======================
 * Mnemonic & non-conflicting set:
 *   ←  →   Previous / next topic
 *   N      Open NOTES
 *   A      Open ACTION ITEMS
 *   Space  Pause / resume the meeting session timer
 *   Esc    Smart-close: if a task is selected → back to summary;
 *          else close the open panel / menus
 *   ?      Show keyboard shortcuts help
 */
const shortcutsModal = $('#shortcutsModal');
function openShortcuts() { shortcutsModal.classList.add('show'); trapFocus(shortcutsModal); }
function closeShortcuts() { shortcutsModal.classList.remove('show'); releaseFocus(shortcutsModal); }
$('#helpBtn').addEventListener('click', openShortcuts);
shortcutsModal.addEventListener('click', (e) => { if (e.target === shortcutsModal) closeShortcuts(); });
shortcutsModal.querySelectorAll('[data-close]').forEach(b => b.addEventListener('click', closeShortcuts));

document.addEventListener('keydown', e => {
  // Home screen: require clicking the intro CTA before proceeding
  if (!homeEl.classList.contains('hidden')) {
    if (!introDismissed) {
      
      if (e.key === '?' || (e.shiftKey && e.key === '/')) { e.preventDefault(); openShortcuts(); }
      return;
    }
    if (e.key === 'Escape') {
      if (modal.classList.contains('show')) closeNewMeeting();
      if (shortcutsModal.classList.contains('show')) closeShortcuts();
    }
    if (e.key === '?' || (e.shiftKey && e.key === '/')) { e.preventDefault(); openShortcuts(); }
    return;
  }
  const t = e.target;
  const typing = ['INPUT','TEXTAREA','SELECT'].includes(t.tagName) || t.isContentEditable;
  if (typing) {
    if (e.key === 'Escape') {
      // First Esc: blur the field. If a task is selected, go back to summary.
      t.blur?.();
      const m = cm();
      if (m && m.selectedTaskId) {
        $('#notesBackBtn')?.click();
      }
    }
    return;
  }
  // Modals take precedence
  if (shortcutsModal.classList.contains('show')) {
    if (e.key === 'Escape') closeShortcuts();
    return;
  }
  if (e.key === 'ArrowRight') navigate(1);
  else if (e.key === 'ArrowLeft') navigate(-1);

  else if (e.key.toLowerCase() === 'a') { e.preventDefault(); openWorkspace('actions'); setTimeout(()=>$('#taskName')?.focus(),240); }
  else if (e.key === ' ') { e.preventDefault(); toggleTimer(); }
  else if (e.key === '?' || (e.shiftKey && e.key === '/')) { e.preventDefault(); openShortcuts(); }
  else if (e.key === 'Escape') {
    const m = cm();
    if (m && m.selectedTaskId && workPanel.classList.contains('show')) {
      $('#notesBackBtn')?.click();
    } else {
      closePanels(); closeExportMenu();
    }
  }
});

/* ============================ MEETING SESSION TIMER =====================
 * Tracks total time spent in a meeting across sessions.
 *  - durationSec accumulates everything from past sessions
 *  - sessionStartedAt is the ISO when the *current* live session began
 *  - Total elapsed = durationSec + (now - sessionStartedAt)
 *  - Auto-starts when a meeting is opened, auto-pauses on back/close/done
 *  - User can pause/resume via the topbar timer button
 */
let timerInt = null;
const timerDisplay = $('#timerDisplay');
const timerEl      = $('#timer');
const playIcon     = $('#playIcon');
const pauseIcon    = $('#pauseIcon');

function fmtTime(s) {
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s/3600), mm = Math.floor((s%3600)/60), ss = s%60;
  if (h > 0) return `${h}:${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
  return `${String(mm).padStart(2,'0')}:${String(ss).padStart(2,'0')}`;
}
function fmtDurationHuman(s) {
  s = Math.max(0, Math.floor(s));
  const h = Math.floor(s/3600), mm = Math.floor((s%3600)/60);
  if (h > 0) return `${h}h ${mm}m`;
  if (mm > 0) return `${mm}m`;
  const ss = s%60; return `${ss}s`;
}
function currentMeetingElapsed() {
  const m = cm(); if (!m) return 0;
  let total = m.durationSec || 0;
  if (m.sessionStartedAt) {
    total += Math.max(0, (Date.now() - new Date(m.sessionStartedAt).getTime()) / 1000);
  }
  return total;
}
function updateTimer() {
  const m = cm();
  timerDisplay.textContent = fmtTime(currentMeetingElapsed());
  if (!m) { timerEl.classList.remove('over'); return; }
  const running = !!m.sessionStartedAt;
  playIcon.style.display  = running ? 'none' : '';
  pauseIcon.style.display = running ? ''     : 'none';
  timerEl.classList.remove('over'); // no soft-limit color on the meeting timer
}
function startSession() {
  const m = cm(); if (!m) return;
  if (m.sessionStartedAt) return;
  m.sessionStartedAt = new Date().toISOString();
  saveImmediate();
  if (!timerInt) timerInt = setInterval(updateTimer, 1000);
  updateTimer();
}
function pauseSession() {
  const m = cm(); if (!m) return;
  if (!m.sessionStartedAt) return;
  const delta = (Date.now() - new Date(m.sessionStartedAt).getTime()) / 1000;
  m.durationSec = (m.durationSec || 0) + Math.max(0, delta);
  m.sessionStartedAt = null;
  saveImmediate();
  updateTimer();
}
function toggleTimer() {
  const m = cm(); if (!m) return;
  if (m.sessionStartedAt) {
    pauseSession();
  } else {
    if (m.status === 'done') {
      // Resuming a done meeting reopens it so duration tracking is meaningful
      m.status = 'ongoing'; m.endedAt = null;
      renderMeetingHeader();
    }
    startSession();
  }
}
function resetTimer() {
  const m = cm(); if (!m) return;
  if (!confirm('Reset session timer to 00:00? This clears the recorded duration for this meeting.')) return;
  m.durationSec = 0;
  m.sessionStartedAt = m.sessionStartedAt ? new Date().toISOString() : null;
  saveImmediate();
  updateTimer();
}
$('#timerToggle').addEventListener('click', toggleTimer);
$('#timerReset').addEventListener('click', resetTimer);

// Pause when window/tab is hidden, resume when visible (so background time doesn't accrue inaccurately)
// Actually we DO want background time to count (the meeting is still happening). Just ensure ticker runs.
// Persist on unload
window.addEventListener('beforeunload', () => { saveImmediate(); });

function applyTheme() {
  document.documentElement.dataset.theme = state.theme;
  const isDark = state.theme === 'dark';
  document.querySelectorAll('.theme-toggle').forEach(btn => {
    btn.setAttribute('aria-pressed', isDark ? 'true' : 'false');
    btn.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  });
}
function toggleTheme() {
  state.theme = state.theme === 'dark' ? 'light' : 'dark';
  applyTheme(); save();
}
$('#themeBtn').addEventListener('click', toggleTheme);
$('#themeBtnHome').addEventListener('click', toggleTheme);
$('#fullscreenBtn').addEventListener('click', () => {
  if (!document.fullscreenElement) document.documentElement.requestFullscreen?.();
  else document.exitFullscreen?.();
});
$('#openSidebar')?.addEventListener('click', () => $('#sidebar').classList.add('show'));
$('#closeSidebar')?.addEventListener('click', () => $('#sidebar').classList.remove('show'));

/* ================================ EXPORT ================================ */
const exportMenu = $('#exportMenu');
const exportBtn  = $('#exportBtn');
function openExportMenu() { exportMenu.classList.add('show'); }
function closeExportMenu() { exportMenu.classList.remove('show'); }
exportBtn.addEventListener('click', (e) => { e.stopPropagation(); exportMenu.classList.toggle('show'); });
document.addEventListener('click', (e) => {
  if (!exportMenu.contains(e.target) && e.target !== exportBtn && !exportBtn.contains(e.target)) closeExportMenu();
});
exportMenu.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-export]'); if (!btn) return;
  closeExportMenu();
  const kind = btn.dataset.export;
  if (kind === 'pdf') exportPDF();
  else if (kind === 'md') exportMarkdown();
  else if (kind === 'csv') exportCSV();
});

$('#exportNotesBtn').addEventListener('click', () => {
  const item = activeItem(); if (!item) return alert('No active topic.');
  const text = `# ${item.title}\n\n${item.notes || '(no notes)'}\n`;
  download(text, `notes-${slug(item.title)}.txt`);
});
$('#exportTasksBtn').addEventListener('click', exportCSV);

function exportCSV() {
  const m = cm(); if (!m) return;
  if (!m.tasks.length) return alert('No tasks yet.');
  const rows = [['Task','Owner','Due','Status','Topic','Notes','Links']];
  m.tasks.forEach(t => {
    const item = m.items.find(i => i.id === t.itemId);
    const links = (t.links || []).map(l => (l.label?l.label+': ':'') + normalizeHref(l.url)).join(' | ');
    rows.push([t.name, t.owner||'', t.due||'', t.status, item?.title||'', (t.notes||'').replace(/\n/g,' '), links]);
  });
  const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g,'""')}"`).join(',')).join('\n');
  download(csv, `${slug(m.title)}-tasks.csv`, 'text/csv');
}

function exportMarkdown() {
  const m = cm(); if (!m) return;
  const date = formatDateLong(m.date);
  let md = `# ${m.title || 'Untitled Meeting'}\n_${date}_\n\n`;
  m.items.forEach((it, i) => {
    md += `## ${i+1}. ${it.title}\n\n`;
    if (it.notes) md += it.notes + '\n\n';
    const tasks = m.tasks.filter(t => t.itemId === it.id);
    if (tasks.length) {
      md += `**Action Items**\n`;
      tasks.forEach(t => {
        const box = t.status==='done'?'x':t.status==='abandoned'?'~':' ';
        md += `- [${box}] **${t.name}** _(${t.status})_`;
        if (t.owner) md += ` — ${t.owner}`;
        if (t.due)   md += ` (due ${t.due})`;
        md += '\n';
        if (t.notes && t.notes.trim()) {
          md += t.notes.trim().split('\n').map(l => `    > ${l}`).join('\n') + '\n';
        }
        if (t.links && t.links.length) {
          t.links.forEach(l => {
            const href = normalizeHref(l.url);
            const label = l.label || href;
            md += `    - [${label}](${href})\n`;
          });
        }
      });
      md += '\n';
    }
  });
  const orphan = m.tasks.filter(t => !m.items.find(i => i.id === t.itemId));
  if (orphan.length) {
    md += `## Other Action Items\n`;
    orphan.forEach(t => {
      const box = t.status==='done'?'x':t.status==='abandoned'?'~':' ';
      md += `- [${box}] ${t.name} _(${t.status})_${t.owner?` — ${t.owner}`:''}${t.due?` (due ${t.due})`:''}\n`;
    });
  }
  download(md, `${slug(m.title)}-${m.date}.md`);
}

function exportPDF() {
  const m = cm(); if (!m) return;
  const root = $('#printRoot');
  const counts = { ongoing: 0, done: 0, abandoned: 0 };
  m.tasks.forEach(t => counts[t.status]!==undefined && counts[t.status]++);

  let liveDur = m.durationSec || 0;
  if (m.sessionStartedAt) liveDur += Math.max(0, (Date.now() - new Date(m.sessionStartedAt).getTime()) / 1000);
  const totalLinks = m.tasks.reduce((n, t) => n + ((t.links || []).length), 0);
  const generatedAt = new Date().toLocaleString();
  const statusLabel = m.status || 'ongoing';
  const summaryCards = `
    <div class="pr-summary">
      <div class="pr-stat"><div class="label">Agenda items</div><div class="num">${m.items.length}</div></div>
      <div class="pr-stat"><div class="label">Tasks</div><div class="num">${m.tasks.length}</div></div>
      <div class="pr-stat"><div class="label">Open tasks</div><div class="num">${counts.ongoing}</div></div>
      <div class="pr-stat"><div class="label">Links</div><div class="num">${totalLinks}</div></div>
    </div>`;

  let html = `
    <div class="pr-doc">
      <section class="pr-cover">
        <div class="pr-brand">Clarify · Meeting Notes</div>
        <div class="pr-cover-top">
          <div class="pr-cover-title-wrap">
            <h1>${escapeHTML(m.title || 'Untitled Meeting')}</h1>
            <div class="pr-date">${escapeHTML(formatDateLong(m.date))}</div>
            <p class="pr-lead">A structured export of discussion notes, decisions, and action items captured during this meeting.</p>
          </div>
          <div class="pr-cover-status">${escapeHTML(statusLabel)}</div>
        </div>

        <div class="pr-meta-grid">
          <div class="pr-meta-card">
            <div class="pr-meta-k">Duration</div>
            <div class="pr-meta-v">${liveDur > 0 ? escapeHTML(fmtDurationHuman(liveDur)) : 'Not recorded'}</div>
          </div>
          <div class="pr-meta-card">
            <div class="pr-meta-k">Generated</div>
            <div class="pr-meta-v">${escapeHTML(generatedAt)}</div>
          </div>
          <div class="pr-meta-card">
            <div class="pr-meta-k">Completed</div>
            <div class="pr-meta-v">${m.endedAt ? escapeHTML(new Date(m.endedAt).toLocaleString()) : 'In progress'}</div>
          </div>
          <div class="pr-meta-card">
            <div class="pr-meta-k">Task progress</div>
            <div class="pr-meta-v">${counts.ongoing} ongoing · ${counts.done} done · ${counts.abandoned} abandoned</div>
          </div>
        </div>

        ${summaryCards}

        ${m.items.length ? `
          <div class="pr-toc">
            <h3>Contents</h3>
            <ol>${m.items.map(it => `<li>${escapeHTML(it.title || 'Untitled')}</li>`).join('')}</ol>
          </div>` : ''}
      </section>`;

  m.items.forEach((it, i) => {
    const tasks = m.tasks.filter(t => t.itemId === it.id);
    const hasNotes = !!(it.notes && it.notes.trim());
    html += `
      <section class="pr-topic">
        <div class="pr-topic-head">
          <div>
            <div class="pr-topic-meta">Topic ${i+1} of ${m.items.length}</div>
            <h2>${escapeHTML(it.title || 'Untitled')}</h2>
          </div>
          ${it.limitMin ? `<div class="pr-limit">${it.limitMin} min</div>` : ''}
        </div>`;

    if (hasNotes) {
      html += `
        <div class="pr-section">
          <div class="pr-section-title">Notes</div>
          <div class="pr-notes">${escapeHTML(it.notes)}</div>
        </div>`;
    }

    if (tasks.length) {
      html += `
        <div class="pr-section">
          <div class="pr-section-title">Action Items</div>
          <div class="pr-task-list">`;

      tasks.forEach(t => {
        const metaParts = [];
        if (t.owner) metaParts.push(`Owner: ${escapeHTML(t.owner)}`);
        if (t.due) metaParts.push(`Due: ${escapeHTML(formatDateShort(t.due))}`);
        html += `
          <div class="pr-task">
            <div class="pr-task-head">
              <span class="pr-task-name ${t.status}">${escapeHTML(t.name)}</span>
              <span class="pr-status ${t.status}">${t.status}</span>
            </div>
            ${metaParts.length ? `<div class="pr-task-meta">${metaParts.join(' · ')}</div>` : ''}
            ${t.notes && t.notes.trim() ? `<div class="pr-task-notes">${escapeHTML(t.notes)}</div>` : ''}
            ${(t.links && t.links.length) ? `
              <div class="pr-links">
                ${t.links.map(l => {
                  const href = normalizeHref(l.url);
                  const label = l.label ? `<span class="pr-link-label">${escapeHTML(l.label)}</span>` : '';
                  return `<a class="pr-link" href="${escapeAttr(href)}">${label}${escapeHTML(linkDisplay(href))}</a>`;
                }).join('')}
              </div>` : ''}
          </div>`;
      });

      html += `</div></div>`;
    }

    if (!hasNotes && !tasks.length) {
      html += `<div class="pr-empty">No notes or action items were captured for this topic.</div>`;
    }

    html += `</section>`;
  });

  const orphan = m.tasks.filter(t => !m.items.find(i => i.id === t.itemId));
  if (orphan.length) {
    html += `
      <section class="pr-topic">
        <div class="pr-topic-head">
          <div>
            <div class="pr-topic-meta">Unlinked items</div>
            <h2>Other Action Items</h2>
          </div>
        </div>
        <div class="pr-section">
          <div class="pr-section-title">Action Items</div>
          <div class="pr-task-list">`;

    orphan.forEach(t => {
      const metaParts = [];
      if (t.owner) metaParts.push(`Owner: ${escapeHTML(t.owner)}`);
      if (t.due) metaParts.push(`Due: ${escapeHTML(formatDateShort(t.due))}`);
      html += `
        <div class="pr-task">
          <div class="pr-task-head">
            <span class="pr-task-name ${t.status}">${escapeHTML(t.name)}</span>
            <span class="pr-status ${t.status}">${t.status}</span>
          </div>
          ${metaParts.length ? `<div class="pr-task-meta">${metaParts.join(' · ')}</div>` : ''}
          ${t.notes && t.notes.trim() ? `<div class="pr-task-notes">${escapeHTML(t.notes)}</div>` : ''}
          ${(t.links && t.links.length) ? `
            <div class="pr-links">
              ${t.links.map(l => {
                const href = normalizeHref(l.url);
                const label = l.label ? `<span class="pr-link-label">${escapeHTML(l.label)}</span>` : '';
                return `<a class="pr-link" href="${escapeAttr(href)}">${label}${escapeHTML(linkDisplay(href))}</a>`;
              }).join('')}
            </div>` : ''}
        </div>`;
    });

    html += `</div></div></section>`;
  }

  html += `</div>`;

  root.innerHTML = html;
  const prevTitle = document.title;
  document.title = `${m.title || 'Meeting'} — ${m.date}`;
  setTimeout(() => {
    window.print();
    setTimeout(() => { document.title = prevTitle; root.innerHTML = ''; }, 500);
  }, 80);
}

function download(content, filename, type='text/plain') {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function slug(s) { return (s||'untitled').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,40); }

/* ================================ BOOT =================================== */
applyTheme();
introTimer = setTimeout(() => dismissIntro(), 3000);

const urlParams = new URLSearchParams(window.location.search);
const shareId = urlParams.get('id');
const userRole = urlParams.get('role');
let currentUser = null;
try { currentUser = localStorage.getItem('clarify_user'); } catch(e) {}

if (shareId) {
  // Check if we own this meeting locally
  const sm = state.meetings.find(x => x.id === shareId);
  
  if (sm) {
    // IT IS OUR MEETING
    state.currentId = shareId;
    introDismissed = true;
    homeEl.classList.remove('intro-active');
    introSplash?.classList.add('hidden');
    
    
  let storageWorks = true;
  try { localStorage.setItem('test', '1'); localStorage.removeItem('test'); } catch(e) { storageWorks = false; }
  
  if (!storageWorks && !shareId) {
    alert("Warning: You are using an in-app browser or strict privacy mode that blocks Local Storage. Your meetings will NOT be saved. Please open this app in Chrome or Safari.");
  }

  if (!currentUser) {
      // We own it, but we are logged out. Force login.
      document.getElementById('authScreen').classList.add('show');
      homeEl.classList.add('hidden');
      appEl.style.display = 'none';
    } else {
      showApp(); // Load as HOST with full permissions
    }
    
  } else {
    // IT IS NOT OUR MEETING. WE ARE A GUEST.
    state.currentId = shareId;
    introDismissed = true;
    homeEl.classList.remove('intro-active');
    introSplash?.classList.add('hidden');
    
    if (userRole === 'viewer' || userRole === 'editor') {
      document.body.classList.toggle('role-viewer', userRole === 'viewer');
      initP2P({ id: shareId }, false);
    }
    
    appEl.style.display = '';
    homeEl.classList.add('hidden');
    const loader = document.createElement('div');
    loader.id = 'syncLoader';
    loader.style.cssText = 'position:fixed;inset:0;background:var(--bg);z-index:9999;display:flex;align-items:center;justify-content:center;flex-direction:column;color:var(--text);';
    loader.innerHTML = `<div style="max-width:300px;text-align:center;">
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="animation:spin 1s linear infinite; color:var(--accent); margin-bottom:16px;"><path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/></svg>
        <div style="font-weight:600; font-size:15px; margin-bottom:4px;">Connecting to Host...</div>
        <div style="font-size:13px; color:var(--muted);">Syncing meeting data securely.</div>
      </div>`;
    document.body.appendChild(loader);
  }
} else {
  // STANDARD BOOT
  if (!currentUser) {
    document.getElementById('authScreen').classList.add('show');
    homeEl.classList.add('hidden');
    appEl.style.display = 'none';
  } else {
    state.currentId = null;
    saveImmediate();
    renderHome();
  }
}


/* ==================== WEB AUDIO DICTATION (Speech-to-Text) ==================== */
let recognition = null;
let isRecording = false;

function initSpeechRecognition() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) return null;
  const r = new SpeechRecognition();
  r.continuous = true;
  r.interimResults = true;
  
  r.onresult = (event) => {
    let finalTranscript = '';
    for (let i = event.resultIndex; i < event.results.length; ++i) {
      if (event.results[i].isFinal) {
        finalTranscript += event.results[i][0].transcript + ' ';
      }
    }
    if (finalTranscript.trim()) {
      appendTranscript(finalTranscript.trim());
    }
  };
  
  r.onerror = (event) => { 
    console.warn("Speech recognition error:", event.error); 
    if (event.error === 'not-allowed') {
      alert("Microphone access blocked. Please allow mic permissions in your browser.");
      toggleMic(false);
    }
  };
  
  r.onend = () => { 
    // Auto-restart if we didn't intentionally stop it (handles silent timeouts)
    if (isRecording) {
      try { r.start(); } catch(e) {}
    } 
  };
  
  return r;
}

function appendTranscript(text) {
  const item = activeItem();
  if (!item) return; // Need an active topic to append notes
  
  // Format as a raw dictation block to separate it from manual notes
  const prefix = item.notes && item.notes.trim() ? '\n\n' : '';
  const newText = prefix + '🗣️ ' + text;
  
  item.notes = (item.notes || '') + newText;
  
  let elNotesArea = document.getElementById('notesArea');
  if (notesArea) {
    notesArea.value = item.notes;
    notesArea.scrollTop = notesArea.scrollHeight; // Auto-scroll to bottom
  }
  
  saveImmediate();
  refreshNotesPreview();
}

function toggleMic(forceState) {
  const micBtn = document.getElementById('topbarMicBtn');
  const micLabel = document.getElementById('micLabel');
  if (!micBtn) return;
  
  const newState = forceState !== undefined ? forceState : !isRecording;
  
  if (!recognition) {
    recognition = initSpeechRecognition();
    if (!recognition) {
      alert("Speech recognition is not supported in this browser. Please use Google Chrome or Safari.");
      return;
    }
  }
  
  if (newState === true) {
    isRecording = true;
    try { recognition.start(); } catch(e) {}
    micBtn.classList.add('mic-active');
    micLabel.textContent = 'Listening...';
  } else {
    isRecording = false;
    try { recognition.stop(); } catch(e) {}
    micBtn.classList.remove('mic-active');
    micLabel.textContent = 'Listen';
  }
}



/* ==================== SPATIAL VIDEO CONFERENCING ==================== */
let localStream = null;
let activeCalls = [];
let videoOffsetCount = 0;

async function toggleVideo() {
  const btn = document.getElementById('topbarVideoBtn');
  const label = document.getElementById('videoLabel');
  
  if (localStream) {
    localStream.getTracks().forEach(t => t.stop());
    localStream = null;
    btn.classList.remove('video-btn-active');
    label.textContent = 'Video';
    removeVideoBubble('local');
    activeCalls.forEach(c => c.close());
    activeCalls = [];
    videoOffsetCount = 0;
    return;
  }
  
  try {
    localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    btn.classList.add('video-btn-active');
    label.textContent = 'Live';
    addVideoBubble('local', localStream, true);
    
    if (peer) {
      if (hostConn && hostConn.open) {
        // I'm a viewer, call the host
        const c = peer.call(hostConn.peer, localStream);
        setupCall(c);
      } else if (p2pConns && p2pConns.length > 0) {
        // I'm a host, call all viewers
        p2pConns.forEach(conn => {
          if(conn.open) {
            const c = peer.call(conn.peer, localStream);
            setupCall(c);
          }
        });
      }
    }
    
    // Auto-Transcribe the video call natively!
    if (!isRecording) toggleMic(true);
    
  } catch (err) {
    console.error("Camera error:", err);
    alert("Camera access denied or unavailable.");
  }
}

function setupCall(call) {
  if (!call) return;
  activeCalls.push(call);
  call.on('stream', remoteStream => {
    addVideoBubble(call.peer, remoteStream, false);
  });
  call.on('close', () => removeVideoBubble(call.peer));
  call.on('error', () => removeVideoBubble(call.peer));
}

function addVideoBubble(id, stream, isLocal) {
  if (document.getElementById('vid-' + id)) return;
  
  const wrap = document.createElement('div');
  wrap.className = 'video-bubble';
  wrap.id = 'vid-' + id;
  wrap.style.top = (80 + (videoOffsetCount * 160)) + 'px';
  wrap.style.right = '24px';
  videoOffsetCount++;
  
  const vid = document.createElement('video');
  vid.srcObject = stream;
  vid.autoplay = true;
  vid.playsInline = true;
  if (isLocal) vid.muted = true; // Prevent echo
  
  wrap.appendChild(vid);
  makeDraggable(wrap);
  document.body.appendChild(wrap);
}

function removeVideoBubble(id) {
  const el = document.getElementById('vid-' + id);
  if (el) el.remove();
}

function makeDraggable(el) {
  let pos1 = 0, pos2 = 0, pos3 = 0, pos4 = 0;
  el.onmousedown = dragMouseDown;
  
  function dragMouseDown(e) {
    e = e || window.event;
    e.preventDefault();
    pos3 = e.clientX;
    pos4 = e.clientY;
    document.onmouseup = closeDragElement;
    document.onmousemove = elementDrag;
    el.style.transform = 'scale(0.95)';
    el.style.zIndex = 10001; // Bring to front
  }
  
  function elementDrag(e) {
    e = e || window.event;
    e.preventDefault();
    pos1 = pos3 - e.clientX;
    pos2 = pos4 - e.clientY;
    pos3 = e.clientX;
    pos4 = e.clientY;
    el.style.top = (el.offsetTop - pos2) + "px";
    el.style.left = (el.offsetLeft - pos1) + "px";
    el.style.right = 'auto'; // release right constraint
  }
  
  function closeDragElement() {
    document.onmouseup = null;
    document.onmousemove = null;
    el.style.transform = 'scale(1)';
    el.style.zIndex = 10000;
  }
}

document.getElementById('topbarVideoBtn')?.addEventListener('click', toggleVideo);

/* ==================== TAB AUDIO CAPTURE (Granola Mode) ==================== */
let mediaRecorder = null;

async function toggleTabAudio() {
  const btn = document.getElementById('topbarTabAudioBtn');
  const label = document.getElementById('tabAudioLabel');
  
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
    mediaRecorder = null;
    btn.classList.remove('mic-active');
    label.textContent = 'Record Tab';
    return;
  }
  
  try {
    // Request Tab Display Media with Audio
    const stream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    
    // Check if user actually shared audio
    if (stream.getAudioTracks().length === 0) {
      stream.getTracks().forEach(t => t.stop());
      alert("You must check 'Share tab audio' in the browser prompt to use this feature!");
      return;
    }
    
    // We only care about audio, drop the video stream to save resources
    stream.getVideoTracks().forEach(t => t.stop());
    
    mediaRecorder = new MediaRecorder(stream);
    
    mediaRecorder.ondataavailable = async (e) => {
      if (e.data.size > 0) {
        // In a live Vercel environment, we send these audio chunks to /api/transcribe
        try {
          const fd = new FormData();
          fd.append('audio', e.data);
          const res = await fetch('/api/transcribe', { method: 'POST', body: fd });
          if (res.ok) {
            const data = await res.json();
            appendTranscript(data.text);
          }
        } catch (err) {
          // Silent catch for offline simulation
          console.warn("Vercel backend not found. Simulating Tab Audio capture.");
          appendTranscript("[System Audio Captured: Setup Vercel API Key to transcribe]");
        }
      }
    };
    
    // Send audio chunks to Vercel backend every 5 seconds
    mediaRecorder.start(5000); 
    
    btn.classList.add('mic-active');
    label.textContent = 'Recording...';
    
    // Auto-stop if user manually clicks "Stop sharing" in browser UI
    stream.getAudioTracks()[0].onended = () => {
      if (mediaRecorder && mediaRecorder.state !== 'inactive') mediaRecorder.stop();
      btn.classList.remove('mic-active');
      label.textContent = 'Record Tab';
    };
    
  } catch (err) {
    console.error("Screen Share Error:", err);
  }
}

document.getElementById('topbarTabAudioBtn')?.addEventListener('click', toggleTabAudio);

document.getElementById('topbarMicBtn')?.addEventListener('click', () => toggleMic());

/* Disable mic in viewer mode */

/* ========================================================================= */
