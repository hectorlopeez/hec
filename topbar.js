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
/* ----- Page transitions (cross-document) ----- */
@keyframes hec-page-enter {
  from { opacity: 0; }
  to   { opacity: 1; }
}
@keyframes hec-page-leave {
  from { opacity: 1; transform: translateY(0); }
  to   { opacity: 0; transform: translateY(-4px); }
}
body.hec-page-entering { animation: hec-page-enter 0.32s cubic-bezier(0.22, 1, 0.36, 1) both; }
body.hec-page-leaving  { animation: hec-page-leave  0.20s cubic-bezier(0.55, 0, 0.55, 1) both; }
@media (prefers-reduced-motion: reduce) {
  body.hec-page-entering, body.hec-page-leaving { animation: none; }
}

/* ----- Section transitions (intra-page tab switches) ----- */
@keyframes hec-section-enter {
  from { opacity: 0; transform: translateY(8px); }
  to   { opacity: 1; transform: translateY(0); }
}
.section[data-section]:not([hidden]),
.gm-card,
.now-hero,
.day-ring-wrap,
.ticker-row,
.studies-card {
  animation: hec-section-enter 0.36s cubic-bezier(0.22, 1, 0.36, 1) both;
}
.section[data-section][hidden] { animation: none; }
@media (prefers-reduced-motion: reduce) {
  .section[data-section]:not([hidden]),
  .gm-card, .now-hero, .day-ring-wrap, .ticker-row, .studies-card {
    animation: none;
  }
}

/* Subtle stagger for the home dashboard's hero stack. */
body.has-bottombar .now-hero       { animation-delay: 0.02s; }
body.has-bottombar .ticker-row     { animation-delay: 0.08s; }
body.has-bottombar .day-ring-wrap  { animation-delay: 0.14s; }
body.has-bottombar .section > .gm-card:nth-of-type(1) { animation-delay: 0.20s; }
body.has-bottombar .section > .gm-card:nth-of-type(2) { animation-delay: 0.26s; }

