// =============================================================
// Persistent dashboard top bar + bottom tab bar.
// Drop this on any page with:
//     <script src="topbar.js" defer></script>
// It self-injects HTML + CSS, reads progress from localStorage,
// and renders the water +1 button in the top bar plus the
// Main/Health/Fitness bottom tabs. Skips chrome on finance.html
// and inside iframes (so the water tracker can embed cleanly).
// =============================================================
(function () {
  'use strict';

  // -------- Supabase config (replace with your own project URL + publishable key) --------
  const TOPBAR_SUPABASE_URL = 'https://veuocgntnerdbgzfcrzb.supabase.co';
  const TOPBAR_SUPABASE_KEY = 'sb_publishable_PCTHhbGBXma7hvAFHZpPVA_bWw1rmSH';

  // -------- CSS --------
  const css = `
.topbar {
  position: sticky; top: 0; z-index: 40;
  display: flex; justify-content: flex-end; align-items: center;
  gap: 8px;
  padding: max(10px, env(safe-area-inset-top)) 14px 10px;
  background: transparent;
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
  pointer-events: none;
}
.topbar::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(5,5,6,0.85) 0%, rgba(5,5,6,0.55) 60%, rgba(5,5,6,0) 100%);
  -webkit-backdrop-filter: blur(14px) saturate(1.1);
  backdrop-filter: blur(14px) saturate(1.1);
  mask-image: linear-gradient(180deg, #000 0%, #000 60%, transparent 100%);
  -webkit-mask-image: linear-gradient(180deg, #000 0%, #000 60%, transparent 100%);
  pointer-events: none;
  z-index: -1;
}
.topbar > * { pointer-events: auto; }
.topbar-water-wrap { display: flex; align-items: stretch; }
.topbar-water-pill {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 9px 14px;
  background: rgba(125, 211, 252, 0.08);
  border: 1px solid rgba(125, 211, 252, 0.16);
  border-right: none;
  border-radius: 12px 0 0 12px;
  text-decoration: none; color: #FAFAFA;
  -webkit-tap-highlight-color: transparent;
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}
.topbar-water-pill .topbar-pill-dot {
  width: 8px; height: 8px; border-radius: 50%;
  background: #7DD3FC; flex-shrink: 0;
}
.topbar-water-pill.warn .topbar-pill-dot { background: #fbbf24; }
.topbar-water-pill.miss .topbar-pill-dot {
  background: #ff8a8a;
  animation: topbar-miss-pulse 1.6s ease-in-out infinite;
}
@keyframes topbar-miss-pulse {
  0%, 100% { box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.5); }
  50%      { box-shadow: 0 0 0 5px rgba(239, 68, 68, 0); }
}
.topbar-pill-count {
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 13px; font-weight: 700; color: #FAFAFA;
  font-variant-numeric: tabular-nums; white-space: nowrap;
}
.topbar-water-add {
  width: 44px;
  border: 1px solid rgba(125, 211, 252, 0.16);
  background: linear-gradient(180deg, rgba(125, 211, 252, 0.28), rgba(110, 231, 183, 0.28));
  color: #FFFFFF; font-family: inherit;
  font-size: 20px; font-weight: 700; line-height: 1;
  cursor: pointer; border-radius: 0 12px 12px 0;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s, transform 0.10s;
}
.topbar-water-add:active { transform: scale(0.94); }
.topbar-water-add.flash {
  background: linear-gradient(180deg, rgba(125, 211, 252, 0.7), rgba(110, 231, 183, 0.7));
}
.topbar-finance-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 44px; height: 42px;
  border: 1px solid rgba(255, 255, 255, 0.10);
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px; text-decoration: none;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s;
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}
.topbar-finance-btn:hover { background: rgba(255, 255, 255, 0.08); }
.topbar-finance-icon {
  font-size: 20px; line-height: 1;
  filter: grayscale(100%) brightness(1.4); opacity: 0.85;
}
.topbar-income-btn {
  display: inline-flex; align-items: center; justify-content: center;
  width: 44px; height: 42px;
  border: 1px solid rgba(110, 231, 183, 0.18);
  background: rgba(110, 231, 183, 0.08);
  border-radius: 12px;
  color: #6EE7B7;
  font-family: inherit;
  font-size: 18px; font-weight: 700;
  cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition: background 0.15s, transform 0.10s;
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
}
.topbar-income-btn:hover { background: rgba(110, 231, 183, 0.16); }
.topbar-income-btn:active { transform: scale(0.94); }
.topbar-income-btn.flash {
  background: rgba(110, 231, 183, 0.45);
  color: #FFFFFF;
}
.bottombar {
  position: fixed; bottom: 0; left: 0; right: 0; z-index: 40;
  display: flex; justify-content: space-around; align-items: stretch;
  padding: 8px 0 calc(8px + env(safe-area-inset-bottom));
  background: rgba(5, 5, 6, 0.72);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
  backdrop-filter: blur(20px) saturate(1.4);
  border-top: 1px solid rgba(255, 255, 255, 0.04);
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
}
.bottombar-tab {
  flex: 1;
  display: flex; flex-direction: column; align-items: center; justify-content: center;
  gap: 3px; padding: 6px 0 4px; text-decoration: none;
  color: rgba(255, 255, 255, 0.40);
  font-size: 9.5px; font-weight: 600; letter-spacing: 0.05em;
  text-transform: uppercase;
  -webkit-tap-highlight-color: transparent; transition: color 0.15s;
}
.bottombar-tab-icon {
  font-size: 24px; line-height: 1;
  filter: grayscale(100%) brightness(1.2); opacity: 0.55;
  transition: opacity 0.15s, filter 0.15s, transform 0.10s;
}
.bottombar-tab.active { color: #FAFAFA; }
.bottombar-tab.active .bottombar-tab-icon {
  filter: grayscale(100%) brightness(1.6); opacity: 1;
}
.bottombar-tab:active .bottombar-tab-icon { transform: scale(0.92); }
body.has-bottombar {
  padding-bottom: calc(72px + env(safe-area-inset-bottom)) !important;
}
@media (max-width: 480px) {
  .topbar { padding-left: 10px; padding-right: 10px; gap: 6px; }
  .topbar-water-pill { padding: 8px 11px; gap: 6px; }
  .topbar-pill-count { font-size: 12px; }
  .topbar-water-add { width: 40px; font-size: 18px; }
  .topbar-finance-btn { width: 40px; height: 38px; }
  .topbar-income-btn { width: 40px; height: 38px; font-size: 16px; }
  .topbar-finance-icon { font-size: 18px; }
  .bottombar-tab-icon { font-size: 22px; }
  .bottombar-tab { font-size: 9.5px; }
}

/* ===== Income quick-add modal ===== */
.inc-modal-bg {
  position: fixed; inset: 0; z-index: 200;
  background: rgba(0,0,0,0.55);
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  display: none;
  align-items: center; justify-content: center;
  padding: 18px;
  opacity: 0;
  transition: opacity 0.18s ease;
}
.inc-modal-bg.show { display: flex; opacity: 1; }
.inc-modal {
  width: 100%; max-width: 380px;
  background: rgba(20, 20, 22, 0.92);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 18px;
  padding: 20px;
  box-shadow: 0 24px 80px rgba(0,0,0,0.55);
  -webkit-backdrop-filter: blur(24px) saturate(1.2);
  backdrop-filter: blur(24px) saturate(1.2);
  color: #FAFAFA;
  font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", Roboto, sans-serif;
  transform: translateY(8px) scale(0.98);
  transition: transform 0.18s cubic-bezier(0.22, 1, 0.36, 1);
}
.inc-modal-bg.show .inc-modal { transform: translateY(0) scale(1); }
.inc-modal-title {
  font-size: 18px; font-weight: 700; letter-spacing: -0.02em;
  margin: 0 0 4px;
  display: flex; align-items: center; gap: 8px;
}
.inc-modal-sub {
  font-size: 12px; color: rgba(255,255,255,0.5);
  margin: 0 0 16px;
}
.inc-modal-row {
  display: flex; flex-direction: column; gap: 6px;
  margin-bottom: 12px;
}
.inc-modal-label {
  font-size: 10.5px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.10em;
  color: rgba(255,255,255,0.45);
}
.inc-modal-input, .inc-modal-select {
  padding: 11px 14px;
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 12px;
  background: rgba(0,0,0,0.32);
  color: #FAFAFA;
  font-family: inherit;
  font-size: 16px;
  outline: none;
  transition: border-color 0.15s, background 0.15s;
  -webkit-appearance: none; appearance: none;
}
.inc-modal-input:focus, .inc-modal-select:focus {
  border-color: rgba(110,231,183,0.45);
  background: rgba(0,0,0,0.45);
}
.inc-modal-input.amount {
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 26px; font-weight: 700; letter-spacing: -0.02em;
  text-align: center;
}
.inc-modal-actions {
  display: flex; gap: 8px; margin-top: 18px;
}
.inc-modal-btn {
  flex: 1;
  padding: 12px;
  border-radius: 12px;
  font-family: inherit; font-size: 14px; font-weight: 700;
  cursor: pointer;
  transition: filter 0.15s, transform 0.10s, background 0.15s;
  border: 0;
}
.inc-modal-btn.cancel {
  background: rgba(255,255,255,0.06);
  color: #FAFAFA;
  border: 1px solid rgba(255,255,255,0.10);
}
.inc-modal-btn.save {
  background: linear-gradient(180deg, #6EE7B7 0%, #34D399 100%);
  color: #042F1E;
  box-shadow: 0 8px 22px rgba(52, 211, 153, 0.30);
}
.inc-modal-btn.save:hover { filter: brightness(1.06); transform: translateY(-1px); }
.inc-modal-btn.save:disabled { opacity: 0.5; cursor: not-allowed; filter: none; transform: none; }
.inc-modal-status {
  font-size: 11px;
  color: rgba(255,255,255,0.5);
  margin-top: 10px;
  min-height: 14px;
}
.inc-modal-status.error { color: #FF8A8A; }
.inc-modal-status.ok { color: #6EE7B7; }
.inc-modal-close {
  position: absolute; top: 14px; right: 14px;
  width: 30px; height: 30px;
  border-radius: 50%;
  border: 0;
  background: rgba(255,255,255,0.06);
  color: #FAFAFA;
  font-size: 16px; line-height: 1;
  cursor: pointer;
  display: flex; align-items: center; justify-content: center;
}
.inc-modal-close:hover { background: rgba(255,255,255,0.12); }
.inc-modal { position: relative; }
html, body { -webkit-text-size-adjust: 100%; }
@media (max-width: 768px) {
  html { touch-action: pan-y; }
  ::-webkit-scrollbar { width: 0; height: 0; display: none; }
  html, body { scrollbar-width: none; -ms-overflow-style: none; }
}
.modal-bg, .modal, .po-modal-bg, .po-modal, .wt-overlay, .wt-viewer {
  overscroll-behavior: contain;
}
body.topbar-modal-open { overflow: hidden; touch-action: none; }
@media (max-width: 480px) {
  .modal-bg, .po-modal-bg {
    padding: 0 !important;
    align-items: stretch !important;
    justify-content: stretch !important;
  }
  .modal, .po-modal {
    width: 100% !important; max-width: 100% !important;
    max-height: 100vh !important; height: 100vh !important;
    border-radius: 0 !important;
    padding-top: max(20px, env(safe-area-inset-top)) !important;
    padding-bottom: max(28px, env(safe-area-inset-bottom)) !important;
    overflow-y: auto !important; overscroll-behavior: contain;
  }
}
`;

  const topbarHtml = `
<header class="topbar" id="topbar" role="navigation" aria-label="Quick actions">
  <div class="topbar-water-wrap">
    <a href="health.html#water" class="topbar-water-pill" id="topbarWater" aria-label="Water progress">
      <span class="topbar-pill-dot"></span>
      <span class="topbar-pill-count" id="topbarWaterCount">0/0</span>
    </a>
    <button class="topbar-water-add" id="topbarWaterAdd" aria-label="Log one drink" type="button">+</button>
  </div>
  <button class="topbar-income-btn" id="topbarIncome" aria-label="Add income" type="button" title="Add income">+$</button>
  <a href="finance.html" class="topbar-finance-btn" id="topbarFinance" aria-label="Finance">
    <span class="topbar-finance-icon">📊</span>
  </a>
</header>`;

  const bottombarHtml = `
<nav class="bottombar" id="bottombar" role="navigation" aria-label="Main tabs">
  <a href="index.html" class="bottombar-tab" data-page="main">
    <span class="bottombar-tab-icon">🏠</span><span>Main</span>
  </a>
  <a href="studies.html" class="bottombar-tab" data-page="studies">
    <span class="bottombar-tab-icon">📚</span><span>Studies</span>
  </a>
  <a href="health.html" class="bottombar-tab" data-page="health">
    <span class="bottombar-tab-icon">💊</span><span>Health</span>
  </a>
  <a href="gym.html" class="bottombar-tab" data-page="fitness">
    <span class="bottombar-tab-icon">💪</span><span>Fitness</span>
  </a>
</nav>`;

  const incomeModalHtml = `
<div class="inc-modal-bg" id="incModalBg" role="dialog" aria-modal="true" aria-labelledby="incModalTitle">
  <div class="inc-modal">
    <button class="inc-modal-close" id="incModalClose" aria-label="Close">×</button>
    <h2 class="inc-modal-title" id="incModalTitle">💸 Add income</h2>
    <p class="inc-modal-sub">Bumps the chosen account and logs it in your activity.</p>
    <div class="inc-modal-row">
      <label class="inc-modal-label" for="incAmount">Amount</label>
      <input class="inc-modal-input amount" id="incAmount" type="number" step="0.01" inputmode="decimal" placeholder="0.00" />
    </div>
    <div class="inc-modal-row">
      <label class="inc-modal-label" for="incAccount">Into account</label>
      <select class="inc-modal-select" id="incAccount"></select>
    </div>
    <div class="inc-modal-row">
      <label class="inc-modal-label" for="incNote">Note (optional)</label>
      <input class="inc-modal-input" id="incNote" type="text" placeholder="e.g. Salary, freelance, …" />
    </div>
    <div class="inc-modal-actions">
      <button class="inc-modal-btn cancel" id="incModalCancel" type="button">Cancel</button>
      <button class="inc-modal-btn save" id="incModalSave" type="button">Add</button>
    </div>
    <div class="inc-modal-status" id="incModalStatus"></div>
  </div>
</div>`;

  function isFinancePage() {
    const p = (window.location.pathname || '').toLowerCase();
    return p.endsWith('/finance.html') || p.endsWith('finance.html');
  }
  function isEmbedded() {
    try { return window.self !== window.top; } catch (e) { return true; }
  }
  function shouldShowChrome() { return !isFinancePage() && !isEmbedded(); }
  function currentPageKey() {
    const p = (window.location.pathname || '').toLowerCase();
    if (p.endsWith('health.html')) return 'health';
    if (p.endsWith('gym.html')) return 'fitness';
    if (p.endsWith('studies.html')) return 'studies';
    return 'main';
  }

  function injectStyleAndHTML() {
    if (document.getElementById('topbar') || document.getElementById('bottombar')) return;
    if (!shouldShowChrome()) return;
    const style = document.createElement('style');
    style.id = 'topbar-style';
    style.textContent = css;
    document.head.appendChild(style);
    const topWrap = document.createElement('div');
    topWrap.innerHTML = topbarHtml.trim();
    document.body.insertBefore(topWrap.firstChild, document.body.firstChild);
    const bottomWrap = document.createElement('div');
    bottomWrap.innerHTML = bottombarHtml.trim();
    document.body.appendChild(bottomWrap.firstChild);
    const incWrap = document.createElement('div');
    incWrap.innerHTML = incomeModalHtml.trim();
    document.body.appendChild(incWrap.firstChild);
    const active = currentPageKey();
    document.querySelectorAll('.bottombar-tab').forEach((t) => {
      t.classList.toggle('active', t.getAttribute('data-page') === active);
    });
    document.body.classList.add('has-bottombar');
  }

  function calendarDateKey() {
    const d = new Date();
    return d.getFullYear() + '-' +
      String(d.getMonth() + 1).padStart(2, '0') + '-' +
      String(d.getDate()).padStart(2, '0');
  }
  function getWaterProgress() {
    let state = null;
    try { state = JSON.parse(localStorage.getItem('po_water_v1')); } catch (e) {}
    if (!state) return { done: 0, total: 0 };
    const todayKey = calendarDateKey();
    const done = (state.logs || {})[todayKey] || 0;
    const p = state.profile || { weightKg: 75 };
    const wKg = state.weightUnit === 'lb' ? (p.weightKg || 0) / 2.20462 : (p.weightKg || 0);
    const base = wKg * 35;
    const exercise = (p.activityHrsPerWeek || 0) / 7 * 500;
    const caffeine = Math.max(0, (state.caffeineMgPerDay || 0) - 200) * 1.5;
    const subs = (state.substances || []).reduce((s, x) => {
      const dose = (x && x.dose != null ? x.dose : (x && x.defaultDose)) || 0;
      return s + Math.max(0, dose * ((x && x.mlPerUnit) || 0));
    }, 0);
    let adjust = 0;
    if (p.sex === 'm') adjust += 200;
    if ((p.age || 0) >= 50) adjust += 100;
    const totalMl = base + exercise + caffeine + subs + adjust;
    let unitVol;
    if (state.unit === 'glass') unitVol = state.glassMl || 250;
    else if (state.unit === 'oz') unitVol = 30;
    else if (state.unit === 'ml') unitVol = 1;
    else unitVol = state.bottleMl || 500;
    const total = Math.max(1, Math.ceil(totalMl / unitVol));
    return { done, total };
  }
  function classifyStatus(done, total) {
    if (total === 0) return 'idle';
    if (done >= total) return 'good';
    if (done >= total * 0.5) return 'warn';
    const h = new Date().getHours();
    if (h >= 18 && done < total * 0.5) return 'miss';
    return 'warn';
  }
  function setPillStatus(pillEl, status) {
    pillEl.classList.remove('good', 'warn', 'miss');
    if (status === 'warn' || status === 'miss') pillEl.classList.add(status);
  }
  function render() {
    const waterEl = document.getElementById('topbarWater');
    if (!waterEl) return;
    const w = getWaterProgress();
    const countEl = document.getElementById('topbarWaterCount');
    if (countEl) countEl.textContent = w.total ? w.done + '/' + w.total : '0/0';
    setPillStatus(waterEl, classifyStatus(w.done, w.total));
  }

  function defaultWaterState() {
    return {
      unit: 'bottle', bottleMl: 500, glassMl: 250, weightUnit: 'kg',
      profile: { weightKg: 75, age: 25, sex: 'm', activityHrsPerWeek: 5 },
      caffeineMgPerDay: 200, substances: [], logs: {}
    };
  }
  function addWater() {
    let state = null;
    try { state = JSON.parse(localStorage.getItem('po_water_v1')); } catch (e) {}
    if (!state || typeof state !== 'object') state = defaultWaterState();
    state.logs = state.logs || {};
    const k = calendarDateKey();
    state.logs[k] = (state.logs[k] || 0) + 1;
    try { localStorage.setItem('po_water_v1', JSON.stringify(state)); } catch (e) {}
    render();
    const btn = document.getElementById('topbarWaterAdd');
    if (btn) { btn.classList.add('flash'); setTimeout(() => btn.classList.remove('flash'), 220); }
    if (window.hecSync) window.hecSync.pushBucket('health');
  }

  function blockGesture(e) { e.preventDefault(); }
  function lockGestures() {
    document.addEventListener('gesturestart', blockGesture, { passive: false });
    document.addEventListener('gesturechange', blockGesture, { passive: false });
    document.addEventListener('gestureend', blockGesture, { passive: false });
    let lastTouch = 0;
    document.addEventListener('touchend', (e) => {
      const now = Date.now();
      if (now - lastTouch <= 300) e.preventDefault();
      lastTouch = now;
    }, { passive: false });
  }
  function startModalLock() {
    const MODAL_SELECTORS = ['.modal-bg', '.po-modal-bg', '.wt-overlay', '.wt-viewer', '.wt-cam'];
    function anyOpen() {
      for (const sel of MODAL_SELECTORS) {
        const els = document.querySelectorAll(sel);
        for (const el of els) {
          if (el.classList.contains('show') || el.classList.contains('is-open')) return true;
        }
      }
      return false;
    }
    function sync() { document.body.classList.toggle('topbar-modal-open', anyOpen()); }
    const observer = new MutationObserver(sync);
    observer.observe(document.body, { attributes: true, attributeFilter: ['class'], subtree: true });
    sync();
  }

  // -------- Income quick-add --------
  function getBankAccounts() {
    try {
      const raw = localStorage.getItem('nw:bank');
      const arr = raw ? JSON.parse(raw) : [];
      return Array.isArray(arr) ? arr : [];
    } catch (e) { return []; }
  }
  function bankSetAccounts(arr) {
    try { localStorage.setItem('nw:bank', JSON.stringify(arr)); } catch (e) {}
  }
  function logFinanceActivity(catKey, name, deltaCHF, kind) {
    const ACT_KEY = 'nw:activity';
    let arr = [];
    try { arr = JSON.parse(localStorage.getItem(ACT_KEY)) || []; } catch (e) {}
    if (!Array.isArray(arr)) arr = [];
    arr.push({ ts: Date.now(), cat: catKey, name: String(name || ''), delta: Number(deltaCHF) || 0, kind: kind || 'add' });
    if (arr.length > 200) arr.splice(0, arr.length - 200);
    try { localStorage.setItem(ACT_KEY, JSON.stringify(arr)); } catch (e) {}
  }
  // Income writes go through localStorage; the global sync (see below) picks
  // them up via the Storage.setItem patch and debounces a push to Supabase.

  function populateAccountSelect(selectEl, preferredName) {
    const accounts = getBankAccounts();
    selectEl.innerHTML = '';
    if (accounts.length === 0) {
      const opt = document.createElement('option');
      opt.value = '__new__'; opt.textContent = 'Create "Bank" account…';
      selectEl.appendChild(opt);
      return;
    }
    accounts.forEach((a, i) => {
      const opt = document.createElement('option');
      opt.value = String(i);
      opt.textContent = (a.name || 'Account') + '  ·  ' + (Number(a.amount) || 0);
      selectEl.appendChild(opt);
    });
    if (preferredName) {
      const idx = accounts.findIndex(a => (a.name || '').toLowerCase() === preferredName.toLowerCase());
      if (idx >= 0) selectEl.value = String(idx);
    }
  }

  function openIncomeModal(preset) {
    const bg = document.getElementById('incModalBg');
    if (!bg) return;
    const amountEl = document.getElementById('incAmount');
    const accountEl = document.getElementById('incAccount');
    const noteEl = document.getElementById('incNote');
    const statusEl = document.getElementById('incModalStatus');
    populateAccountSelect(accountEl, preset && preset.account);
    amountEl.value = preset && preset.amount ? String(preset.amount) : '';
    noteEl.value = preset && preset.note ? String(preset.note) : '';
    statusEl.textContent = ''; statusEl.classList.remove('error','ok');
    bg.classList.add('show');
    setTimeout(() => amountEl.focus(), 60);
  }
  function closeIncomeModal() {
    const bg = document.getElementById('incModalBg');
    if (!bg) return;
    bg.classList.remove('show');
  }

  function applyIncome(amount, accountName, note) {
    amount = Number(amount) || 0;
    if (amount <= 0) return { ok: false, error: 'Enter a positive amount.' };
    let accounts = getBankAccounts();
    let acct;
    if (accountName) {
      acct = accounts.find(a => (a.name || '').toLowerCase() === accountName.toLowerCase());
      if (!acct) {
        acct = { name: accountName, amount: 0 };
        accounts.push(acct);
      }
    } else if (accounts.length === 0) {
      acct = { name: 'Bank', amount: 0 };
      accounts.push(acct);
    } else {
      acct = accounts[0];
    }
    acct.amount = (Number(acct.amount) || 0) + amount;
    bankSetAccounts(accounts);
    logFinanceActivity('bank', acct.name + (note ? ' · ' + note : ''), amount, 'income');
    if (window.hecSync) window.hecSync.pushBucket('finance');
    try { window.dispatchEvent(new StorageEvent('storage', { key: 'nw:bank' })); } catch (e) {}
    return { ok: true, account: acct.name, amount };
  }

  function wireIncomeModal() {
    const openBtn = document.getElementById('topbarIncome');
    if (openBtn) openBtn.addEventListener('click', (e) => { e.preventDefault(); openIncomeModal(); });
    const closeBtn = document.getElementById('incModalClose');
    if (closeBtn) closeBtn.addEventListener('click', closeIncomeModal);
    const cancelBtn = document.getElementById('incModalCancel');
    if (cancelBtn) cancelBtn.addEventListener('click', closeIncomeModal);
    const bg = document.getElementById('incModalBg');
    if (bg) bg.addEventListener('click', (e) => { if (e.target === bg) closeIncomeModal(); });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && bg && bg.classList.contains('show')) closeIncomeModal();
    });
    const saveBtn = document.getElementById('incModalSave');
    if (saveBtn) saveBtn.addEventListener('click', () => {
      const amount = parseFloat(document.getElementById('incAmount').value);
      const selectEl = document.getElementById('incAccount');
      const note = document.getElementById('incNote').value.trim();
      const statusEl = document.getElementById('incModalStatus');
      statusEl.classList.remove('error','ok');
      let accountName = null;
      const accounts = getBankAccounts();
      const sel = selectEl.value;
      if (sel === '__new__' || accounts.length === 0) accountName = 'Bank';
      else { const idx = parseInt(sel, 10); if (!isNaN(idx) && accounts[idx]) accountName = accounts[idx].name; }
      const r = applyIncome(amount, accountName, note);
      if (!r.ok) {
        statusEl.textContent = r.error;
        statusEl.classList.add('error');
        return;
      }
      statusEl.textContent = 'Added ' + r.amount + ' to ' + r.account + ' ✓';
      statusEl.classList.add('ok');
      const flashBtn = document.getElementById('topbarIncome');
      if (flashBtn) { flashBtn.classList.add('flash'); setTimeout(() => flashBtn.classList.remove('flash'), 360); }
      setTimeout(closeIncomeModal, 700);
    });
    document.getElementById('incAmount').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); saveBtn.click(); }
    });
  }

  function handleIncomeUrlParam() {
    try {
      const sp = new URLSearchParams(window.location.search);
      const raw = sp.get('addIncome') || sp.get('income');
      if (!raw) return;
      const amount = parseFloat(raw);
      if (isNaN(amount) || amount <= 0) return;
      const note = sp.get('note') || '';
      const account = sp.get('account') || null;
      const auto = sp.get('auto') === '1' || sp.get('silent') === '1';
      if (auto) {
        const r = applyIncome(amount, account, note);
        // strip the params from URL so reloads don't double-add
        const clean = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, clean);
        return r;
      }
      // open prefilled modal
      openIncomeModal({ amount, note, account });
      const clean = window.location.pathname + window.location.hash;
      window.history.replaceState({}, document.title, clean);
    } catch (e) {}
  }

  // =============================================================
  // Global Supabase sync — buckets for "health" and "finance"
  //
  // Mirrors the proven pattern from index.html (goals) and studies.html:
  // each page that owns a bucket's data calls window.hecSync.pushBucket()
  // after writes. Topbar.js handles pull-on-boot, realtime subscribe,
  // and exposes the push API so pages don't each implement Supabase.
  // =============================================================
  const SYNC_BUCKETS = {
    health:  { keys: ['po_water_v1'],                                        prefixes: ['stack:'] },
    finance: { keys: ['subs', 'wishlist', 'incoming_orders', 'nw_currency'], prefixes: ['nw:']    }
  };
  function syncOwns(bucket, key) {
    const def = SYNC_BUCKETS[bucket]; if (!def || !key) return false;
    if (def.keys.indexOf(key) >= 0) return true;
    return def.prefixes.some(p => key.indexOf(p) === 0);
  }
  function collectBucket(bucket) {
    const out = {};
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && syncOwns(bucket, k)) {
        try { out[k] = JSON.parse(localStorage.getItem(k)); } catch (e) {}
      }
    }
    return out;
  }

  const _syncLastJson = {};
  // Bind originals so applyBucket can bypass any future page-level wrappers.
  const _origSet    = localStorage.setItem.bind(localStorage);
  const _origRemove = localStorage.removeItem.bind(localStorage);
  // Suppress pushes until the initial pull lands, so a write that happens
  // during boot doesn't race-upload stale data when the pull overwrites it.
  let _syncSuppress = true;
  let _supaClient = null;
  function getSupa() {
    if (_supaClient) return _supaClient;
    if (!window.supabase) return null;
    if (!TOPBAR_SUPABASE_URL || TOPBAR_SUPABASE_URL.indexOf('PASTE-') === 0) return null;
    try { _supaClient = window.supabase.createClient(TOPBAR_SUPABASE_URL, TOPBAR_SUPABASE_KEY); }
    catch (e) { return null; }
    return _supaClient;
  }

  function applyBucket(bucket, remote) {
    if (!remote || typeof remote !== 'object') return [];
    const changed = [];
    const ourKeys = new Set();
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && syncOwns(bucket, k)) ourKeys.add(k);
    }
    for (const k of Object.keys(remote)) {
      const incomingStr = JSON.stringify(remote[k]);
      if (localStorage.getItem(k) !== incomingStr) {
        try { _origSet(k, incomingStr); changed.push(k); } catch (e) {}
      }
      ourKeys.delete(k);
    }
    // Remove any local keys that the remote no longer has
    for (const k of ourKeys) {
      try { _origRemove(k); changed.push(k); } catch (e) {}
    }
    if (changed.length) {
      try { window.dispatchEvent(new CustomEvent('storage-pulled', { detail: { bucket, keys: changed }})); } catch (e) {}
      for (const k of changed) {
        try { window.dispatchEvent(new StorageEvent('storage', { key: k })); } catch (e) {}
      }
      if (changed.indexOf('po_water_v1') >= 0) try { render(); } catch (e) {}
    }
    return changed;
  }

  async function pullBucket(bucket) {
    const sb = getSupa(); if (!sb) return false;
    try {
      const { data } = await sb.from('app_state').select('data').eq('key', bucket).maybeSingle();
      if (data && data.data) {
        applyBucket(bucket, data.data);
        _syncLastJson[bucket] = JSON.stringify(collectBucket(bucket));
        return true;
      } else {
        _syncLastJson[bucket] = JSON.stringify(collectBucket(bucket));
      }
    } catch (e) {}
    return false;
  }

  const _pushTimers = {};
  function schedulePush(bucket) {
    if (!SYNC_BUCKETS[bucket]) return;
    if (_syncSuppress) return;
    clearTimeout(_pushTimers[bucket]);
    _pushTimers[bucket] = setTimeout(() => pushBucket(bucket), 600);
  }
  async function pushBucket(bucket) {
    const sb = getSupa(); if (!sb) return;
    const state = collectBucket(bucket);
    const j = JSON.stringify(state);
    if (j === _syncLastJson[bucket]) return;
    try {
      await sb.from('app_state').upsert(
        { key: bucket, data: state, updated_at: new Date().toISOString() },
        { onConflict: 'key' }
      );
      _syncLastJson[bucket] = j;
    } catch (e) {}
  }

  function subscribeBucket(bucket) {
    const sb = getSupa(); if (!sb) return;
    try {
      sb.channel('topbar_sync_' + bucket)
        .on('postgres_changes',
          { event: '*', schema: 'public', table: 'app_state', filter: 'key=eq.' + bucket },
          (payload) => {
            const next = payload.new && payload.new.data;
            if (!next) return;
            const j = JSON.stringify(next);
            if (j === _syncLastJson[bucket]) return;
            applyBucket(bucket, next);
            _syncLastJson[bucket] = j;
          })
        .subscribe();
    } catch (e) {}
  }

  // Expose to pages so their storeSet/storeDelete wrappers can fire a push
  // immediately after writing. Mirrors the pattern from index.html/studies.html.
  window.hecSync = {
    pushBucket: schedulePush,
    pushBucketNow: pushBucket,
    pullBucket: pullBucket,
    buckets: Object.keys(SYNC_BUCKETS)
  };

  async function bootGlobalSync() {
    if (!getSupa()) { _syncSuppress = false; return; }
    // Pull both buckets (with a 2.5s ceiling so we don't block forever)
    await Promise.race([
      Promise.all([pullBucket('health'), pullBucket('finance')]),
      new Promise(r => setTimeout(r, 2500))
    ]);
    _syncSuppress = false;
    subscribeBucket('health');
    subscribeBucket('finance');
    // Safety net: every 30s, push any bucket whose local state drifted
    // (e.g. a page that didn't call hecSync.pushBucket after a write).
    setInterval(() => {
      for (const bucket of Object.keys(SYNC_BUCKETS)) {
        const cur = JSON.stringify(collectBucket(bucket));
        if (cur !== _syncLastJson[bucket]) schedulePush(bucket);
      }
    }, 30 * 1000);
    // Re-pull on focus / visibility so other devices' changes show up fast
    window.addEventListener('focus', () => { pullBucket('health'); pullBucket('finance'); });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) { pullBucket('health'); pullBucket('finance'); }
    });
  }

  function boot() {
    injectStyleAndHTML();
    const btn = document.getElementById('topbarWaterAdd');
    if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); addWater(); });
    wireIncomeModal();
    handleIncomeUrlParam();
    render();
    lockGestures();
    startModalLock();
    window.addEventListener('storage', render);
    window.addEventListener('focus', render);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
    setInterval(render, 30 * 1000);
    bootGlobalSync();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
