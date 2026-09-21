/* Router + boot.
 *
 * Console cleanliness: the app keeps a global error ledger (window.__appErrors) that the
 * acceptance check reads. Any uncaught error or rejected promise is recorded rather than
 * silently swallowed.
 */
window.__appErrors = [];
window.addEventListener('error', e => window.__appErrors.push('error: ' + (e.message || e)));
window.addEventListener('unhandledrejection', e => window.__appErrors.push('rejection: ' + (e.reason?.message || e.reason)));

(() => {
  const view = document.getElementById('view');
  const nav = document.getElementById('nav');
  const toggle = document.getElementById('navToggle');
  const statusEl = document.getElementById('loadStatus');
  const state = { de: null, network: null, screening: null, candidates: null };
  let currentPage = 'overview';

  /* ---------------------------------------------------------------- reading mode
   *
   * Beginner and Expert are two presentations of the SAME data. There is no second
   * computation path: the mode only decides how much of the already-frozen detail is
   * shown, and every page reads the same DataService either way.
   */
  const MODES = ['beginner', 'expert'];
  let mode = 'beginner';
  try {
    const m = localStorage.getItem('xz.mode');
    if (MODES.includes(m)) mode = m;
    const q = new URLSearchParams(location.search).get('mode');
    if (MODES.includes(q)) { mode = q; localStorage.setItem('xz.mode', mode); }
  } catch (e) {}

  function applyMode() {
    document.documentElement.dataset.mode = mode;
    const b = document.getElementById('modeToggle');
    if (b) {
      const zh = I18N.getLang() === 'zh';
      b.textContent = mode === 'beginner' ? (zh ? '初学者' : 'Beginner')
                                           : (zh ? '专家' : 'Expert');
      b.setAttribute('aria-label', zh
        ? `当前为${mode === 'beginner' ? '初学者' : '专家'}模式，点击切换`
        : `Reading mode: ${mode}. Activate to switch.`);
      b.dataset.mode = mode;
    }
    // Two nav sets, one route table. Mark the active link in whichever set is showing,
    // and move the current page's href so switching mode keeps you on the same page.
    nav.querySelectorAll('a[data-page]').forEach(a => {
      a.classList.toggle('active', a.dataset.page === currentPage);
    });
  }
  const getMode = () => mode;
  function setMode(m) {
    mode = MODES.includes(m) ? m : 'beginner';
    try { localStorage.setItem('xz.mode', mode); } catch (e) {}
    applyMode();
    route();
  }
  window.__getMode = getMode;
  window.__setMode = setMode;
  // Exposed so the test harness can drive both presentations without a click.
  Object.defineProperty(window, '__mode', { get: getMode });

  // The modules are top-level `const`s, so they are reachable from other classic
  // scripts but are NOT properties of `window`. The acceptance harness needs them
  // across an iframe boundary, which only sees `window`.
  window.__modules = { Pages, Shortlist, Glossary, Screening, Workspace, Candidates,
                        Lenses, Journey, Pathways, PdEvidence, DataService, Charts, I18N };

  // ---- mobile nav ----
  if (toggle) {
    toggle.onclick = () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    };
  }
  nav.addEventListener('click', () => {
    nav.classList.remove('open');
    if (toggle) toggle.setAttribute('aria-expanded', 'false');
  });

  function route() {
    const h = (location.hash || '#overview').slice(1);
    // Keep every segment: `#network/7579/2` needs both the node and the hop count, and
    // destructuring the first two elements silently dropped the third.
    const parts = h.split('/');
    const page = parts[0];
    const arg = parts.slice(1).join('/') || undefined;
    // #demo/<n> enters the guided demo at step n (0-based). Shareable link.
    if (page === 'demo') { Pages.demoGoTo(arg || 0); return; }
    currentPage = page;
    nav.querySelectorAll('a').forEach(a => a.classList.toggle('active', a.dataset.page === page));
    window.scrollTo({ top: 0 });
    switch (page) {
      // #candidates/<lens> is a shareable link straight into one exploration view.
      case 'candidates': state.candidates = Pages.candidates(view, Object.assign(
                            {}, state.candidates, Pages.parseLensArg(arg))); break;
      case 'screening':  state.screening = Pages.screening(view, Object.assign(
                            {}, state.screening, Pages.parseScreeningArg(arg))); break;
      case 'workspace':  state.workspace = Pages.workspace(view, Object.assign(
                            {}, state.workspace, Pages.parseWorkspaceArg(arg))); break;
      // These two pages carry their own default gene for a reader who has not chosen one,
      // so an empty argument must stay empty instead of becoming node 0.
      case 'pathway':    Pages.pathway(view, Pages.parseOptionalGeneArg(arg)); break;
      case 'pd':         Pages.pd(view, Pages.parseOptionalGeneArg(arg)); break;
      case 'de':         state.de = Pages.de(view, state.de); break;
      case 'ranking':    Pages.ranking(view); break;
      // #network/<node_index>[/<hops>] is a shareable link to one neighbourhood.
      case 'network':    Pages.network(view, Object.assign(
                            {}, state.network, Pages.parseNetworkArg(arg))); break;
      // #validation/<node_index> focuses the validation view on one gene.
      case 'validation': Pages.validation(view, Pages.parseGeneArg(arg)); break;
      case 'workbench':  Pages.workbench(view, arg); break;
      case 'gene':       Pages.gene(view, arg || 0); break;
      case 'provenance': Pages.provenance(view); break;
      default:           Pages.overview(view);
    }
    // The guided-demo bar sits above whatever page is showing. No-op when the demo is off.
    const stepPages = ['overview', 'candidates', 'workbench', 'gene', 'network', 'pathway', 'workspace'];
    Pages.mountDemo(view, stepPages.includes(page) ? page : 'overview');
  }

  // ---- language ----
  // Static chrome carries data-t keys; page content re-renders on switch.
  function applyStatic() {
    document.querySelectorAll('[data-t]').forEach(el => { el.innerHTML = T(el.dataset.t); });
    const b = document.getElementById('langToggle');
    if (b) b.textContent = I18N.getLang() === 'zh' ? '中 · EN' : 'EN · 中';
    document.title = 'XunZi-PD — ' + T('hero.sub');
    if (statusEl && statusEl.dataset.nodes) loadStatus();
    applyMode();
  }

  /** The top-bar status chip. It carries a live count, so it is built from data rather
   *  than from a data-t key, and it has to follow a language switch like the rest. */
  function loadStatus() {
    const n = Number(statusEl.dataset.nodes);
    if (!Number.isFinite(n)) return;
    statusEl.innerHTML = I18N.getLang() === 'zh'
      ? `<span class="pill on">数据已加载</span> ${n.toLocaleString()} 个节点`
      : `<span class="pill on">data loaded</span> ${n.toLocaleString()} nodes`;
  }
  const toggleLang = () => {
    I18N.setLang(I18N.getLang() === 'zh' ? 'en' : 'zh');
    applyStatic();
    route();
  };
  const langBtn = document.getElementById('langToggle');
  if (langBtn) langBtn.onclick = toggleLang;
  // Exposed so the acceptance harness can switch language without a click.
  window.__setLang = I18N.setLang;

  const modeBtn = document.getElementById('modeToggle');
  if (modeBtn) modeBtn.onclick = () => setMode(mode === 'beginner' ? 'expert' : 'beginner');
  applyMode();

  window.addEventListener('hashchange', route);

  DataService.init().then(async () => {
    const o = DataService.load_overview();
    const p = DataService.get_provenance() || {};
    statusEl.dataset.nodes = String(o.nodes);
    loadStatus();
    document.getElementById('footRun').textContent =
      `run ${p.generated_utc || ''} · ${o.nodes.toLocaleString()} nodes / ${o.edges.toLocaleString()} edges`;

    // The v1.6 extension layers load after the frozen core and must never block it.
    // A missing pathway or PD reference degrades those two pages; it does not stop
    // the app, because the frozen analysis does not depend on either.
    await Promise.all([
      Pathways.init().catch(e => window.__appErrors.push('pathways: ' + (e.message || e))),
      PdEvidence.init(),
    ]);
    window.__extensions = {
      pathways: Pathways.ready(), pdEvidence: PdEvidence.ready(),
      pdError: PdEvidence.error(),
    };

    applyStatic();
    route();
    window.__appReady = true;
  }).catch(err => {
    // Include the first stack frame: "cannot read properties of undefined" on its own
    // does not say which line, and this ledger is the only diagnostic in a built app.
    const frame = String(err && err.stack || '').split('\n')[1];
    window.__appErrors.push('init: ' + (err.message || err) + (frame ? ' @' + frame.trim() : ''));
    statusEl.innerHTML = `<span class="pill off">load failed</span>`;
    document.getElementById('footRun').textContent = '';
    view.innerHTML = `<h1>Could not open the frozen analysis</h1>
      <div class="note warn"><b>The completed analysis results are unavailable.</b><br><br>
      Start the local app, then return here and reload the page:<br><br>
      <code>./16_app/run_app.sh</code> &nbsp;or&nbsp; <code>.\\16_app\\run_app.ps1</code><br><br>
      then open <code>http://localhost:8765/16_app/</code>.</div>
      <details class="techDetails"><summary>Technical details</summary>
        <div class="techInner"><code>${String(err.message || err)}</code><br><br>
        Opening <code>index.html</code> directly from disk does not allow the browser to load the result files.</div>
      </details>`;
    window.__appReady = 'error';
  });
})();