/* Bottom-bar active state: a soft glow under the icon */
.bottombar-tab { position: relative; }
.bottombar-tab::after {
  content: '';
  position: absolute; left: 50%; bottom: 2px;
  width: 22px; height: 3px;
  border-radius: 999px;
  background: linear-gradient(90deg, #6EE7B7, #7DD3FC);
  transform: translateX(-50%) scaleX(0);
  transform-origin: center;
  opacity: 0;
  transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.18s;
}
.bottombar-tab.active::after { transform: translateX(-50%) scaleX(1); opacity: 0.9; }

/* Tab press feedback */
.bot-tab, .bottombar-tab, .topbar-finance-btn, .topbar-water-add, .topbar-income-btn {
  transition: transform 0.10s ease;
}
.bot-tab:active, .topbar-finance-btn:active { transform: scale(0.95); }

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

/* Cloud-sync status dot */
.topbar-sync-dot {
  width: 8px; height: 8px;
  border-radius: 50%;
  margin-right: auto; /* pushes everything else to the right */
  background: rgba(255,255,255,0.25);
  box-shadow: 0 0 0 0 transparent;
  transition: background 0.25s ease, box-shadow 0.25s ease;
  flex-shrink: 0;
}
.topbar-sync-dot.pending {
  background: #F2C063;
  box-shadow: 0 0 8px rgba(242,192,99,0.6);
  animation: hec-sync-pulse 1.4s ease-in-out infinite;
}
.topbar-sync-dot.ok {
  background: #6BE3A4;
  box-shadow: 0 0 8px rgba(107,227,164,0.6);
}
.topbar-sync-dot.error {
  background: #FF6B6B;
  box-shadow: 0 0 10px rgba(255,107,107,0.7);
  animation: hec-sync-pulse 1.2s ease-in-out infinite;
}
@keyframes hec-sync-pulse {
  0%, 100% { opacity: 1;   transform: scale(1);   }
  50%      { opacity: 0.5; transform: scale(0.82); }
}

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
.inc-modal-label-ccy {
  color: rgba(255,255,255,0.35);
  font-weight: 600;
  margin-left: 2px;
}
.inc-modal-amount-wrap {
  position: relative;
}
.inc-modal-amount-ccy {
  position: absolute;
  left: 16px; top: 50%;
  transform: translateY(-50%);
  font-family: ui-monospace, "SF Mono", Menlo, Consolas, monospace;
  font-size: 22px;
  color: rgba(255,255,255,0.35);
  font-weight: 700;
  pointer-events: none;
}
.inc-modal-amount-wrap .inc-modal-input.amount {
  padding-left: 38px;
  text-align: left;
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
.inc-modal[data-kind="expense"] .inc-modal-btn.save {
  background: linear-gradient(180deg, #FCA5A5 0%, #F87171 100%);
  color: #4A1414;
  box-shadow: 0 8px 22px rgba(248, 113, 113, 0.30);
}
/* Income/Expense segmented toggle */
.inc-modal-kind {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
  padding: 4px;
  background: rgba(0,0,0,0.32);
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  margin-bottom: 16px;
}
.inc-modal-kind button {
  border: 0;
  background: transparent;
  color: rgba(255,255,255,0.55);
  padding: 9px 8px;
  border-radius: 9px;
  font-family: inherit;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.04em;
  cursor: pointer;
  display: inline-flex; align-items: center; justify-content: center; gap: 6px;
  transition: background 0.18s, color 0.18s;
  -webkit-tap-highlight-color: transparent;
}
.inc-modal-kind button:hover { color: #FAFAFA; }
.inc-modal[data-kind="income"]  .inc-modal-kind .kind-income  { background: rgba(110,231,183,0.18); color: #6EE7B7; }
.inc-modal[data-kind="expense"] .inc-modal-kind .kind-expense { background: rgba(248,113,113,0.18); color: #FCA5A5; }
.inc-modal-row.is-expense-only { display: none; }
.inc-modal[data-kind="expense"] .inc-modal-row.is-expense-only { display: flex; }
.inc-modal[data-kind="income"] .inc-modal-title-prefix::before { content: '💸 Add income'; }
.inc-modal[data-kind="expense"] .inc-modal-title-prefix::before { content: '🧾 Add expense'; }
.inc-modal[data-kind="income"]  .inc-modal-sub::before { content: 'Adds to the chosen account and logs it.'; }
.inc-modal[data-kind="expense"] .inc-modal-sub::before { content: 'Deducts from the chosen account and logs it under a category.'; }
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
  <span class="topbar-sync-dot pending" id="topbarSyncDot" aria-label="Cloud sync status" title="Cloud sync"></span>
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
  <div class="inc-modal" id="incModal" data-kind="income">
    <button class="inc-modal-close" id="incModalClose" aria-label="Close">×</button>
    <h2 class="inc-modal-title" id="incModalTitle"><span class="inc-modal-title-prefix"></span></h2>
    <p class="inc-modal-sub"></p>
    <div class="inc-modal-kind" role="tablist" aria-label="Transaction type">
      <button type="button" class="kind-income"  data-kind="income"  role="tab">+ Income</button>
      <button type="button" class="kind-expense" data-kind="expense" role="tab">− Expense</button>
    </div>
    <div class="inc-modal-row">
      <label class="inc-modal-label" for="incAmount">Amount <span class="inc-modal-label-ccy">(EUR)</span></label>
      <div class="inc-modal-amount-wrap">
        <span class="inc-modal-amount-ccy" aria-hidden="true">€</span>
        <input class="inc-modal-input amount" id="incAmount" type="number" step="0.01" inputmode="decimal" placeholder="0.00" />
      </div>
    </div>
    <div class="inc-modal-row">
      <label class="inc-modal-label" for="incAccount"><span id="incAccountLabel">Into account</span></label>
      <select class="inc-modal-select" id="incAccount"></select>
    </div>
    <div class="inc-modal-row is-expense-only">
      <label class="inc-modal-label" for="incCategory">Category</label>
      <select class="inc-modal-select" id="incCategory">
        <option value="Housing">🏠 Housing</option>
        <option value="Mobility">🚗 Mobility</option>
        <option value="Food & Drink">🍽️ Food &amp; Drink</option>
        <option value="Subscriptions">📺 Subscriptions</option>
        <option value="Insurance">🛡️ Insurance</option>
        <option value="Personal">✨ Personal</option>
        <option value="Other" selected>📌 Other</option>
      </select>
    </div>
    <div class="inc-modal-row">
      <label class="inc-modal-label" for="incNote">Note (optional)</label>
      <input class="inc-modal-input" id="incNote" type="text" placeholder="e.g. Salary, Migros, freelance, …" />
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

  // -------- Currency conversion (input EUR → storage CHF) --------
  // All NW amounts are stored in CHF (legacy from finance.html). The +$
  // modal accepts amounts in EUR (Hector's mental currency) and converts
  // before saving so the displayed balance changes by exactly the amount
  // he typed when finance.html is viewed in EUR.
  function getCachedRates() {
    try { return JSON.parse(localStorage.getItem('nw_exchange_rates')); } catch (e) { return null; }
  }
  function ratesAreFresh(r) {
    return r && r.fetched && (Date.now() - r.fetched < 24 * 3600 * 1000);
  }
  function refreshExchangeRates() {
    // Fire-and-forget; if it fails we fall back to 1:1.
    fetch('https://open.er-api.com/v6/latest/CHF')
      .then(r => r.json())
      .then(data => {
        if (!data || !data.rates) return;
        const obj = {
          fetched: Date.now(),
          CHF: 1,
          USD: data.rates.USD || 1,
          EUR: data.rates.EUR || 1,
          GBP: data.rates.GBP || 1
        };
        try { localStorage.setItem('nw_exchange_rates', JSON.stringify(obj)); } catch (e) {}
      })
      .catch(() => {});
  }
  function eurToChf(eur) {
    const r = getCachedRates();
    if (r && r.EUR && r.EUR > 0) return Number(eur) / r.EUR;
    return Number(eur); // safe fallback: treat 1:1 if no rate yet
  }

  // -------- Income / expense quick-add --------
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
  function logFinanceActivity(catKey, name, deltaCHF, kind, category) {
    const ACT_KEY = 'nw:activity';
    let arr = [];
    try { arr = JSON.parse(localStorage.getItem(ACT_KEY)) || []; } catch (e) {}
    if (!Array.isArray(arr)) arr = [];
    const entry = {
      ts: Date.now(),
      cat: catKey,             // legacy: source NW category (bank, stocks…)
      name: String(name || ''),
      delta: Number(deltaCHF) || 0,
      kind: kind || 'add'      // 'income' | 'expense' | 'add' | 'delete' | …
    };
    if (category) entry.category = String(category);
    arr.push(entry);
    if (arr.length > 500) arr.splice(0, arr.length - 500);
    try { localStorage.setItem(ACT_KEY, JSON.stringify(arr)); } catch (e) {}
    // Tell same-tab listeners (e.g. finance.html's Flow + Log) that
    // activity changed, and fire a fake storage event so cross-page
    // listeners pick it up too.
    try { window.dispatchEvent(new CustomEvent('finance-changed', { detail: { key: ACT_KEY }})); } catch (e) {}
    try { window.dispatchEvent(new StorageEvent('storage', { key: ACT_KEY })); } catch (e) {}
  }

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

  function setModalKind(kind) {
    const modal = document.getElementById('incModal');
    if (!modal) return;
    modal.setAttribute('data-kind', kind === 'expense' ? 'expense' : 'income');
    const saveBtn = document.getElementById('incModalSave');
    if (saveBtn) saveBtn.textContent = (kind === 'expense') ? 'Subtract' : 'Add';
    const lbl = document.getElementById('incAccountLabel');
    if (lbl) lbl.textContent = (kind === 'expense') ? 'From account' : 'Into account';
  }

  function openIncomeModal(preset) {
    const bg = document.getElementById('incModalBg');
    if (!bg) return;
    preset = preset || {};
    const amountEl = document.getElementById('incAmount');
    const accountEl = document.getElementById('incAccount');
    const noteEl = document.getElementById('incNote');
    const catEl = document.getElementById('incCategory');
    const statusEl = document.getElementById('incModalStatus');
    populateAccountSelect(accountEl, preset.account);
    amountEl.value = preset.amount ? String(preset.amount) : '';
    noteEl.value = preset.note ? String(preset.note) : '';
    if (catEl && preset.category) {
      const match = Array.from(catEl.options).find(o => o.value.toLowerCase() === String(preset.category).toLowerCase());
      catEl.value = match ? match.value : 'Other';
    } else if (catEl) {
      catEl.value = 'Other';
    }
    statusEl.textContent = ''; statusEl.classList.remove('error','ok');
    setModalKind(preset.kind || 'income');
    bg.classList.add('show');
    setTimeout(() => amountEl.focus(), 60);
  }
  function closeIncomeModal() {
    const bg = document.getElementById('incModalBg');
    if (!bg) return;
    bg.classList.remove('show');
  }

  // kind: 'income' | 'expense'
  function applyTransaction(kind, amount, accountName, note, category) {
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
    const sign = (kind === 'expense') ? -1 : 1;
    acct.amount = (Number(acct.amount) || 0) + (sign * amount);
    bankSetAccounts(accounts);
    const displayName = acct.name + (note ? ' · ' + note : '');
    const cat = (kind === 'expense' ? (category || 'Other') : null);
    logFinanceActivity('bank', displayName, sign * amount, kind, cat);
    if (window.hecSync) window.hecSync.pushBucket('finance');
    try { window.dispatchEvent(new StorageEvent('storage', { key: 'nw:bank' })); } catch (e) {}
    return { ok: true, account: acct.name, amount, kind, category: cat };
  }
  // Back-compat: any external caller still using applyIncome works.
  function applyIncome(amount, accountName, note) {
    return applyTransaction('income', amount, accountName, note, null);
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
    // Income / Expense toggle buttons.
    document.querySelectorAll('.inc-modal-kind button').forEach(btn => {
      btn.addEventListener('click', () => setModalKind(btn.getAttribute('data-kind')));
    });
    const saveBtn = document.getElementById('incModalSave');
    if (saveBtn) saveBtn.addEventListener('click', () => {
      const modal = document.getElementById('incModal');
      const kind = (modal && modal.getAttribute('data-kind')) === 'expense' ? 'expense' : 'income';
      const amountEur = parseFloat(document.getElementById('incAmount').value);
      const selectEl = document.getElementById('incAccount');
      const note = document.getElementById('incNote').value.trim();
      const category = document.getElementById('incCategory').value || 'Other';
      const statusEl = document.getElementById('incModalStatus');
      statusEl.classList.remove('error','ok');
      let accountName = null;
      const accounts = getBankAccounts();
      const sel = selectEl.value;
      if (sel === '__new__' || accounts.length === 0) accountName = 'Bank';
      else { const idx = parseInt(sel, 10); if (!isNaN(idx) && accounts[idx]) accountName = accounts[idx].name; }
      // Input is EUR; storage is CHF. Convert with cached rate (1:1 fallback).
      const amountChf = eurToChf(amountEur);
      const r = applyTransaction(kind, amountChf, accountName, note, category);
      if (!r.ok) {
        statusEl.textContent = r.error;
        statusEl.classList.add('error');
        return;
      }
      const verb = kind === 'expense' ? 'Spent' : 'Added';
      const dir  = kind === 'expense' ? 'from' : 'to';
      // Show the EUR figure the user typed (not the CHF amount) so the
      // status matches what they see in finance.html (also EUR).
      const eurShown = '€' + (Number(amountEur) || 0).toFixed(2);
      statusEl.textContent = verb + ' ' + eurShown + ' ' + dir + ' ' + r.account + (r.category ? ' · ' + r.category : '') + ' ✓';
      statusEl.classList.add('ok');
      const flashBtn = document.getElementById('topbarIncome');
      if (flashBtn) { flashBtn.classList.add('flash'); setTimeout(() => flashBtn.classList.remove('flash'), 360); }
      setTimeout(closeIncomeModal, 700);
    });
    const amountInput = document.getElementById('incAmount');
    if (amountInput) amountInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); if (saveBtn) saveBtn.click(); }
    });
  }

  function handleIncomeUrlParam() {
    try {
      const sp = new URLSearchParams(window.location.search);
      // addExpense takes priority over addIncome if both are present.
      const expenseRaw = sp.get('addExpense') || sp.get('expense');
      const incomeRaw  = sp.get('addIncome')  || sp.get('income');
      const raw = expenseRaw || incomeRaw;
      if (!raw) return;
      const kind = expenseRaw ? 'expense' : 'income';
      const amountEur = parseFloat(raw);
      if (isNaN(amountEur) || amountEur <= 0) return;
      const note = sp.get('note') || '';
      const account = sp.get('account') || null;
      const category = sp.get('category') || null;
      const auto = sp.get('auto') === '1' || sp.get('silent') === '1';
      if (auto) {
        // URL param is EUR; convert to CHF for storage.
        const amountChf = eurToChf(amountEur);
        const r = applyTransaction(kind, amountChf, account, note, category);
        const clean = window.location.pathname + window.location.hash;
        window.history.replaceState({}, document.title, clean);
        return r;
      }
      openIncomeModal({ kind, amount: amountEur, note, account, category });
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
  let _supaClient = null;
  // Tiny logger so the sync state is observable in Safari Web Inspector.
  // Enable verbose logs with ?debug=sync on the URL.
  const SYNC_DEBUG = /[?&]debug=sync/.test(window.location.search);
  function slog() {
    try {
      const args = ['[hecSync]'].concat([].slice.call(arguments));
      console.log.apply(console, args);
    } catch (e) {}
  }
  function sdbg() { if (SYNC_DEBUG) slog.apply(null, arguments); }
  // Lazy-load @supabase/supabase-js from CDN if the page didn't ship it.
  // Some pages (health, finance, po-water) don't have the script tag, but
  // we still need Supabase to run sync from inside topbar.js.
  // Retries up to 3× with a backoff — first iOS CDN load occasionally
  // times out on slow links.
  let _supaScriptPromise = null;
  function ensureSupabaseScript() {
    if (window.supabase) return Promise.resolve(true);
    if (_supaScriptPromise) return _supaScriptPromise;
    _supaScriptPromise = (async () => {
      const URL = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
      for (let attempt = 1; attempt <= 3; attempt++) {
        const ok = await new Promise((resolve) => {
          const s = document.createElement('script');
          s.src = URL;
          s.async = true;
          s.onload  = () => resolve(true);
          s.onerror = () => resolve(false);
          (document.head || document.documentElement).appendChild(s);
        });
        if (ok && window.supabase) { sdbg('supabase-js loaded (attempt ' + attempt + ')'); return true; }
        slog('supabase-js load failed (attempt ' + attempt + ')');
        await new Promise(r => setTimeout(r, 800 * attempt));
      }
      return !!window.supabase;
    })();
    return _supaScriptPromise;
  }
  function getSupa() {
    if (_supaClient) return _supaClient;
    if (!window.supabase) return null;
    if (!TOPBAR_SUPABASE_URL || TOPBAR_SUPABASE_URL.indexOf('PASTE-') === 0) return null;
    try { _supaClient = window.supabase.createClient(TOPBAR_SUPABASE_URL, TOPBAR_SUPABASE_KEY); }
    catch (e) { slog('createClient failed', e && e.message); return null; }
    return _supaClient;
  }

  // Merge semantics: apply add/update from remote. NEVER delete a local
  // key just because it's missing from remote — a device that hasn't yet
  // loaded a page can be missing whole keys (e.g. topbar.js alone never
  // touches nw:stocks). The previous "delete orphans" pass was destroying
  // unrelated keys when sync fired from a partial-data device.
  function applyBucket(bucket, remote) {
    if (!remote || typeof remote !== 'object') return [];
    const changed = [];
    for (const k of Object.keys(remote)) {
      const incomingStr = JSON.stringify(remote[k]);
      if (localStorage.getItem(k) !== incomingStr) {
        try { _origSet(k, incomingStr); changed.push(k); } catch (e) {}
      }
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
    const sb = getSupa();
    if (!sb) { sdbg('pull', bucket, 'skipped — no supabase'); return false; }
    try {
      const { data, error } = await sb.from('app_state').select('data').eq('key', bucket).maybeSingle();
      if (error) { slog('pull', bucket, 'error', error.message || error); return false; }
      const remote = (data && data.data && typeof data.data === 'object') ? data.data : null;
      if (remote) {
        applyBucket(bucket, remote);
        sdbg('pull', bucket, 'OK', Object.keys(remote).length, 'remote keys');
      } else {
        sdbg('pull', bucket, 'empty row');
      }
      // Mark what we think the cloud holds. If local has keys the remote
      // doesn't (e.g. a sub the user just added on this device), the next
      // push will detect the drift and ship them up — merged with remote.
      _syncLastJson[bucket] = JSON.stringify(remote || {});
      const local = collectBucket(bucket);
      if (JSON.stringify(local) !== _syncLastJson[bucket]) {
        sdbg('pull', bucket, 'local has extras vs remote, scheduling push');
        schedulePush(bucket);
      }
      return true;
    } catch (e) {
      slog('pull', bucket, 'threw', e && e.message);
      return false;
    }
  }

  const _pushTimers = {};
  const _pushInFlight = {};   // bucket → true if a push is currently awaiting the network
  const _pushQueued   = {};   // bucket → true if another push is needed after the current one
  function schedulePush(bucket) {
    if (!SYNC_BUCKETS[bucket]) return;
    if (_pushInFlight[bucket]) {
      // Another push is mid-flight; mark a follow-up so we re-push as soon
      // as the current one returns (catches the change it didn't see).
      _pushQueued[bucket] = true;
      return;
    }
    // No push in flight — fire immediately on the microtask queue.
    clearTimeout(_pushTimers[bucket]);
    Promise.resolve().then(() => pushBucket(bucket));
  }
  // Merge-on-push: read current row, layer local on top, write merged.
  async function pushBucket(bucket) {
    if (_pushInFlight[bucket]) { _pushQueued[bucket] = true; return; }
    const sb = getSupa();
    if (!sb) { sdbg('push', bucket, 'skipped — no supabase'); return; }
    _pushInFlight[bucket] = true;
    setSyncStatus('pending');
    try {
      const local = collectBucket(bucket);
      const localJson = JSON.stringify(local);
      if (localJson === _syncLastJson[bucket]) {
        sdbg('push', bucket, 'noop (no drift)');
        setSyncStatus('ok');
      } else {
        const { data, error: selErr } = await sb.from('app_state').select('data').eq('key', bucket).maybeSingle();
        if (selErr) slog('push', bucket, 'select error (continuing with empty current)', selErr.message || selErr);
        const current = (data && data.data && typeof data.data === 'object') ? data.data : {};
        const merged = Object.assign({}, current, local);
        const { error: upErr } = await sb.from('app_state').upsert(
          { key: bucket, data: merged, updated_at: new Date().toISOString() },
          { onConflict: 'key' }
        );
        if (upErr) {
          slog('push', bucket, 'upsert error', upErr.message || upErr);
          setSyncStatus('error');
        } else {
          _syncLastJson[bucket] = localJson;
          slog('push', bucket, 'OK', Object.keys(local).length, 'local keys ·', Object.keys(merged).length, 'merged');
          setSyncStatus('ok');
        }
      }
    } catch (e) {
      slog('push', bucket, 'threw', e && e.message);
      setSyncStatus('error');
    } finally {
      _pushInFlight[bucket] = false;
      if (_pushQueued[bucket]) {
        _pushQueued[bucket] = false;
        // 200ms breath so a flurry of clicks coalesces into one extra push.
        clearTimeout(_pushTimers[bucket]);
        _pushTimers[bucket] = setTimeout(() => pushBucket(bucket), 200);
      }
    }
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
            sdbg('realtime', bucket, 'change received,', Object.keys(next).length, 'keys');
            applyBucket(bucket, next);
            _syncLastJson[bucket] = JSON.stringify(collectBucket(bucket));
          })
        .subscribe((status) => {
          sdbg('realtime', bucket, 'channel status:', status);
          if (status === 'SUBSCRIBED') setSyncStatus('ok');
          else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') setSyncStatus('error');
        });
    } catch (e) { slog('subscribe', bucket, 'threw', e && e.message); }
  }

  // Sync status indicator — a tiny dot in the topbar. Lets you see at a
  // glance whether the cloud sync is healthy without DevTools.
  function setSyncStatus(state) {
    const dot = document.getElementById('topbarSyncDot');
    if (!dot) return;
    dot.classList.remove('ok', 'pending', 'error');
    dot.classList.add(state || 'pending');
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
    setSyncStatus('pending');
    sdbg('boot — debug enabled via ?debug=sync');
    // Ensure @supabase/supabase-js is available — load it if the page didn't.
    const supaLoaded = await ensureSupabaseScript();
    if (!supaLoaded || !getSupa()) {
      slog('boot — supabase unavailable, sync disabled');
      setSyncStatus('error');
      return;
    }
    // Pull both buckets (with a 5s ceiling so we don't block forever).
    // The ceiling is mostly for offline / DNS edge cases.
    await Promise.race([
      Promise.all([pullBucket('health'), pullBucket('finance')]),
      new Promise(r => setTimeout(r, 5000))
    ]);
    setSyncStatus('ok');
    subscribeBucket('health');
    subscribeBucket('finance');
    // Safety net: every 15s, push any bucket whose local state drifted.
    setInterval(() => {
      for (const bucket of Object.keys(SYNC_BUCKETS)) {
        const cur = JSON.stringify(collectBucket(bucket));
        if (cur !== _syncLastJson[bucket]) {
          sdbg('safety-net detected drift in', bucket, '→ push');
          schedulePush(bucket);
        }
      }
    }, 15 * 1000);
    // Re-pull on focus / visibility so other devices' changes show up fast
    window.addEventListener('focus', () => { pullBucket('health'); pullBucket('finance'); });
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden) { pullBucket('health'); pullBucket('finance'); }
    });
  }

  // ----- Page transitions -----
  function attachPageTransitions() {
    // Add the entering class so the page animates in on load.
    document.body.classList.add('hec-page-entering');
    // Auto-remove the class once the animation ends so it doesn't replay
    // on later DOM updates that re-trigger CSS animations.
    setTimeout(() => document.body.classList.remove('hec-page-entering'), 360);

    // Intercept nav clicks on the bottombar + the finance shortcut so the
    // current page fades out before the browser navigates.
    function isInternalLink(a) {
      if (!a) return false;
      const href = a.getAttribute('href');
      if (!href) return false;
      if (/^(#|mailto:|tel:|javascript:)/.test(href)) return false;
      // Same-origin? Anchors with no host are same-origin by definition.
      if (/^https?:/.test(href)) {
        try { return new URL(href).origin === window.location.origin; }
        catch (e) { return false; }
      }
      return true;
    }
    function handleNav(e) {
      // Let modifier-clicks (cmd/ctrl/middle) open in new tab as usual.
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return;
      const a = e.currentTarget;
      if (!isInternalLink(a)) return;
      const href = a.getAttribute('href');
      // Skip same-page links (active tab)
      const currentPath = (window.location.pathname || '').replace(/\/+$/, '');
      const targetPath = href.split('#')[0].replace(/\/+$/, '');
      if (targetPath === '' || currentPath.endsWith(targetPath) || targetPath.endsWith(currentPath.split('/').pop() || '')) {
        // already there — let the click no-op (or just scroll to #anchor)
        return;
      }
      e.preventDefault();
      document.body.classList.add('hec-page-leaving');
      const goto = () => { window.location.href = href; };
      // 200ms matches the leave animation; tighter than that and the
      // animation gets cut off mid-frame on first paint of the next page.
      setTimeout(goto, 200);
    }
    document.querySelectorAll('.bottombar-tab, .topbar-finance-btn').forEach(a => {
      a.addEventListener('click', handleNav);
    });
    // The back button on finance.html etc. (if any anchor goes to index)
    document.querySelectorAll('a[href$="index.html"]').forEach(a => {
      if (!a.classList.contains('bottombar-tab')) a.addEventListener('click', handleNav);
    });
    // pageshow fires on back-forward cache restore; replay enter animation
    window.addEventListener('pageshow', (e) => {
      if (e.persisted) {
        document.body.classList.remove('hec-page-leaving');
        document.body.classList.add('hec-page-entering');
        setTimeout(() => document.body.classList.remove('hec-page-entering'), 360);
      }
    });
  }

  function boot() {
    // Each UI step is isolated so a failure in one (e.g. a missing element
    // on a page that doesn't inject the topbar, like finance.html) can never
    // stop the global sync from starting. The sync is the critical part.
    function safely(fn, label) { try { fn(); } catch (e) { slog('boot step failed:', label, e && e.message); } }
    safely(injectStyleAndHTML, 'injectStyleAndHTML');
    safely(() => {
      const btn = document.getElementById('topbarWaterAdd');
      if (btn) btn.addEventListener('click', (e) => { e.preventDefault(); addWater(); });
    }, 'waterAdd');
    safely(wireIncomeModal, 'wireIncomeModal');
    // Make sure FX rates are warm before the user opens the +$ modal so
    // EUR → CHF conversion is accurate. Cached for 24h.
    safely(() => { if (!ratesAreFresh(getCachedRates())) refreshExchangeRates(); }, 'fxRates');
    safely(handleIncomeUrlParam, 'incomeUrlParam');
    safely(attachPageTransitions, 'pageTransitions');
    safely(render, 'render');
    safely(lockGestures, 'lockGestures');
    safely(startModalLock, 'modalLock');
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
