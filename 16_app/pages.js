/* Page renderers. Every page reads exclusively through DataService — never CSV directly. */
const Pages = (() => {
  const f = Charts.fmt, pv = Charts.pv;
  const esc = s => String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const na = v => (v === null || v === undefined || v === 'NA') ? '<span class="na">NA</span>' : esc(v);
  const pill = b => b ? '<span class="pill on">TRUE</span>' : '<span class="pill off">FALSE</span>';
  const card = (k, v, n) => `<div class="card"><div class="k">${k}</div><div class="v">${v}</div><div class="n">${n || ''}</div></div>`;
  const step = (t, d) => `<div class="step"><div class="t">${t}</div><div class="d">${d}</div></div>`;
  const row = (k, v) => `<div class="metricRow"><span class="mk">${k}</span><span class="mv">${v}</span></div>`;
  const goGene = i => { location.hash = '#gene/' + i; };
  /** A home-screen entry choice. Big, plain, and one per thing a beginner might want. */
  const entryCard = (href, label, desc) => `<a class="entryCard" href="${href}">
    <span class="ecT">${esc(label)}</span>
    <span class="ecD">${esc(desc)}</span>
    <span class="ecGo">→</span></a>`;
  const flowNode = (t, d, k) => `<div class="fnode ${k}"><div class="ft">${t}</div><div class="fd">${d}</div></div>`;
  const flowArrow = () => `<div class="farrow">↓</div>`;
  const flowBranch = () => `<div class="fbranch">
      ${flowNode(NT('STAT-DE-v1'), 'expression-only ranking', 'half')}
      ${flowNode(NT('STRING-RWR-v1'), 'network propagation', 'half')}
    </div>`;
  // Δrank is a DISPLAY-ONLY derived value: STAT rank − RWR rank.
  // Positive = the gene ranks better after network propagation.
  // It is not a scientific selection criterion and changes nothing downstream.
  // NOTE: the two baselines rank inside different universes (see DATA-rank-denominators),
  // so this is indicative, not a calibrated shift.
  const deltaRank = g => (g.statRank !== null && g.rwrRank !== null) ? g.statRank - g.rwrRank : null;

  /* ---------------------------------------------------------- reading mode
   * Two presentations of one dataset. `beginner()` gates the extra technical detail;
   * the underlying values are identical in both modes, and nothing here recomputes. */
  const beginner = () => (document.documentElement.dataset.mode || 'beginner') === 'beginner';
  /** Local alias for the shared help panel, so page templates can call help('gene'). */
  const help = (id) => V16Pages.helpPanel(id);

  /** Hash-argument parsers for the shareable deep links. Bad input returns {} so a
   *  hand-edited URL degrades to the default view instead of throwing. */
  function parseScreeningArg(arg) {
    const n = Number(String(arg || '').split('/')[0]);
    return (Number.isInteger(n) && n >= 1 && n <= 5) ? { step: n } : {};
  }
  function parseGeneArg(arg) {
    const n = Number(String(arg || '').split('/')[0]);
    return (Number.isInteger(n) && n >= 0 && n < 15688) ? { gene: n, focus: n } : {};
  }
  /** The same, except that an EMPTY argument means "no gene chosen yet" rather than
   *  node 0. `Number('')` is 0, so a bare `#pathway` used to open on whichever gene
   *  happens to sit at index 0 — an arbitrary node with almost no annotation — instead
   *  of the page's own default. */
  function parseOptionalGeneArg(arg) {
    return arg ? parseGeneArg(arg) : {};
  }
  /** `#candidates/<lens>` — open the candidate page straight into one exploration view. */
  function parseLensArg(arg) {
    const id = String(arg || '').split('/')[0];
    return Lenses.has(id) ? { lens: id } : {};
  }

  /** `#workspace/12,345,900` or `#workspace/12+345` — a shareable candidate set. */
  function parseWorkspaceArg(arg) {
    if (!arg) return {};
    const ids = String(arg).split(/[,+]/).map(Number)
      .filter(n => Number.isInteger(n) && n >= 0 && n < 15688);
    return ids.length ? { genes: ids.slice(0, 4) } : {};
  }

  /** "What should I do next?" strip. Every page ends with one so a reader never has to
   *  guess where to go; the wording names only what the page actually shows. */
  function nextStep(text, label, href) {
    return `<div class="panel nextPanel">
      <div class="nextT">${esc(T('next.title'))}</div>
      <p class="nextBody">${esc(text)}</p>
      <div class="toolbar" style="margin:0"><a class="btnLink primary" href="${href}">${esc(label)}</a></div>
    </div>`;
  }

  /** Shared interpretation contract. This is presentation only and creates no new
   *  evidence grade, score, threshold, or scientific result. */
  function scientificBoundary(limitations = '') {
    const zh = I18N.getLang() === 'zh';
    return `<section class="boundaryLayer" aria-label="${esc(zh ? '科研解读边界' : 'Research interpretation boundary')}">
      <div class="boundaryItem means"><div class="boundaryK">${esc(zh ? '这个结果表示什么' : 'What this result means')}</div>
        <p>${esc(zh ? '它表示当前冻结分析框架中的研究优先级或证据支持程度。'
          : 'It indicates research priority or evidence support inside this frozen analysis framework.')}</p></div>
      <div class="boundaryItem notMeans"><div class="boundaryK">${esc(zh ? '这个结果不表示什么' : 'What this result does not mean')}</div>
        <p>${esc(zh ? '它不构成临床诊断，不证明疾病因果关系，也不代表已验证的治疗靶点。'
          : 'It is not a clinical diagnosis, does not establish disease causality, and does not identify a validated therapeutic target.')}</p></div>
      ${limitations ? `<div class="boundaryItem limits"><div class="boundaryK">${esc(zh ? '证据限制' : 'Evidence limitations')}</div><p>${esc(limitations)}</p></div>` : ''}
    </section>`;
  }

  /** Sortable <th> that is also a real button for keyboard and screen-reader users.
   *  `active` is the key the service actually sorted on, which may differ from
   *  `state.sort` when the requested key does not name a real column. */
  const sortTh = (key, label, state, active) => {
    const on = (active || state.sort) === key;
    const dir = on ? (state.asc ? 'ascending' : 'descending') : 'none';
    return `<th scope="col" data-s="${key}" tabindex="0" role="button"`
      + ` aria-sort="${dir}" class="${on ? 'sorted' + (state.asc ? ' asc' : '') : ''}"`
      + ` title="Sort by ${esc(label)}">${esc(label)}`
      + `<span class="visuallyHidden">${on ? (state.asc ? ', sorted ascending' : ', sorted descending') : ''}</span></th>`;
  };

  /* ---------- robustness panel (existing bootstrap results, not recomputed) ---------- */
  function renderRobustness(host) {
    if (!host) return;
    const r = DataService.get_robustness();
    if (!r) { host.innerHTML = '<div class="note">Robustness data unavailable.</div>'; return; }
    const F = v => (v === undefined ? 'NA' : v.toFixed(3));
    const line = (label, key) => {
      const p = r.cohorts.primary[key], v = r.cohorts.validation[key];
      if (!p) return '';
      return `<tr><td>${label}</td>
        <td class="num">${F(p.mean)}</td><td class="num">${F(p.median)}</td>
        <td class="num">${F(p.min)}</td><td class="num">${F(p.max)}</td>
        <td class="num">${v ? F(v.mean) : 'NA'}</td><td class="num">${v ? F(v.median) : 'NA'}</td></tr>`;
    };
    host.innerHTML = `
      <div class="toolbar" style="margin-bottom:10px">
        <span class="pill on">${r.status}</span>
        <span class="badge">${r.seeds_completed} / ${r.seeds_total} frozen seeds</span>
        <span class="badge">reported, not recomputed</span>
      </div>
      <p class="lede" style="margin-bottom:10px">The frozen protocol predeclares 20 bootstrap resamples
      (seeds <code>20260911…20260930</code>), resampling within each primary group with replacement at
      the original group size. This is a <b>sensitivity analysis, never model selection</b> — the
      rankings elsewhere in this app are the full-data rankings, and no threshold is derived here.</p>
      <div class="tableWrap" style="max-height:none"><table>
        <thead><tr><th>Metric</th><th>Primary mean</th><th>Primary median</th>
          <th>Primary min</th><th>Primary max</th><th>Validation mean</th><th>Validation median</th>
        </tr></thead><tbody>
          ${line('Spearman ρ vs full data', 'spearman')}
          ${line('Kendall τ-b vs full data', 'kendall')}
          ${line('Top-10 overlap proportion', 'overlap_prop@10')}
          ${line('Top-100 overlap proportion', 'overlap_prop@100')}
          ${line('Top-100 Jaccard', 'jaccard@100')}
        </tbody></table></div>
      <div class="note" style="margin:10px 0 0">
        <b>How to read this.</b> Rank <i>order</i> is the stable part — the primary cohort's mean
        Spearman against the full-data ranking is ${F(r.cohorts.primary.spearman.mean)}, with the
        validation cohort lower at ${F(r.cohorts.validation.spearman && r.cohorts.validation.spearman.mean)}
        as expected for an independent model. Rank <i>membership</i> near the very top is less stable:
        small top-k overlap is the norm when resampling only 4 samples per group, and the validation
        cohort shows this more strongly. That is a statement about sampling noise, not about biology.
      </div>`;
  }

  /* ---------- guided demo ---------- */
  const DEMO_STEPS = [
    { page: 'overview' }, { page: 'candidates' }, { page: 'gene' },
    { page: 'network' }, { page: 'pathway' }, { page: 'workspace' },
  ];
  // Deterministic demo gene: the top-ranked gene that actually has network context
  // (degree > 0), so the Network and Gene Detail steps have something to show.
  // This is a presentation choice only — it changes no ranking, score or threshold.
  // Note the rank-1 gene of both baselines is isolated (degree 0), which is why the
  // first degree>0 gene is selected here.
  const demoGene = () => {
    const r = DataService.get_rankings('STAT-DE-v1');
    const g = r.find(x => x.g.degree > 0) || r[0];
    return g ? g.g : null;
  };
  const demo = { on: false, step: 0 };
  const demoHash = s => {
    const i = (demoGene() || {}).i ?? 0;
    if (s.page === 'candidates') return '#candidates/expression';
    if (['gene', 'pathway', 'workspace'].includes(s.page)) return '#' + s.page + '/' + i;
    if (s.page === 'network') return '#network/' + i + '/1';
    return '#' + s.page;
  };
  function demoGo(i) {
    demo.step = Math.max(0, Math.min(i, DEMO_STEPS.length - 1));
    location.hash = demoHash(DEMO_STEPS[demo.step]);
  }
  function startDemo() { demo.on = true; demoGo(0); }
  function mountDemo(host, page) {
    if (!demo.on) return;
    const i = DEMO_STEPS.findIndex(s => s.page === page);
    if (i >= 0) demo.step = i;
    const s = DEMO_STEPS[demo.step], last = demo.step === DEMO_STEPS.length - 1;
    const zh = I18N.getLang() === 'zh';
    const stepLabel = zh ? `${T('demo.step')} ${demo.step + 1} / ${DEMO_STEPS.length}`
                         : `${T('demo.step')} ${demo.step + 1} / ${DEMO_STEPS.length}`;
    host.insertAdjacentHTML('afterbegin', `
      <div class="demoBar">
        <span class="badge">${T('demo.badge')}</span>
        <span class="dv">${stepLabel} · ${T('demo.l.' + s.page)}</span>
        <span class="dq">${T('demo.q.' + s.page)}</span>
        <span class="da">
          <button id="dPrev" ${demo.step === 0 ? 'disabled' : ''}>${T('demo.prev')}</button>
          <button id="dNext" class="primary" ${last ? 'disabled' : ''}>${T('demo.next')}</button>
          <button id="dExit">${T('demo.exit')}</button>
        </span></div>`);
    host.querySelector('#dPrev').onclick = () => demoGo(demo.step - 1);
    host.querySelector('#dNext').onclick = () => demoGo(demo.step + 1);
    host.querySelector('#dExit').onclick = () => { demo.on = false; location.reload(); };
  }
  const demoActive = () => demo.on;
  const startGuidedDemo = startDemo;

  /* ---------- shared gene search dropdown ---------- */
  function bindSearch(input, onPick, opts = {}) {
    const wrap = input.parentElement;
    let dd = wrap.querySelector('.dropdown');
    if (!dd) { dd = document.createElement('div'); dd.className = 'dropdown'; wrap.appendChild(dd); }
    let items = [], active = -1;
    const close = () => { dd.classList.remove('open'); active = -1; };
    const paint = () => {
      const zh = I18N.getLang() === 'zh';
      if (!items.length) {
        dd.innerHTML = input.value.trim()
          ? `<div class="empty">${zh ? '当前基因全集中没有匹配结果' : 'No match in the fixed gene universe'}</div>` : '';
        dd.classList.toggle('open', !!input.value.trim());
        return;
      }
      dd.innerHTML = items.map((g, k) => `<div data-k="${k}" class="${k === active ? 'active' : ''}">
        <span><b>${NT(g.symbol || g.gene_id)}</b></span>
        <span class="gid">${NT(g.gene_id)} · ${zh ? '互作数' : 'degree'} ${g.degree}${g.eligP ? '' : (zh ? ' · 当前模型中不可分析' : ' · not analysable here')}</span></div>`).join('');
      dd.classList.add('open');
      dd.querySelectorAll('div[data-k]').forEach(d => {
        d.onmousedown = e => { e.preventDefault(); close(); onPick(items[+d.dataset.k]); };
      });
    };
    input.oninput = () => { items = DataService.search_genes(input.value, 10); active = -1; paint(); };
    input.onfocus = () => { if (input.value.trim()) { items = DataService.search_genes(input.value, 10); paint(); } };
    input.onblur = () => setTimeout(close, 130);
    input.onkeydown = e => {
      if (!dd.classList.contains('open') || !items.length) return;
      if (e.key === 'ArrowDown') { active = Math.min(active + 1, items.length - 1); paint(); e.preventDefault(); }
      else if (e.key === 'ArrowUp') { active = Math.max(active - 1, 0); paint(); e.preventDefault(); }
      else if (e.key === 'Enter') { close(); onPick(items[active >= 0 ? active : 0]); e.preventDefault(); }
      else if (e.key === 'Escape') close();
    };
    return { items: () => items };
  }

  /* ================= 1. OVERVIEW ================= */
  function overview(host) {
    const o = DataService.load_overview();
    const p = DataService.get_provenance() || {};
    const s = DataService.get_validation_summary();
    // Progressive disclosure: the first screen answers "what are we trying to do?" and
    // offers one way in. The full method, universe and robustness tables are one level
    // down — kept, not deleted, just not the first thing a new reader meets.
    host.innerHTML = `
      <div class="hero">
        <h1 class="heroTitle notranslate" translate="no">XunZi-PD</h1>
        <div class="heroSub">${T('hero.sub')}</div>
        <p class="heroBlurb">${esc(T('ov2.what2'))}</p>
        <div class="miniFlow" aria-label="${esc(T('ov2.goal'))}">
          <span class="mfStep disc">${esc(T('ov2.pdmodel'))}</span><span class="mfA">↓</span>
          <span class="mfStep">${esc(T('ov2.expr'))}</span><span class="mfA">↓</span>
          <span class="mfStep purple">${esc(T('ov2.protein'))}</span><span class="mfA">↓</span>
          <span class="mfStep">${esc(T('ov2.rank'))}</span><span class="mfA">↓</span>
          <span class="mfStep val">${esc(T('ov2.indep'))}</span><span class="mfA">↓</span>
          <span class="mfStep">${esc(T('ov2.biointerp'))}</span>
        </div>

        <h2 class="homeStartTitle">${esc(T('ov2.startHere'))}</h2>
        <div class="homeStart">
          <section class="homeStartCard">
            <div class="homeStartK">${esc(T('ov2.noGene'))}</div>
            <p>${esc(T('ov2.noGeneD'))}</p>
            <a class="btnLink primary big" href="#candidates">${esc(T('ov2.browse'))} →</a>
          </section>
          <section class="homeStartCard">
            <div class="homeStartK">${esc(T('ov2.haveGene'))}</div>
            <p>${esc(T('ov2.haveGeneD'))}</p>
            <div class="homeGeneRow">
              <div class="searchWrap homeGeneSearchWrap">
                <label class="visuallyHidden" for="homeGeneSearch">${esc(T('ov2.haveGene'))}</label>
                <input id="homeGeneSearch" type="text" autocomplete="off"
                  placeholder="${esc(T('ov2.genePlaceholder'))}">
              </div>
              <button type="button" id="homeGeneGo">${esc(T('ov2.openGene'))}</button>
            </div>
             <div class="homeStartHint" id="homeGeneFeedback" role="status" aria-live="polite">${esc(T('ov2.searchHint'))}</div>
          </section>
        </div>
        <div class="heroActions secondaryActions">
          <button id="startDemo">${T('hero.demo')}</button>
        </div>
      </div>

      ${help('home')}

      <div class="frozenNotice">
        <b>${esc(I18N.getLang() === 'zh' ? '当前展示的是已完成并冻结的分析结果' : 'You are exploring a completed, frozen analysis')}</b>
        <span>${esc(I18N.getLang() === 'zh'
          ? '这里用于浏览、比较和检查研究证据；你的操作不会重新训练模型或重新运行核心分析。'
          : 'Use this app to browse, compare, and inspect research evidence. Your actions do not retrain a model or rerun the core analysis.')}</span>
      </div>

      <div class="note">${esc(T('ov2.caveat'))}</div>

      <!-- Secondary destinations stay below the first screen so the two plain start
           paths above remain the only immediate decision. -->
      <h2 class="titleBeginner entryH">${esc(T('ov2.more'))}</h2>
      <div class="entryGrid beginnerOnly">
        ${entryCard('#network/7746/1', T('ov2.e3'), T('ov2.e3d'))}
        ${entryCard('#workspace', T('ov2.e4'), T('ov2.e4d'))}
      </div>

      <details class="techDetails" id="techDetails">
        <summary>${esc(T('ov2.tech'))}</summary>
        <div class="techInner">

      <h2>${esc(T('ov2.currentModel'))}</h2>
      <div class="two">
        <div class="modelCard disc">
          <div class="mcTag">${esc(T('val.disc'))}</div>
          <div class="mcTitle">${esc(T('ov2.discovery'))}</div>
          <div class="mcPair">MPTP vs Saline</div>
        </div>
        <div class="modelCard val">
          <div class="mcTag">${esc(T('val.val'))}</div>
          <div class="mcTitle">${esc(T('ov2.validation'))}</div>
          <div class="mcPair">PFF vs PBS</div>
        </div>
      </div>
      <div class="grid cards" style="margin-top:12px">
        ${card(T('card.nodes'), o.nodes.toLocaleString(), 'fixed U3 universe')}
        ${card(T('ov2.ranked'), o.statRanked.toLocaleString(), 'analysis-eligible')}
        ${card(T('ov2.gwasN'), (typeof PdEvidence !== 'undefined' && PdEvidence.ready()
            ? PdEvidence.knownGenes().length : 0).toLocaleString(), 'with PD reference evidence')}
        ${card(T('ov2.pathwayN'), (typeof Pathways !== 'undefined' && Pathways.ready()
            ? Pathways.testablePathways() : 0).toLocaleString(), 'testable pathways')}
      </div>

      <h2>${T('ov.method')}</h2>
      <div class="panel">
        <div class="flow">
          ${flowNode(T('flow.rnaseq'), T('flow.rnaseq.d'), 'start')}
          ${flowArrow()}
          ${flowNode(T('flow.de'), T('flow.de.d'), '')}
          ${flowArrow()}
          ${flowNode(T('flow.net'), o.nodes.toLocaleString() + ' nodes · ' + o.edges.toLocaleString() + ' edges', '')}
          ${flowArrow()}
          ${flowBranch()}
          ${flowArrow()}
          ${flowNode(T('flow.prio'), T('flow.prio.d'), '')}
          ${flowArrow()}
          ${flowNode(T('flow.val'), T('flow.val.d'), 'end')}
        </div>
        <div class="legend" style="justify-content:center">${T('ov.method.note')}</div>
      </div>

      <div class="grid cards">
        ${card('Structural nodes', o.nodes.toLocaleString(), 'fixed U3 universe')}
        ${card('Graph edges', o.edges.toLocaleString(), 'undirected, canonical')}
        ${card('Connected', o.connected.toLocaleString(), 'degree &gt; 0')}
        ${card('Isolated', o.isolated.toLocaleString(), 'retained, degree = 0')}
        ${card('Primary eligible', o.eligPrimary.toLocaleString(), 'MPTP vs Saline')}
        ${card('Validation eligible', o.eligValidation.toLocaleString(), 'PFF vs PBS')}
      </div>

      <div class="two" style="margin-top:14px">
        <div class="panel">
          <h2 style="margin-top:0">Cohorts</h2>
          ${row('Primary', 'MPTP_SN vs Saline_SN · 4 + 4')}
          ${row('Validation', 'PFF_SN vs PBS_SN · 5 + 5')}
          ${row('Source', 'CRA033901')}
          ${row('Primary role', 'sole source of ranking features')}
          ${row('Validation role', 'external validation only')}
        </div>
        <div class="panel">
          <h2 style="margin-top:0">Baselines</h2>
          ${row(NT('STAT-DE-v1'), `<span class="pill on">COMPLETE</span> ${o.statRanked.toLocaleString()} ranked`)}
          ${row('Score', 'abs_lfc × min(−log10 FDR, 50)')}
          ${row(NT('STRING-RWR-v1'), `<span class="pill on">CONVERGED</span> 36 iterations`)}
          ${row('Restart / tol', '0.5 · L1 1e-12 · max 10,000')}
          ${row('Agreement', `ρ ${s.statVsRwr.spearman.toFixed(3)} · τ ${s.statVsRwr.kendall.toFixed(3)}`)}
        </div>
      </div>

      <h2>Research chain</h2>
      <div class="panel">
        <div class="pipeline">
          ${step('RNA-seq', '36 FASTQ pairs')}<span class="arrow">→</span>
          ${step('Alignment', 'STAR 2.7.11b')}<span class="arrow">→</span>
          ${step('Counts', 'featureCounts 2.0.8')}<span class="arrow">→</span>
          ${step('B1 graph', o.nodes.toLocaleString() + ' nodes')}<span class="arrow">→</span>
          ${step('B2 DE', 'DESeq2 1.46.0')}<span class="arrow">→</span>
          ${step('STAT-DE', 'deterministic')}<span class="arrow">→</span>
          ${step('RWR', 'restart 0.5')}<span class="arrow">→</span>
          ${step('Validation', 'PFF vs PBS')}
        </div>
      </div>

      <div class="two">
        <div class="panel">
          <h2 style="margin-top:0">Analysis universe</h2>
          ${row('CPM pass · primary', `${o.cpmPrimary.toLocaleString()} <span class="badge">≥ 4 of 8</span>`)}
          ${row('CPM pass · validation', `${o.cpmValidation.toLocaleString()} <span class="badge">≥ 5 of 10</span>`)}
          ${row('Eligible · primary', o.eligPrimary.toLocaleString())}
          ${row('Eligible · validation', o.eligValidation.toLocaleString())}
          ${row('Ineligible nodes', 'retained with <code>NA</code> — never removed')}
        </div>
        <div class="panel">
          <h2 style="margin-top:0">Where to start</h2>
          <div class="note">
            <b>Expression</b> browses the frozen DE statistics and their volcano.
            <b>Ranking</b> compares the two baselines side by side.
            <b>Network</b> explores the STRING PPI neighbourhood of any gene — isolated nodes included.
            <b>Validation</b> shows how the primary signature behaves in the PFF cohort.
            <br><br>New here? Use <b>Start Guided Demo</b> at the top for a 3-minute walkthrough.
          </div>
        </div>
      </div>

      <h2>${T('rob.title')}</h2>
      <div class="panel" id="robustPanel"></div>

      <h2>${T('about.title')}</h2>
      <div class="panel">
        <div class="two">
          <div>
            ${row(T('about.genome'), 'GENCODE M35')}
            ${row(T('about.ortho'), 'Ensembl 112 · high-confidence 1:1')}
            ${row(T('about.ppi'), 'STRING v12 physical')}
          </div>
          <div>
            ${row(T('about.de'), 'DESeq2 1.46.0')}
            ${row(T('about.lfc'), 'apeglm 1.28.0')}
            ${row(T('about.baselines'), 'STAT-DE-v1 · STRING-RWR-v1')}
          </div>
        </div>
        <div class="note warn" style="margin-bottom:0">
          <b>${T('about.disclaimer')}</b> ${T('about.disclaimer.body')}
        </div>
      </div>

        </div><!-- /techInner -->
      </details>`;
    renderRobustness(host.querySelector('#robustPanel'));
    const demoBtn = host.querySelector('#startDemo');
    if (demoBtn) demoBtn.onclick = startGuidedDemo;
    const homeInput = host.querySelector('#homeGeneSearch');
    const homeFeedback = host.querySelector('#homeGeneFeedback');
    const openHomeGene = g => {
      if (g) { goGene(g.i); return; }
      if (homeFeedback) {
        homeFeedback.textContent = I18N.getLang() === 'zh'
          ? '当前固定基因全集中没有匹配结果。请检查基因符号或 Ensembl ID 后重试。'
          : 'No match in the fixed gene universe. Check the gene symbol or Ensembl ID and try again.';
        homeFeedback.classList.add('inputError');
      }
    };
    if (homeInput) {
      bindSearch(homeInput, openHomeGene);
      const homeGo = host.querySelector('#homeGeneGo');
      if (homeGo) homeGo.onclick = () => openHomeGene(DataService.search_genes(homeInput.value, 1)[0]);
    }
    // Expert readers land with the technical section already open; beginners get the
    // single first screen. Opening it is a presentation choice, not a data change.
    const td = host.querySelector('#techDetails');
    if (td) {
      if (!beginner()) td.open = true;
      // #overview/tech keeps the methodology link working now that it is collapsed.
      if ((location.hash.split('/')[1] || '') === 'tech') {
        td.open = true;
        setTimeout(() => td.scrollIntoView({ block: 'start' }), 0);
      }
    }
    Glossary.bind(host);
  }

  /* ================= 2. DIFFERENTIAL EXPRESSION ================= */
  function de(host, state) {
    state = Object.assign({ cohort: 'primary', q: '', minAbsLfc: 0, maxFdr: 1,
      onlyEligible: false, sort: null, asc: true,
      page: 1, pageSize: 100, sel: null }, state || {});
    const initialSel = state.sel;
    state.sel = null;

    function render(keepSel) {
      const keyL = state.cohort === 'validation' ? 'lv' : 'lp';
      const keyB = state.cohort === 'validation' ? 'bv' : 'bp';
      const keyP = state.cohort === 'validation' ? 'pv' : 'pp';
      const keyF = state.cohort === 'validation' ? 'fv' : 'fp';
      // Default to this cohort's FDR column. The old default was the literal string
      // 'padj', which is not a field on the row ('fp'/'fv' is), so the comparator
      // returned NaN and the table rendered in node order while looking sorted.
      const res = DataService.get_de_results(state.cohort, {
        q: state.q, minAbsLfc: state.minAbsLfc, maxFdr: state.maxFdr,
        onlyEligible: state.onlyEligible, page: state.page, pageSize: state.pageSize,
        sort: state.sort || keyF, asc: state.asc,
      });
      const activeSort = res.sortKey;
      // Charts are drawn from the FULL filtered set; the table shows one page.
      const rows = res.allRows.filter(g => g.eligP || g.eligV);
      const shown = res.tableRows;
      const totalMatching = res.total;
      const dist = rows.map(g => g[keyL]).filter(v => v !== null);
      const sel = state.sel;
      const selG = sel !== null ? DataService.get_gene_detail(sel) : null;
      const hl = sel !== null ? new Set([sel]) : null;

      host.innerHTML = `
        <h1>Differential Expression</h1>
        <p class="lede">DESeq2 1.46.0 · <code>~ condition</code> · median-of-ratios · Wald test ·
        apeglm shrunken log2FC (case / control) · BH FDR · <code>independentFiltering = FALSE</code> ·
        <code>cooksCutoff = FALSE</code>. <b>No new DE threshold is applied here</b> — these are the
        frozen statistics.</p>

        <div class="tabs">
          <button class="${state.cohort === 'primary' ? 'active' : ''}" data-c="primary">Primary · MPTP vs Saline</button>
          <button class="${state.cohort === 'validation' ? 'active' : ''}" data-c="validation">Validation · PFF vs PBS</button>
        </div>

        <div class="panel">
          <div class="toolbar">
            <div class="searchWrap"><input id="q" placeholder="search symbol / human ID / mouse ID" value="${esc(state.q)}" style="min-width:270px"></div>
            <label>min |log2FC| <input id="mlfc" type="number" step="0.1" value="${state.minAbsLfc}" style="width:72px"></label>
            <label>max FDR <input id="mfdr" type="number" step="0.01" value="${state.maxFdr}" style="width:72px"></label>
            <label><input type="checkbox" id="elg" ${state.onlyEligible ? 'checked' : ''}> eligible only</label>
            <button id="reset">reset</button>
            <span class="spacer">${res.total.toLocaleString()} matching ·
              page ${res.page} / ${res.pages} · showing ${shown.length}</span>
            <button id="pPrev" ${res.page === 1 ? 'disabled' : ''}>‹</button>
            <button id="pNext" ${res.page === res.pages ? 'disabled' : ''}>›</button>
          </div>
          <div class="two">
            <div id="vol"></div>
            <div id="hist"></div>
          </div>
          <div class="legend">Volcano y = −log10 raw p-value (capped at 50, matching the frozen neglog10
            cap), coloured by FDR &lt; 0.05. <b>Click any point</b> to select it across the table; click a row
            to open that gene.</div>
        </div>

        <div id="selStrip"></div>

        <div class="panel">
          <div class="tableWrap"><table>
            <thead><tr>
              ${sortTh('symbol', 'Symbol', state, activeSort)}
              <th scope="col">Human gene ID</th><th scope="col">Mouse gene ID</th>
              ${sortTh(keyB, 'baseMean', state, activeSort)}
              ${sortTh(keyL, 'log2FC', state, activeSort)}
              ${sortTh(keyP, 'p-value', state, activeSort)}
              ${sortTh(keyF, 'FDR', state, activeSort)}
              <th scope="col">CPM</th><th scope="col">Eligible</th>
            </tr></thead>
            <tbody>${shown.map(g => `<tr data-i="${g.i}" class="${sel === g.i ? 'sel' : ''}">
              <td class="sym">${NT(g.symbol || '')}</td>
              <td class="mono">${NT(g.gene_id)}</td>
              <td class="mono">${NT(g.mouse || '')}</td>
              <td class="num">${f(g[keyB], 1)}</td>
              <td class="num">${f(g[keyL], 4)}</td>
              <td class="num">${pv(g[keyP])}</td>
              <td class="num">${pv(g[keyF])}</td>
              <td>${pill(state.cohort === 'validation' ? g.cpmV : g.cpmP)}</td>
              <td>${pill(state.cohort === 'validation' ? g.eligV : g.eligP)}</td>
            </tr>`).join('')}</tbody>
          </table></div>
        </div>`;

      // selection strip — links volcano selection to Gene Detail without leaving the page
      const strip = host.querySelector('#selStrip');
      if (selG) {
        strip.innerHTML = `<div class="panel" style="border-color:#2f5d96">
          <div class="toolbar" style="margin:0">
            <span class="badge">selected</span>
            <b style="font-size:15px">${NT(selG.symbol || selG.gene_id)}</b>
            <span class="mono" style="color:var(--dim)">${NT(selG.gene_id)}</span>
            <span class="badge">log2FC ${f(selG[keyL], 4)}</span>
            <span class="badge">FDR ${pv(selG[keyF])}</span>
            <span class="badge">degree ${selG.degree}</span>
            <span class="badge">STAT #${selG.statRank ?? 'NA'}</span>
            <button class="primary" id="openSel" style="margin-left:auto">Open Gene Detail →</button>
            <button id="clearSel">clear</button>
          </div></div>`;
        strip.querySelector('#openSel').onclick = () => goGene(sel);
        strip.querySelector('#clearSel').onclick = () => { state.sel = null; render(); };
      } else strip.innerHTML = '';

      const YCAP = 50;
      // Every matching eligible row is plotted. A previous version sliced the first
      // 6,000 — and because the rows arrive globally sorted by FDR that silently drew
      // only the most significant genes while the page claimed to show the full set.
      // The universe is fixed at 15,688, so there is no size at which a cap is needed.
      const volPts = rows.map(g => ({
        i: g.i, x: g[keyL] ?? 0,
        y: Math.min(-(Math.log10(Math.max(g[keyP] ?? 1, 1e-300))), YCAP),
        color: (g[keyF] !== null && g[keyF] < 0.05) ? '#f85149' : '#4c9aff',
        tip: `<b>${NT(g.symbol || g.gene_id)}</b><br>log2FC ${f(g[keyL], 4)}<br>p ${pv(g[keyP])}<br>FDR ${pv(g[keyF])}`,
      }));
      Charts.volcano(host.querySelector('#vol'), volPts,
        { title: `Volcano — ${state.cohort} · ${volPts.length.toLocaleString()} plotted`,
          highlight: hl, onSelect: i => { state.sel = i; render(); } });

      Charts.histogram(host.querySelector('#hist'), dist,
        { title: `log2FC distribution — ${state.cohort}`, color: state.cohort === 'validation' ? '#38d39f' : '#4c9aff' });

      host.querySelectorAll('.tabs button').forEach(b => b.onclick = () => { state.cohort = b.dataset.c; state.sel = null; render(); });
      bindSearch(host.querySelector('#q'), g => { state.sel = g.i; state.q = g.symbol || g.gene_id; render(); });
      const qEl = host.querySelector('#q');
      qEl.addEventListener('input', () => { state.q = qEl.value; });
      qEl.addEventListener('change', () => render());
      qEl.addEventListener('keydown', e => { if (e.key === 'Enter') render(); });
      host.querySelector('#mlfc').onchange = e => { state.minAbsLfc = Number(e.target.value); render(); };
      host.querySelector('#mfdr').onchange = e => { state.maxFdr = Number(e.target.value); render(); };
      host.querySelector('#elg').onchange = e => { state.onlyEligible = e.target.checked; render(); };
      host.querySelector('#reset').onclick = () => de(host, { cohort: state.cohort });
      const pv1 = host.querySelector('#pPrev'), nx1 = host.querySelector('#pNext');
      if (pv1) pv1.onclick = () => { state.page = res.page - 1; render(); };
      if (nx1) nx1.onclick = () => { state.page = res.page + 1; render(); };
      const sortBy = k => {
        if (state.sort === k) state.asc = !state.asc; else { state.sort = k; state.asc = true; }
        state.page = 1;   // a new sort restarts paging
        render();
      };
      host.querySelectorAll('th[data-s]').forEach(t => {
        t.onclick = () => sortBy(t.dataset.s);
        t.onkeydown = e => {
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault(); sortBy(t.dataset.s);
          }
        };
      });
      // Roving tabindex: a 100-row page must not be 100 tab stops. Exactly one row is
      // reachable by keyboard — the selected one, or the first if nothing is selected —
      // and the arrow keys move that cursor.
      const trs = [...host.querySelectorAll('tbody tr')];
      const cursor = trs.findIndex(t => +t.dataset.i === sel);
      trs.forEach((tr, k) => {
        tr.tabIndex = (k === (cursor < 0 ? 0 : cursor)) ? 0 : -1;
        tr.onclick = e => {
          const i = +tr.dataset.i;
          if (sel === i || e.detail === 2) { goGene(i); return; }
          state.sel = i; render();
          const el = host.querySelector(`tbody tr[data-i="${i}"]`);
          if (el) el.scrollIntoView({ block: 'nearest' });
        };
        tr.onkeydown = e => {
          const i = +tr.dataset.i;
          if (e.key === 'Enter' || e.key === ' ' || e.key === 'Spacebar') {
            e.preventDefault();
            if (sel === i) goGene(i); else { state.sel = i; render(); }
            return;
          }
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            const nx = trs[k + (e.key === 'ArrowDown' ? 1 : -1)];
            if (!nx) return;
            e.preventDefault();
            nx.focus();
            if (sel !== null) { state.sel = +nx.dataset.i; render(); }
          }
        };
      });
      Shortlist.bind(host);
      Glossary.bind(host);
      host.insertAdjacentHTML('beforeend',
        nextStep(T('next.de'), T('next.deBtn'), sel !== null ? '#screening/2' : '#screening'));
    }
    render();
    if (initialSel !== null) { state.sel = initialSel; render(); }
    return { setSel: i => { state.sel = i; render(); } };
  }

  /* ================= 3. CANDIDATE RANKING ================= */
  function ranking(host, state) {
    state = Object.assign({ sel: null, dir: 1 }, state || {});
    function render() {
      const s = DataService.get_validation_summary();
      const A = DataService.get_rankings('STAT-DE-v1');
      const B = DataService.get_rankings('STRING-RWR-v1');
      const top = 30;
      const sel = state.sel;
      const hl = sel !== null ? new Set([sel]) : null;
      const common = A.filter(x => x.g.rwrRank !== null);

      const cell = (g, model) => {
        const r = model === 'stat' ? g.statRank : g.rwrRank;
        const sc = model === 'stat' ? g.statScore : g.rwrScore;
        return `<td class="num">${r ?? '<span class="na">NA</span>'}</td><td class="num">${model === 'stat' ? f(sc, 2) : f(sc, 6)}</td>`;
      };
      const line = (x, model) => {
        const g = x.g;
        return `<tr data-i="${g.i}" class="${sel === g.i ? 'sel' : ''}">
          ${cell(g, model)}
          <td class="sym">${NT(g.symbol || '')}</td>
          <td class="num">${model === 'stat' ? (g.rwrRank ?? '<span class="na">NA</span>') : (g.statRank ?? '<span class="na">NA</span>')}</td>
          <td class="num">${dCell(g)}</td>
          <td class="num">${f(g.lp, 3)}</td><td class="num">${pv(g.fp)}</td>
          <td class="num">${g.degree.toLocaleString()}</td></tr>`;
      };
      const dCell = g => {
        const d = deltaRank(g);
        if (d === null) return '<span class="na">NA</span>';
        const tip = `Δrank = STAT ${g.statRank} − RWR ${g.rwrRank}. The two baselines rank inside `
          + `different universes (dense 1–${dStat.max.toLocaleString()} vs sparse 1–${dRwr.max.toLocaleString()}), `
          + `so this is indicative only.`;
        const body = d > 0 ? `<span class="up">+${d}</span>`
                          : (d < 0 ? `<span class="down">${d}</span>` : '0');
        return `<span title="${esc(tip)}">${body}</span>`;
      };

      const den = DataService.get_rank_denominators();
      const dStat = den['STAT-DE-v1'], dRwr = den['STRING-RWR-v1'];

      host.innerHTML = `
        <h1>Candidate Ranking</h1>
        <p class="lede">Two deterministic, untrained baselines ranked over the same frozen 15,688-node
        universe. Neither is optimised and no winner is selected. Nodes that are not
        <code>analysis_eligible</code> keep their row with <code>reported_rank = NA</code>.</p>

        <div class="grid cards">
          ${card(NT('STAT-DE-v1') + ' ranked', A.length.toLocaleString(), 'analysis-eligible')}
          ${card(NT('STRING-RWR-v1') + ' scored', DataService.load_overview().nodes.toLocaleString(), 'all structural nodes')}
          ${card('Spearman ρ', s.statVsRwr.spearman.toFixed(4), 'STAT-DE vs RWR')}
          ${card('Kendall τ-b', s.statVsRwr.kendall.toFixed(4), 'STAT-DE vs RWR')}
        </div>

        <div class="panel" style="margin-top:14px">
          <div class="two">
            <div id="rkScatter"></div>
            <div id="rkTopk"></div>
          </div>
          <div class="legend">Rank agreement over the common eligible universe. <b>Click a point</b> to
            highlight that gene in both tables below. Overlap figures are the frozen baseline-gate numbers —
            no new selection rule is computed here.</div>
        </div>

        <div id="rkTop1"></div>
        <div id="rkSel"></div>

        <div class="panel">
          <h2 style="margin-top:0">What Δrank compares</h2>
          <p class="lede" style="margin-bottom:10px">Both baselines report a rank for the same
          <b>${dStat.assigned.toLocaleString()}</b> <code>analysis_eligible</code> nodes — but they rank
          those nodes inside <b>different universes</b>, so the two rank scales are not the same scale.</p>
          <div class="tableWrap" style="max-height:none"><table>
            <thead><tr><th>Baseline</th><th>Ranked</th><th>Rank range</th><th>Unranked gaps</th>
              <th>Ranking universe</th></tr></thead>
            <tbody>
              <tr><td class="sym notranslate" translate="no">STAT-DE-v1</td>
                <td class="num">${dStat.assigned.toLocaleString()}</td>
                <td class="num">${dStat.min}–${dStat.max.toLocaleString()}</td>
                <td class="num">${dStat.holes}</td>
                <td>${esc(dStat.universe)}</td></tr>
              <tr><td class="sym notranslate" translate="no">STRING-RWR-v1</td>
                <td class="num">${dRwr.assigned.toLocaleString()}</td>
                <td class="num">${dRwr.min}–${dRwr.max.toLocaleString()}</td>
                <td class="num">${dRwr.holes.toLocaleString()}</td>
                <td>${esc(dRwr.universe)}</td></tr>
            </tbody></table></div>
          <div class="note warn" style="margin-top:10px">
            <b>Δrank = STAT rank − RWR rank is therefore a comparison of two denominators.</b>
            The STAT ranking is dense over the ${dStat.assigned.toLocaleString()} eligible nodes
            (1–${dStat.max.toLocaleString()}). The RWR ranking is sparse — it runs 1–${dRwr.max.toLocaleString()}
            because ${dRwr.holes.toLocaleString()} score-positive but non-eligible nodes occupy positions
            that carry no reported rank. A gene that moves up by <i>d</i> under RWR has not necessarily
            passed exactly <i>d</i> eligible rivals. <b>Δrank is an indicative display of an
            already-computed value, not a calibrated effect size, and no selection rule is derived from
            it.</b> Ranks themselves are the authoritative <code>reported_rank</code> values, reproduced
            verbatim — never recomputed, never renumbered.
          </div>
        </div>

        <div class="panel">
          <h2 style="margin-top:0">Network-promoted candidates</h2>
          <p class="lede" style="margin-bottom:10px">Genes whose ranking <b>improves after network
          propagation</b> — the largest positive rank shift (Δrank = STAT rank − RWR rank). This is a
          display of an already-computed derived value; it introduces no new selection criterion and
          changes no result. A large shift means the gene's network neighbourhood supports it more
          strongly than its own differential expression alone.</p>
          <div class="tableWrap" style="max-height:380px"><table><thead><tr>
            <th>Δrank</th><th>Symbol</th><th>STAT #</th><th>RWR #</th><th>Degree</th>
            <th>log2FC</th><th>FDR</th></tr></thead>
            <tbody id="promoted"></tbody></table></div>
        </div>

        <div class="two">
          <div class="panel"><h2 style="margin-top:0">${NT('STAT-DE-v1')} · top ${top}</h2>
            <div class="tableWrap" style="max-height:420px"><table><thead><tr>
              <th>Rank</th><th>Score</th><th>Symbol</th><th>RWR #</th><th>Δrank</th><th>log2FC</th><th>FDR</th><th>Degree</th>
            </tr></thead><tbody>${A.slice(0, top).map(x => line(x, 'stat')).join('')}</tbody></table></div></div>
          <div class="panel"><h2 style="margin-top:0">${NT('STRING-RWR-v1')} · top ${top}</h2>
            <div class="tableWrap" style="max-height:420px"><table><thead><tr>
              <th>Rank</th><th>Score</th><th>Symbol</th><th>STAT #</th><th>Δrank</th><th>log2FC</th><th>FDR</th><th>Degree</th>
            </tr></thead><tbody>${B.slice(0, top).map(x => line(x, 'rwr')).join('')}</tbody></table></div></div>
        </div>`;

      const rs = host.querySelector('#rkSel');
      if (sel !== null) {
        const g = DataService.get_gene_detail(sel);
        rs.innerHTML = `<div class="panel" style="border-color:#2f5d96"><div class="toolbar" style="margin:0">
          <span class="badge">selected</span><b style="font-size:15px">${NT(g.symbol || g.gene_id)}</b>
          <span class="badge">STAT #${g.statRank ?? 'NA'}</span>
          <span class="badge">RWR #${g.rwrRank ?? 'NA'}</span>
          <span class="badge">degree ${g.degree}</span>
          <span class="badge">log2FC ${f(g.lp, 3)}</span>
          <button class="primary" style="margin-left:auto" id="rkOpen">Open Gene Detail →</button>
          <button id="rkClear">clear</button></div></div>`;
        rs.querySelector('#rkOpen').onclick = () => goGene(sel);
        rs.querySelector('#rkClear').onclick = () => { state.sel = null; render(); };
      } else rs.innerHTML = '';

      Charts.scatter(host.querySelector('#rkScatter'), common.map(x => ({
        i: x.g.i, x: x.g.statRank, y: x.g.rwrRank, opacity: 0.3, highlight: hl,
        tip: `<b>${esc(x.g.symbol || x.g.gene_id)}</b><br>STAT ${x.g.statRank} · RWR ${x.g.rwrRank}<br>degree ${x.g.degree}`,
      })), { title: 'Rank agreement (lower = better)', xlab: 'STAT-DE-v1 rank',
        ylab: 'STRING-RWR-v1 rank', highlight: hl,
        onSelect: i => { state.sel = i; render(); } });

      Charts.topkBar(host.querySelector('#rkTopk'), s.statVsRwr.topk,
        { title: 'Top-k overlap (STAT-DE vs RWR)' });

      // The true rank-1 candidate is never hidden. If it is isolated, say plainly why
      // it can still top the RWR ranking without any propagated network support.
      const top1 = DataService.get_top_candidate();
      const t1 = host.querySelector('#rkTop1');
      if (top1 && top1.degree === 0) {
        t1.innerHTML = `<div class="panel" style="border-color:#5a4420">
          <div class="toolbar" style="margin:0">
            <span class="pill off">ISOLATED · NO_NETWORK_SUPPORT</span>
            <b style="font-size:15px">${NT(top1.symbol || top1.gene_id)}</b>
            <span class="badge">rank 1 · STAT-DE-v1</span>
            <span class="badge">rank 1 · STRING-RWR-v1</span>
            <span class="badge">degree 0</span>
            <button class="primary" style="margin-left:auto" id="t1open">Open Gene Detail →</button>
          </div>
          <div class="note warn" style="margin:10px 0 0">
            This gene tops <b>both</b> rankings yet has <b>no STRING edges</b>. Its RWR rank reflects
            the <b>restart / seed contribution</b> only — it receives no propagated network support,
            because propagation cannot reach or leave an isolated node. <b>That is not network
            validation.</b> It is the strongest expression-only signal sitting outside the retained
            interaction network.
          </div></div>`;
        t1.querySelector('#t1open').onclick = () => goGene(top1.i);
      } else t1.innerHTML = '';

      const promoted = common.map(x => x.g).filter(g => deltaRank(g) !== null && deltaRank(g) > 0)
        .sort((a, b) => deltaRank(b) - deltaRank(a) || a.gene_id.localeCompare(b.gene_id))
        .slice(0, 15);
      host.querySelector('#promoted').innerHTML = promoted.map(g => `<tr data-i="${g.i}">
        <td class="num"><span class="up">+${deltaRank(g)}</span></td>
        <td class="sym">${NT(g.symbol || '')}</td>
        <td class="num">${g.statRank}</td><td class="num">${g.rwrRank}</td>
        <td class="num">${g.degree.toLocaleString()}</td>
        <td class="num">${f(g.lp, 3)}</td><td class="num">${pv(g.fp)}</td></tr>`).join('');

      // A number of the two baselines rather than a verdict about a gene. Exposed as
      // chips so a beginner sees the meaning, and the raw ranks stay in Expert mode.
      host.querySelectorAll('tbody tr').forEach(tr => tr.onclick = e => {
        const i = +tr.dataset.i;
        if (sel === i || e.detail === 2) { goGene(i); return; }
        state.sel = i; render();
      });
      Shortlist.bind(host);
      Glossary.bind(host);
      host.insertAdjacentHTML('beforeend',
        nextStep(T('next.ranking'), T('next.rankingBtn'),
                 sel !== null ? '#network/' + sel + '/1' : '#screening/3'));
    }
    render();
  }

  /* ---------------------------------------------- network interpretation (v1.6)
   * Reads the selected gene's own fields and says what they do and do not support.
   * The two branches are the only two states the frozen graph can be in, and neither
   * one claims a mechanism. */
  function netInterpretation(g) {
    const zh = I18N.getLang() === 'zh';
    const d = deltaRank(g);
    const line = (k, v) => `<div class="metricRow"><span class="mk">${esc(k)}</span>
      <span class="mv">${v}</span></div>`;
    const isolated = g.degree === 0;
    return `<div class="panel">
      <h2 style="margin-top:0">${esc(zh ? '网络解读' : 'Network interpretation')}</h2>
      <div class="two">
        <div>
          ${line(zh ? '度' : 'Degree', g.degree)}
          ${line(zh ? '直接邻居' : 'Direct neighbours', g.degree)}
          ${line('STAT rank', g.statRank ?? 'NA')}
          ${line('RWR rank', g.rwrRank ?? 'NA')}
          ${line(esc(zh ? 'Δrank（仅供参考）' : 'Δrank (indicative)'),
                 d === null ? 'NA' : (d > 0 ? `+${d}` : String(d)))}
          ${line(zh ? '是否孤立' : 'Isolated', isolated ? (zh ? '是' : 'yes') : (zh ? '否' : 'no'))}
        </div>
        <div class="note ${isolated ? 'warn' : ''}" style="margin:0">
          ${isolated
            ? esc(zh
              ? '没有任何 STRING 传播支持。RWR 分数仅反映重启项 / 种子贡献。'
              : 'No STRING propagation support. The RWR score reflects the restart / seed contribution only.')
            : esc(zh
              ? '该基因参与这个固定的 STRING 网络。网络传播可能通过邻居重新分配排名信号。'
              : 'This gene participates in the fixed STRING network. Network propagation may redistribute ranking signal through its neighbours.')}
          <br><br>${esc(zh
            ? '以上都不等于机制已确认。'
            : 'None of the above means a mechanism is confirmed.')}
        </div>
      </div>
    </div>`;
  }

  /* Neighbour evidence table — the reason a node might receive propagated signal, not
   * just the fact that it has edges. */
  function neighbourTable(g) {
    const zh = I18N.getLang() === 'zh';
    const rows = DataService.neighbour_evidence(g.i) || [];
    if (!rows.length) return '';
    return `<div class="panel">
      <h2 style="margin-top:0">${esc(zh ? '直接邻居证据' : 'Neighbour evidence')}
        <span class="na">${rows.length}</span></h2>
      <p class="lede">${esc(zh
        ? '每个邻居各自的可测证据。网络传播信号正是沿这些边分配的。'
        : 'Each neighbour\'s own measurable evidence. These are the edges any propagated signal travels along.')}</p>
      <div class="toolbar">
        <div class="searchWrap"><input id="nbq" placeholder="${esc(zh ? '筛选邻居符号' : 'filter neighbours by symbol')}" style="min-width:220px"></div>
        <span class="spacer">${rows.length} ${esc(zh ? '个邻居' : 'neighbours')}</span>
      </div>
      <div class="tableWrap" style="max-height:380px"><table id="nbTable">
        <thead><tr>
          <th scope="col" data-nbs="symbol" role="button" tabindex="0">${esc(zh ? '基因' : 'Gene')}</th>
          <th scope="col" data-nbs="weight" role="button" tabindex="0">${esc(zh ? '边权' : 'STRING weight')}</th>
          <th scope="col" data-nbs="lp" role="button" tabindex="0">primary log2FC</th>
          <th scope="col" data-nbs="fp" role="button" tabindex="0">primary FDR</th>
          <th scope="col" data-nbs="statRank" role="button" tabindex="0">STAT rank</th>
          <th scope="col" data-nbs="rwrRank" role="button" tabindex="0">RWR rank</th>
          <th scope="col" data-nbs="degree" role="button" tabindex="0">${esc(zh ? '度' : 'Degree')}</th>
        </tr></thead><tbody id="nbBody"></tbody></table></div>
    </div>`;
  }

  function bindNeighbourTable(host) {
    const body = host.querySelector('#nbBody');
    if (!body) return;
    const g = host.__netGene;
    const rows = g ? (DataService.neighbour_evidence(g.i) || []) : [];
    let sortKey = 'weight', asc = false, q = '';
    const renderRows = () => {
      const view = rows
        .filter(r => !q || (r.symbol || '').toUpperCase().includes(q)
                   || r.gene_id.toUpperCase().includes(q))
        .slice().sort((a, b) => {
          const x = a[sortKey], y = b[sortKey];
          if (x === null && y === null) return 0;
          if (x === null) return 1;
          if (y === null) return -1;
          return (typeof x === 'string' ? x.localeCompare(y) : x - y) * (asc ? 1 : -1);
        });
      body.innerHTML = view.map(r => `<tr data-i="${r.node_index}">
        <td class="sym">${NT(r.symbol || r.gene_id)}</td>
        <td class="num">${r.weight.toFixed(3)}</td>
        <td class="num">${f(r.lp, 3)}</td>
        <td class="num">${pv(r.fp)}</td>
        <td class="num">${r.statRank ?? 'NA'}</td>
        <td class="num">${r.rwrRank ?? 'NA'}</td>
        <td class="num">${r.degree}</td></tr>`).join('');
      body.querySelectorAll('tr').forEach(tr => {
        tr.onclick = () => goGene(+tr.dataset.i);
      });
    };
    host.querySelectorAll('[data-nbs]').forEach(th => {
      th.onclick = th.onkeydown = e => {
        if (e && e.type === 'keydown' && !['Enter', ' '].includes(e.key)) return;
        const k = th.dataset.nbs;
        if (sortKey === k) asc = !asc; else { sortKey = k; asc = true; }
        renderRows();
      };
    });
    const qEl = host.querySelector('#nbq');
    if (qEl) qEl.oninput = () => { q = qEl.value.trim().toUpperCase(); renderRows(); };
    renderRows();
  }

  /**
   * Gene -> Protein -> interaction, stated once at the top of the network page.
   *
   * The middle node is the STRING protein the gene maps to. The frozen artifacts carry
   * no canonical protein-name field, so the note under the chain says exactly that —
   * and says the analysis still runs on that protein node, so a reader does not conclude
   * the layer is missing.
   */
  function netChain(g) {
    const zh = I18N.getLang() === 'zh';
    const sym = g ? (g.symbol || g.gene_id) : '—';
    // No .panel wrapper: this now sits inside the network head panel, directly under the
    // gene row and the status line, so the first screen reads gene → status → partners.
    return `<div class="chainPanel">
      <div class="chainRow">
        <div class="chainNode gene"><div class="cnT">${NT(sym)}</div>
          <div class="cnS">${esc(zh ? '基因' : 'Gene')}</div></div>
        <div class="chainArrow">→<div class="caL">${esc(zh ? '编码' : 'encodes')}</div></div>
        <div class="chainNode prot"><div class="cnT">${esc(zh ? '对应蛋白节点' : 'Protein node')}</div>
          <div class="cnS">${esc(zh ? '该基因映射到的 STRING 蛋白节点' : 'the STRING node this gene maps to')}</div></div>
        <div class="chainArrow">→<div class="caL">${esc(zh ? 'STRING 物理互作' : 'interacts with')}</div></div>
        <div class="chainNode net"><div class="cnT">${g ? g.degree : '—'} ${esc(zh ? '个直接互作蛋白'
            : 'direct interaction partners')}</div>
          <div class="cnS">${esc(zh ? '蛋白互作' : 'protein–protein interaction')}</div></div>
      </div>
      <div class="legend chainNote">${esc(zh
        ? '当前数据未提供规范蛋白名称字段。网络分析仍使用该基因映射的 STRING 蛋白节点。'
        : 'The current data provides no canonical protein-name field. Network analysis still '
          + 'uses the STRING protein node this gene maps to.')}</div>
    </div>`;
  }

  /* ================= 4. NETWORK ================= */

  /** Parse `#network/<node_index>[/<hops>]` into a partial state. Returns {} if unusable,
   *  so a hand-edited URL degrades to the default view instead of throwing. */
  function parseNetworkArg(arg) {
    if (!arg) return {};
    const [n, h] = String(arg).split('/');
    const i = Number(n);
    const hops = Number(h);
    const out = {};
    if (Number.isInteger(i) && i >= 0 && i < 15688) out.sel = i;
    if (hops === 1 || hops === 2) out.hops = hops;
    return out;
  }

  function network(host, state) {
    state = Object.assign({ hops: 1, sel: null, forceLarge: false }, state || {});
    function render() {
      const zh = I18N.getLang() === 'zh';
      const sel = state.sel !== null ? DataService.get_gene_detail(state.sel)
                                     : DataService.get_gene_by_any('SNCA');
      const beg = beginner();
      host.innerHTML = `
        <h1 class="titleBeginner">${esc(T('net2.q'))}</h1>
        <h1 class="titleExpert">${esc(T('pg.network'))}</h1>
        <div class="note roleNote">
          <b>${esc(T('net.layer'))}</b>
          <div class="legend" style="margin-top:6px">
            <span>${esc(T('net.layer.gene'))}</span>
            <span>${esc(T('net.layer.prot'))}</span>
          </div>
        </div>
        <p class="lede">${zh
          ? `冻结的 STRING v12 物理互作网络：<b>15,688 个节点</b>、<b>62,672 条无向边</b>。
             整张网络不会一次画完 —— 搜索一个基因，查看它周围的邻域。
             degree 为 0 的节点同样可以完整查询。`
          : `The frozen STRING v12 physical-PPI graph: <b>15,688 nodes</b>,
             <b>62,672 undirected edges</b>. The full graph is never drawn at once — search a gene and
             explore its neighbourhood. Degree-zero nodes remain fully queryable.`}</p>
        ${help('network')}

        <div class="panel">
          <div class="toolbar">
            <div class="searchWrap"><input id="nq" placeholder="${esc(T('pg.net.search'))}" style="min-width:320px"></div>
            ${beg
              ? `<label class="advToggle"><input type="checkbox" id="nAdv" ${state.hops === 2 ? 'checked' : ''}>
                   ${esc(T('net.adv'))}</label>`
              : `<label>hops <select id="nh">
                   <option value="1" ${state.hops === 1 ? 'selected' : ''}>1-hop</option>
                   <option value="2" ${state.hops === 2 ? 'selected' : ''}>2-hop</option></select></label>`}
            <button id="pickIso">${esc(T('pg.net.iso'))}</button>
          </div>
        </div>
        <div id="netHost"></div>`;

      const adv = host.querySelector('#nAdv');
      if (adv) adv.onchange = e => {
        state.hops = e.target.checked ? 2 : 1; state.forceLarge = false; render();
      };

      bindSearch(host.querySelector('#nq'), g => { state.sel = g.i; state.forceLarge = false; render(); });
      const hopSel = host.querySelector('#nh');
      if (hopSel) hopSel.onchange = e => {
        state.hops = +e.target.value; state.forceLarge = false; render();
      };
      host.querySelector('#pickIso').onclick = () => {
        const iso = DataService.ready().byIdx.filter(Boolean).find(g => g.degree === 0 && g.eligP);
        if (iso) { state.sel = iso.i; state.forceLarge = false; render(); }
      };

      if (!sel) return;
      host.__netGene = sel;   // the neighbour table is bound after the markup is placed
      // Exact neighbourhood size is always computed; only the drawing is budgeted.
      const net = DataService.get_network_neighborhood(sel.i, state.hops,
        { confirmLarge: state.forceLarge });
      const nH = host.querySelector('#netHost');

      // First screen order, fixed by the v1.8.1 brief: the gene, the network status as a
      // plain statement, the number of direct partners — then the drawing. In beginner
      // mode the raw rank numbers are replaced by the explanatory labels the Guided
      // Screening page uses; Expert mode keeps degree and the numbers.
      const connected = sel.degree > 0;
      const head = `<div class="toolbar" style="margin-bottom:10px">
        <span class="nhLabel">${esc(zh ? '当前基因' : 'Current gene')}</span>
        <b style="font-size:16px">${NT(sel.symbol || sel.gene_id)}</b>
        <span class="mono" style="color:var(--dim)">${NT(sel.gene_id)}</span>
        ${beg ? Screening.tagChips(sel, null)
              : `<span class="badge">degree ${sel.degree}</span>
                 <span class="badge">STAT #${sel.statRank ?? 'NA'}</span>
                 <span class="badge">RWR #${sel.rwrRank ?? 'NA'}</span>`}
        ${Shortlist.button(sel.i)}
        <button class="primary" style="margin-left:auto" id="nOpen">${esc(T('pg.openGene'))}</button></div>
      <div class="netState ${connected ? 'on' : 'off'}">
        <span class="nsK">${esc(zh ? '蛋白网络状态' : 'Protein-network status')}</span>
        <span class="nsV">${esc(connected ? (zh ? '有互作连接' : 'Connected')
                                          : (zh ? '无互作连接' : 'Isolated'))}</span>
        <span class="nsN">${esc(connected
          ? (zh ? `${sel.degree} 个直接互作蛋白 —— 在固定网络中已记录`
                : `${sel.degree} direct interaction partners recorded in the fixed network`)
          : (zh ? '固定网络中没有已记录的互作边，因此得不到网络传播支持'
                : 'no recorded interaction edge in the fixed network, so it receives no propagated support'))}</span>
      </div>
      ${netChain(sel)}`;

      if (net.isolated) {
        nH.innerHTML = `<div class="panel">${head}
          <div class="note warn">${zh
            ? `<b>${NT(sel.symbol || sel.gene_id)} 是无互作连接的节点。</b>
               degree 0 —— 在固定网络中没有一条保留的 STRING 物理互作边把它与其他节点相连。
               它仍然是 15,688 个结构节点中的正式一员，仍然带有自己的差异表达统计量与两套基线分数，
               并且被有意保留：网络孤立不是排除理由，degree 为 0 的基因不会从本应用中消失。`
            : `<b>${NT(sel.symbol || sel.gene_id)} is an isolated node.</b>
               Degree 0 — no retained STRING physical edge links it to another node in the frozen universe.
               It is still a full member of the 15,688-node structural universe, still carries its DE
               statistics and both baseline scores, and is deliberately retained: graph isolation is not an
               exclusion reason, so degree-zero genes never disappear from this app.`}</div>
          <div class="two" style="margin-top:12px">
            <div><h2 style="margin-top:0">Primary · MPTP vs Saline</h2>
              ${row('baseMean', f(sel.bp, 2))}${row('log2FC', f(sel.lp, 4))}
              ${row('p-value', pv(sel.pp))}${row('FDR', pv(sel.fp))}</div>
            <div><h2 style="margin-top:0">Validation · PFF vs PBS</h2>
              ${row('baseMean', f(sel.bv, 2))}${row('log2FC', f(sel.lv, 4))}
              ${row('p-value', pv(sel.pv))}${row('FDR', pv(sel.fv))}</div>
          </div></div>`;
      } else if (net.overBudget && !state.forceLarge) {
        // The size is exact. We stop before layout, because a 2-hop on a hub is 2,273 nodes
        // and 25,760 induced edges — drawing that unannounced would freeze the page and,
        // worse, would look like the whole neighbourhood.
        nH.innerHTML = `<div class="panel">${head}
          <div class="note warn" style="margin-top:0">${zh
            ? `<b>这个 ${state.hops} 跳邻域很大：${net.size.nodes.toLocaleString()} 个节点、
               ${net.size.edges.toLocaleString()} 条内部边。</b>
               这些数字是精确值 —— 不是估计，也没有过滤掉任何东西。
               点击下方按钮会用标注好的渲染上限绘制同一个邻域；邻域本身不会因此改变。`
            : `<b>This ${state.hops}-hop neighbourhood is large: ${net.size.nodes.toLocaleString()} nodes
               and ${net.size.edges.toLocaleString()} induced edges.</b>
               Those counts are exact — they are not an estimate and nothing has been filtered out.
               Confirming below draws the same neighbourhood with the rendering budget noted; it does not
               change what the neighbourhood is.`}
          </div>
          <div class="grid cards" style="margin:14px 0">
            ${card(zh ? '邻域节点' : 'Neighbourhood nodes', net.size.nodes.toLocaleString(),
                   zh ? `精确值 · ${state.hops} 跳` : `exact · ${state.hops}-hop`)}
            ${card(zh ? '邻域内部边' : 'Induced edges', net.size.edges.toLocaleString(),
                   zh ? '精确值 · 邻域之内' : 'exact · within neighbourhood')}
            ${card(zh ? '直接互作蛋白' : 'Degree', sel.degree.toLocaleString(),
                   zh ? '固定网络' : 'frozen graph')}
            ${card(zh ? '渲染上限' : 'Render budget',
                   `${DataService.RENDER_LIMIT.maxNodes.toLocaleString()} ${zh ? '个节点' : 'nodes'} / ${DataService.RENDER_LIMIT.maxEdges.toLocaleString()} ${zh ? '条边' : 'edges'}`,
                   zh ? '仅用于绘制' : 'drawing only')}
          </div>
          <div class="toolbar">
            <button class="primary" id="nDraw">${zh ? '按渲染上限绘制' : 'Draw with rendering limit'}</button>
            <button id="nBack">${zh ? '停留在 1 跳' : 'Stay on 1-hop'}</button>
          </div>
          <div class="legend" style="margin-top:10px">${zh
            ? `边裁剪只保留<b>权重最高</b>的边，并在图上标注。它是<b>渲染</b>限制 ——
               上方的邻域成员是完整的，没有施加任何科学筛选。`
            : `Edge capping keeps the <b>highest-weight</b> edges and is flagged on the chart. It is a
               <b>rendering</b> limit — the neighbourhood membership above is complete and no scientific
               filter is applied.`}</div>
        </div>`;
        nH.querySelector('#nDraw').onclick = () => { state.forceLarge = true; render(); };
        nH.querySelector('#nBack').onclick = () => { state.hops = 1; state.forceLarge = false; render(); };
      } else {
        const byHop = net.nodes.filter(n => n.hop === 1).length;
        const byHop2 = net.nodes.filter(n => n.hop === 2).length;
        // Metric strip. Beginner mode names each metric in plain Chinese; Expert mode
        // keeps the technical field names (degree, STAT rank, RWR rank) — same values.
        const ML = beg
          ? { nodes: zh ? '当前显示节点' : 'Nodes shown',
              edges: zh ? '当前显示互作' : 'Edges shown',
              deg: zh ? '直接互作蛋白' : 'Direct interaction partners',
              stat: zh ? '表达排名' : 'Expression rank',
              rwr: zh ? '网络排名' : 'Network rank' }
          : { nodes: 'Nodes shown', edges: 'Edges shown', deg: 'Degree',
              stat: 'STAT rank', rwr: 'RWR rank' };
        nH.innerHTML = `<div class="panel">${head}
          <div class="grid cards" style="margin-bottom:10px">
            ${card(esc(ML.nodes), net.nodes.length.toLocaleString(), state.hops === 2 ? `${byHop} × 1-hop + ${byHop2} × 2-hop` : '1-hop')}
            ${card(esc(ML.edges), net.edges.length.toLocaleString(),
                   net.truncated ? (zh ? `${net.size.edges.toLocaleString()} 条内部边中的一部分` : `of ${net.size.edges.toLocaleString()} induced`)
                                 : (zh ? '邻域之内' : 'within neighbourhood'))}
            ${card(esc(ML.deg), sel.degree.toLocaleString(), zh ? '固定网络' : 'frozen graph')}
            ${card(esc(ML.stat), sel.statRank ?? 'NA', zh ? '基于表达' : 'primary')}
            ${card(esc(ML.rwr), sel.rwrRank ?? 'NA', zh ? '经网络传播' : 'propagated')}
            ${beg ? '' : card('MPTP log2FC', f(sel.lp, 3), zh ? '主队列' : 'primary')}
          </div>
          ${net.truncated ? `<div class="note" style="margin-bottom:10px">${zh
            ? `<b>已应用渲染上限。</b>在 ${net.size.edges.toLocaleString()} 条内部边中，只绘制权重最高的
               ${net.edges.length.toLocaleString()} 条；邻域内全部 ${net.nodes.length.toLocaleString()}
               个节点都会画出。这是<b>显示</b>限制，不是科学筛选 —— 邻域本身没有改变，
               上面的计数都是精确值。`
            : `<b>Rendering limit applied.</b> Showing the ${net.edges.length.toLocaleString()}
               highest-weight of ${net.size.edges.toLocaleString()} induced edges. All
               ${net.nodes.length.toLocaleString()} neighbourhood nodes are drawn. This is a
               <b>display</b> limit, not a scientific filter — the neighbourhood itself is unchanged and
               the counts above are the exact ones.`}
          </div>` : ''}
          <div id="netSvg"></div>
          <div class="legend">${zh
            ? '点击任意节点即可把它设为新的中心。节点大小 ∝ √degree，边宽 ∝ 权重。'
            : 'Click any node to re-centre on it. Node size ∝ √degree · edge width ∝ weight.'}</div></div>`;
        Charts.network(nH.querySelector('#netSvg'), net, { onSelect: i => { state.sel = i; render(); } });
      }
      const o = host.querySelector('#nOpen');
      if (o) o.onclick = () => goGene(sel.i);
      // First screen: the drawing, then the neighbour evidence, then the technical panel.
      // Beginner mode folds the latter away so the page ends on what the reader came for.
      const neighbours = neighbourTable(sel);
      host.insertAdjacentHTML('beforeend', beg && neighbours
        ? `<details class="techFold networkEvidenceFold"><summary>${esc(zh ? '邻居的技术证据' : 'Technical evidence for neighbours')}</summary>${neighbours}</details>`
        : neighbours);
      const interp = netInterpretation(sel);
      host.insertAdjacentHTML('beforeend', beg
        ? `<details class="techFold"><summary>${esc(zh ? '技术细节' : 'Technical details')}</summary>${interp}</details>`
        : interp);
      Shortlist.bind(host);
      Glossary.bind(host);
      bindNeighbourTable(host);
      host.insertAdjacentHTML('beforeend', beg
        ? nextStep(zh ? '接下来查看这个候选涉及哪些已知生物过程。' : 'Next, see which known biological processes this candidate is involved in.',
                   zh ? '查看通路 →' : 'Inspect pathways →', sel ? '#pathway/' + sel.i : '#pathway')
        : nextStep(T('next.network'), T('next.networkBtn'), sel ? '#validation/' + sel.i : '#validation'));
    }
    render();
  }

  /* ================= 5. VALIDATION ================= */
  function validation(host, state) {
    state = Object.assign({ focus: null }, state || {});
    const s = DataService.get_validation_summary();
    const g = DataService.ready().byIdx.filter(Boolean)
      .filter(x => x.eligP && x.eligV && x.lp !== null && x.lv !== null);
    const k100 = s.perK[s.perK.length - 1];
    const focusG = state.focus !== null ? DataService.get_gene_detail(state.focus) : null;
    const vsChip = (g2) => {
      const vs = DataService.validation_state(g2);
      const label = { non_near_zero: T('vs.present'), near_zero: T('vs.near'),
                      not_comparable: T('vs.missing') }[vs.id];
      const cls = { non_near_zero: 'v-green', near_zero: 'v-amber',
                    not_comparable: 'v-grey' }[vs.id];
      return `<span class="valState ${cls}"><span class="vsTag">${esc(label)}</span></span>`;
    };

    host.innerHTML = `
      <h1 class="titleBeginner">${esc(T('val2.q'))}</h1>
      <h1 class="titleExpert">Validation</h1>
      <div class="note roleNote">
        <b>${esc(T('val.roles'))}</b>
        <div class="two" style="margin-top:8px">
          <div class="roleCard disc"><span class="rcT">${esc(T('val.disc'))}</span>
            <span class="rcD">MPTP vs Saline · 4 vs 4</span>
            <span class="rcU">${esc(T('val.discUse'))}</span></div>
          <div class="roleCard val"><span class="rcT">${esc(T('val.val'))}</span>
            <span class="rcD">PFF vs PBS · 5 vs 5</span>
            <span class="rcU">${esc(T('val.valUse'))}</span></div>
        </div>
      </div>
      <p class="lede">Primary (MPTP vs Saline) against the external biological validation cohort
      (PFF vs PBS). The validation cohort never influences eligibility, graph membership or any ranking —
      it is reported after the fact.</p>

      ${focusG ? `<div class="panel focusPanel">
        <div class="toolbar" style="margin:0">
          <span class="badge">${esc(T('val.focus'))}</span>
          <b style="font-size:16px">${NT(focusG.symbol || focusG.gene_id)}</b>
          <span class="mono" style="color:var(--dim)">${NT(focusG.gene_id)}</span>
          ${vsChip(focusG)}
          <span class="badge">log2FC ${f(focusG.lv, 4)}</span>
          <span class="badge">FDR ${pv(focusG.fv)}</span>
          ${Shortlist.button(focusG.i)}
          <button style="margin-left:auto" id="vFocusOpen">${esc(T('val.openGene'))}</button>
          <button id="vFocusClear">${esc(T('val.clearFocus'))}</button>
        </div>
        <div class="legend" style="margin-top:8px">
          ${esc(T('val.stateRule'))}
          <span class="valState v-green"><span class="vsTag">${esc(T('vs.present'))}</span></span>
          <span class="valState v-amber"><span class="vsTag">${esc(T('vs.near'))}</span></span>
          <span class="valState v-grey"><span class="vsTag">${esc(T('vs.missing'))}</span></span>
        </div></div>` : ''}

      <div class="grid cards">
        ${card('Usable in both', s.universe.usableBoth.toLocaleString(), 'nodes measurable in both cohorts')}
        ${card('Signed-effect ρ', s.effect.spearman.toFixed(4), 'Spearman')}
        ${card('Signed-effect τ-b', s.effect.kendall.toFixed(4), 'Kendall')}
        ${card(`Top-${k100.k} overlap`, String(k100.topKOverlap), 'primary ∩ validation')}
      </div>

      <div class="panel" style="margin-top:14px">
        <div class="two">
          <div id="vScatter"></div>
          <div id="vTopk"></div>
        </div>
        <div class="legend"><i style="background:#e3b341"></i>validation |log2FC| &lt; ${s.nearZero.threshold}
          — near-zero, the sign is not meaningful. Dashed lines mark the diagonals.
          <b>Click a point</b> to open that gene.</div>
      </div>

      <div class="panel">
        <h2 style="margin-top:0">Three denominators — read the column, not the headline</h2>
        <p class="lede" style="margin-bottom:10px">A single “n” hides the whole story here. The protocol
        requests a top-k; part of that top-k has no measurement in the validation cohort at all; and only
        the measured part can be checked for sign agreement. The three are shown separately and are
        <b>never</b> collapsed into one rate.</p>
        <div class="tableWrap" style="max-height:none"><table>
          <thead><tr>
            <th>k <span class="na">requested</span></th>
            <th>Requested k</th>
            <th>Comparable n <span class="na">measurable in both</span></th>
            <th>Concordant n</th>
            <th>Rate over comparable</th>
            <th>Rate over requested k <span class="na">authoritative</span></th>
            <th>Top-k overlap</th>
          </tr></thead>
          <tbody>${s.perK.map(r => `<tr>
            <td class="num">${r.k}</td>
            <td class="num">${r.requestedK}</td>
            <td class="num">${r.comparableN}</td>
            <td class="num">${r.concordantN}</td>
            <td class="num">${r.comparableN ? (r.concordantN / r.comparableN).toFixed(4) : '—'}
              <span class="na">sign-on-noise</span></td>
            <td class="num">${r.authoritativeConcordant} / ${r.requestedK}
              <span class="na">${r.authoritativeConcordance.toFixed(4)}</span></td>
            <td class="num">${r.topKOverlap}</td></tr>`).join('')}</tbody></table></div>
        <div class="note warn" style="margin-top:12px">
          <b>“0 concordant” is not “opposite biology”.</b> ${k100.requestedK - k100.comparableN} of the
          primary top-${k100.requestedK} have no validation measurement, and most of the rest are
          essentially unchanged in PFF. See the near-zero check below.
        </div>
      </div>

      <div class="panel">
        <h2 style="margin-top:0">Why the sign-concordance number misleads</h2>
        <div class="note warn">
          Applying <code>sign()</code> to a <i>shrunken, near-zero</i> estimate is numerically arbitrary.
          Over the ${s.nearZero.universe} — <b>${s.nearZero.k}</b> genes —
          <b>${s.nearZero.nearZeroN}</b> have |validation log2FC| &lt; ${s.nearZero.threshold}: essentially
          unchanged in PFF, neither concordant nor reversed in any meaningful sense.
        </div>
        <div class="two" style="margin-top:12px">
          <div>
            <h2 style="margin-top:0">Near-zero check <span class="na">universe above</span></h2>
            ${row(`With |validation LFC| &lt; ${s.nearZero.threshold}`,
                  `<b>${s.nearZero.nearZeroN} / ${s.nearZero.k}</b>`)}
            ${row('Sign concordance, as-is', `${s.nearZero.asIsConcordantN} / ${s.nearZero.k}`)}
            ${row('Sign concordance, validation signs flipped',
                  `${s.nearZero.flippedConcordantN} / ${s.nearZero.k}`)}
          </div>
          <div>
            <h2 style="margin-top:0">Genome-wide <span class="na">across ${s.genomeWide.n.toLocaleString()} measurable nodes</span></h2>
            ${row('Sign concordance, as-is', `${(s.genomeWide.asIs * 100).toFixed(1)} %`,
                  `${Math.round(s.genomeWide.asIs * s.genomeWide.n).toLocaleString()} nodes`)}
            ${row('Sign concordance, flipped', `${(s.genomeWide.flipped * 100).toFixed(1)} %`,
                  `${Math.round(s.genomeWide.flipped * s.genomeWide.n).toLocaleString()} nodes`)}
            ${row('Interpretation', 'a modest opposing lean, not an inversion')}
          </div>
        </div>
        <div class="note" style="margin-top:12px">
          <b>Descriptive interpretation only.</b> The MPTP/Saline primary effect signature is largely absent
          from the PFF/PBS cohort. That is plausible — MPTP and PFF are mechanistically different PD models —
          but no causal claim is made, and no parameter, threshold or ranking was adjusted in response.
        </div>
        <div class="legend" style="margin-top:10px">
          Requested k and concordant n are read from
          <code>${esc(s.source.file)}</code> (sha256 <span class="mono">${esc(String(s.source.sha256).slice(0, 16))}…</span>,
          cross-checked against <code>${esc(s.source.cross_check_file)}</code>). Comparable n and the
          near-zero / genome-wide checks are derived in the app from the frozen per-node effect sizes,
          because no artifact stores them; the test suite pins them to the published baseline-gate values.
        </div>
      </div>`;

    Charts.scatter(host.querySelector('#vScatter'), g.map(x => ({
      i: x.i, x: x.lp, y: x.lv, opacity: 0.28,
      color: (Math.abs(x.lv) < s.nearZero.threshold ? '#e3b341' : '#38d39f'),
      tip: `<b>${esc(x.symbol || x.gene_id)}</b><br>primary ${f(x.lp, 4)} · validation ${f(x.lv, 4)}`,
    })), { title: 'Shrunken log2FC — primary vs validation', xlab: 'primary log2FC (MPTP/Saline)',
      ylab: 'validation log2FC (PFF/PBS)', diag: true, onSelect: goGene });
    const clear = host.querySelector('#vFocusClear');
    if (clear) clear.onclick = () => { location.hash = '#validation'; };
    const openG = host.querySelector('#vFocusOpen');
    if (openG) openG.onclick = () => goGene(focusG.i);
    Shortlist.bind(host);
    Glossary.bind(host);

    Charts.topkBar(host.querySelector('#vTopk'), s.perK.map(r => ({ k: r.k, overlap: r.topKOverlap })),
      { title: 'Primary ∩ validation top-k overlap' });
    host.insertAdjacentHTML('beforeend',
      nextStep(T('next.validation'), T('next.validationBtn'), '#gene/0'));
  }

  /* ================= 6. GENE DETAIL ================= */
  /* ================= 7. GENE — seven-section evidence page (v1.7) =================
   * The order is deliberate: what the gene is, what changed, how it was ranked, what
   * its protein is connected to, what the other model shows, what processes it sits in,
   * and whether existing PD research mentions it. Each section opens with a sentence
   * built from the frozen fields, and keeps the raw numbers in a fold.
   */
  const G7 = {
    en: {
      evidence: '— evidence page',
      s1: 'What this gene is', s2: 'What happened in the MPTP model',
      s3: 'How it was ranked', s4: 'Its protein and the network',
      s5: 'The other PD model (PFF)', s6: 'Biological processes it sits in',
      s7: 'Existing PD research',
      l1: (g) => `${NT(g.symbol || g.gene_id)} is one of the 15,688 genes in the fixed structural `
        + `universe. It corresponds to the mouse gene ${NT(g.mouse || '(not mapped)')}, which is the `
        + `gene actually measured in the experiment.`,
      l2: (g, dir, mult) => g.lp === null
        ? 'This gene has no measurable expression value in the MPTP model, so nothing can be said about its change.'
        : `In the MPTP model this gene reads ${dir}${mult}, and the statistical evidence for that `
          + `change has FDR ${pv(g.fp)}. This is a measurement in one disease model — it is not a `
          + `claim about what the gene does.`,
      l3: (g, d) => `Two rankings cover the same genes. On expression alone it sits at position `
        + `${g.statRank ?? 'NA'}; once the interaction network is taken into account it sits at `
        + `${g.rwrRank ?? 'NA'}${d === null ? '' : ` (a shift of ${d > 0 ? '+' : ''}${d})`}. `
        + `The two rankings do not cover exactly the same set of positions, so that shift is `
        + `indicative rather than exact.`,
      l4: (g) => g.degree > 0
        ? `The protein this gene encodes has ${g.degree} recorded interaction partner`
          + `${g.degree === 1 ? '' : 's'} in the STRING physical network. That is context: it says `
          + `which proteins are known to touch each other, not what the interaction does.`
        : `This gene's protein has no recorded interaction partner in the current network. It is `
          + `kept deliberately — being isolated from the network does not remove a gene from the `
          + `universe — but it receives no support from network propagation.`,
      l5: (g) => {
        const vs = DataService.validation_state(g);
        if (vs.id === 'not_comparable') return 'This gene was not measured in the PFF cohort, so it cannot be checked in the second model.';
        if (vs.id === 'near_zero') return `In the PFF model this gene is essentially unchanged (log2FC ${f(g.lv, 3)}). `
          + 'Because that value is so close to zero its sign is not meaningful — it does not mean the two models disagree.';
        return `In the PFF model — a different Parkinson's disease model — this gene still shows a `
          + `measurable change (log2FC ${f(g.lv, 3)}, FDR ${pv(g.fv)}). That is a change in size, not `
          + `proof that the finding replicates, and not biological validation.`;
      },
      l6: (m, n) => (!m || !n)
        ? 'This gene carries no annotation in the loaded pathway reference.'
        : `It appears in ${n} biological processes and pathways, including `
          + (m.slice(0, 2).map(p => NT(p.name)).join(' and ') || '—') + '. These are lookups of which '
          + 'processes contain the gene — not a claim that the process is enriched or important.',
      l7: (ev) => !ev || ev.gwas_associations === 0
        ? 'Existing PD genetics, as loaded here, does not mention this gene. That is absence of '
          + 'evidence in these sources — not evidence that the gene is novel, and not evidence '
          + 'that it is unrelated to PD.'
        : `This gene is already reported in published Parkinson's disease genetics: `
          + `${ev.gwas_associations} association${ev.gwas_associations === 1 ? '' : 's'} across `
          + `${ev.studies.length} studies. That is external context — it did not influence any `
          + `ranking here, and it does not make the gene a target.`,
      fold: 'Technical details',
      none: 'None recorded',
      el: 'Analysis eligible',
    },
    zh: {
      evidence: '— 证据页',
      s1: '这个基因是什么', s2: '在 MPTP 模型中发生了什么',
      s3: '它是如何被排名的', s4: '它对应的蛋白与网络',
      s5: '另一个 PD 模型（PFF）', s6: '它涉及哪些生物过程',
      s7: '已有 PD 研究',
      l1: (g) => `${NT(g.symbol || g.gene_id)} 是固定的 15,688 个结构节点之一，对应小鼠基因 `
        + `${NT(g.mouse || '（未映射）')} —— 实验中实际测量的是后者。`,
      l2: (g, dir, mult) => g.lp === null
        ? '该基因在 MPTP 模型中没有可测量的表达值，因此无法说明其变化。'
        : `在 MPTP 模型中，该基因表达${dir}${mult}；这一变化的统计证据为 FDR ${pv(g.fp)}。`
          + '这只是在一个疾病模型中的测量结果，并不说明该基因的功能。',
      l3: (g, d) => `两套排名覆盖同一批基因。仅看表达时它位于第 ${g.statRank ?? 'NA'} 位；`
        + `纳入互作网络后位于第 ${g.rwrRank ?? 'NA'} 位`
        + `${d === null ? '' : `（变化 ${d > 0 ? '+' : ''}${d}）`}。`
        + '两套排名覆盖的位置集合并不完全相同，因此这一变化仅供参考，不是精确位移。',
      l4: (g) => g.degree > 0
        ? `该基因编码的蛋白在 STRING 物理网络中有 ${g.degree} 个已记录的互作伙伴。`
          + '这只是背景信息：它说明哪些蛋白已知会相互接触，并不说明该互作有什么功能。'
        : '该基因对应的蛋白在当前网络中没有已记录的互作伙伴。它被有意保留 —— '
          + '与网络隔离不会把基因从全集中移除 —— 但它得不到任何网络传播支持。',
      l5: (g) => {
        const vs = DataService.validation_state(g);
        if (vs.id === 'not_comparable') return '该基因在 PFF 队列中没有测量值，因此无法在第二个模型中检查。';
        if (vs.id === 'near_zero') return `在 PFF 模型中该基因基本没有变化（log2FC ${f(g.lv, 3)}）。`
          + '由于该值非常接近零，其符号没有意义 —— 这并不代表两个模型结论相反。';
        return `在 PFF 模型（另一种帕金森病模型）中，该基因仍可测得变化`
          + `（log2FC ${f(g.lv, 3)}，FDR ${pv(g.fv)}）。这只是幅度的变化，不等于结果可重复，也不等于生物学验证。`;
      },
      l6: (m, n) => (!m || !n)
        ? '该基因在当前加载的通路参考层中没有注释。'
        : `它出现在 ${n} 个生物过程与通路中，包括 `
          + (m.slice(0, 2).map(p => NT(p.name)).join('、') || '—')
          + '。这些是“该基因属于哪些过程”的查询结果 —— 并不表示该过程被富集或更重要。',
      l7: (ev) => !ev || ev.gwas_associations === 0
        ? '此处加载的 PD 遗传学来源没有提到该基因。这只是这些来源中缺少证据 —— '
          + '既不表示该基因新颖，也不表示它与 PD 无关。'
        : `该基因已出现在已发表的帕金森病遗传学研究中：${ev.studies.length} 项研究、`
          + `${ev.gwas_associations} 条关联。这属于外部背景信息 —— 它没有影响此处的任何排名，`
          + '也不代表该基因是治疗靶点。',
      fold: '技术细节',
      none: '无记录',
      el: '可分析',
    },
  };

  function geneSevenSections(g, nb) {
    const zh = I18N.getLang() === 'zh';
    const L = G7[zh ? 'zh' : 'en'];
    const p = DataService.foldPhrase(g.lp);
    const dir = p ? (p.lfc > 0 ? (zh ? '高于对照' : 'higher than control')
      : (p.lfc < 0 ? (zh ? '低于对照' : 'lower than control') : (zh ? '接近对照' : 'close to control'))) : '';
    const mult = (p && Math.abs(p.lfc) > 0.05)
      ? (zh ? `（约 ${p.multiple.toFixed(2)} 倍）` : ` (about ${p.multiple.toFixed(2)}×)`) : '';
    const d = deltaRank(g);
    const mem = (typeof Pathways !== 'undefined' && Pathways.ready()) ? Pathways.forGene(g.gene_id) : null;
    const allPw = mem ? mem.reactome.concat(mem.gobp) : [];
    const ev = (typeof PdEvidence !== 'undefined' && PdEvidence.ready()) ? PdEvidence.forGene(g.gene_id) : null;

    // `lead` is interpolated as markup, not escaped: the sentence is built in this module
    // from developer-written text plus numbers, and the only data values inside it — gene
    // symbols, Ensembl ids, mouse ids, pathway names — arrive already escaped through
    // NT(), which is also what keeps a browser translation from rewriting them.
    const sec = (n, cls, title, lead, foldHtml) => `<section class="evSection ${cls}">
      <div><span class="evN">${n}</span><h2>${esc(title)}</h2></div>
      <p class="evLead">${lead}</p>
      ${foldHtml ? `<details class="techFold"><summary>${esc(L.fold)}</summary>${foldHtml}</details>` : ''}
    </section>`;

    const facts = pairs => `<div class="evFacts">${pairs.map(([k, v]) =>
      `<span><b>${k}</b>${v}</span>`).join('')}</div>`;

    const s1 = sec(1, 's1', L.s1, L.l1(g), facts([
      ['Ensembl', `<span class="mono">${NT(g.gene_id)}</span>`],
      ['Mouse', `<span class="mono">${NT(g.mouse || 'NA')}</span>`],
      ['node_index', g.i],
      [L.el, g.eligP ? '<span class="pill on">TRUE</span>' : '<span class="pill off">FALSE</span>'],
    ]));

    const s2 = sec(2, 's2', L.s2, L.l2(g, dir, mult), facts([
      ['baseMean', f(g.bp, 2)], ['log2FC', f(g.lp, 4)],
      ['p-value', pv(g.pp)], ['FDR', pv(g.fp)],
    ]));

    const s3 = sec(3, 's3', L.s3, L.l3(g, d), facts([
      [NT('STAT-DE-v1'), `#${g.statRank ?? 'NA'}`],
      [NT('STRING-RWR-v1'), `#${g.rwrRank ?? 'NA'}`],
      ['Δrank', d === null ? 'NA' : (d > 0 ? `+${d}` : String(d))],
      [zh ? '排名全集' : 'Rank universes', zh ? '两套不同' : 'two different sets'],
    ]));

    const s4 = sec(4, 's4', L.s4, L.l4(g), facts([
      ['degree', g.degree],
      [zh ? '互作伙伴' : 'Partners', g.degree],
      [zh ? '网络背景' : 'Context', g.degree > 0
        ? (zh ? '连通' : 'connected') : (zh ? '孤立' : 'isolated')],
    ]) + `<div id="gNet"></div>
      <div class="legend">${esc(zh ? '点击任意节点可跳转到该基因。' : 'Click any node to jump to it.')}</div>`);

    const s5 = sec(5, 's5', L.s5, L.l5(g),
      facts([['log2FC', f(g.lv, 4)], ['FDR', pv(g.fv)],
        [zh ? '状态' : 'State', Screening.validationChip(g, { compact: true })]])
      + `<div style="margin-top:10px">${pairedPanel(g)}</div>`);

    const s6 = sec(6, 's6', L.s6, L.l6(allPw, allPw.length),
      mem ? `<div class="two">
        <div><h3 class="miniH">Reactome <span class="na">${mem.reactome.length}</span></h3>
          ${pathMini(mem.reactome)}</div>
        <div><h3 class="miniH">GO BP <span class="na">${mem.gobp.length}</span></h3>
          ${pathMini(mem.gobp)}</div></div>
        <div class="toolbar" style="margin-top:8px">
          <a class="btnLink" href="#pathway/${g.i}">${esc(zh ? '打开通路页 →' : 'Open the pathway page →')}</a>
        </div>` : `<div class="na">${esc(L.none)}</div>`);

    const s7 = sec(7, 's7', L.s7, L.l7(ev), ev && ev.gwas_associations > 0
      ? facts([['GWAS', ev.gwas_associations],
          ['min p', ev.strongest_p === null ? 'NA' : ev.strongest_p.toExponential(2)],
          [zh ? '研究' : 'Studies', ev.studies.length]])
        + `<div class="legend"><span class="mono">${NT(ev.studies.slice(0, 5).join(', '))}</span>
          ${ev.studies.length > 5 ? `<span class="na">+${ev.studies.length - 5}</span>` : ''}</div>
           <div class="toolbar" style="margin-top:8px">
             <a class="btnLink" href="#pd/${g.i}">${esc(zh ? '打开 PD 证据页 →' : 'Open the PD evidence page →')}</a>
           </div>`
      : `<div class="na">${esc(zh ? '当前参考层中未找到该基因。' : 'Not found in the loaded reference.')}</div>`);

    return `<div class="panel">${s1}${s2}${s3}${s4}${s5}${s6}${s7}</div>`;
  }

  function pathMini(list) {
    if (!list.length) return `<div class="na">—</div>`;
    return `<div class="pathList">${list.slice(0, 12).map(p =>
      `<div class="pathRow"><span class="pn">${NT(p.name)}</span>
        <span class="pb">${p.bg !== null ? p.bg.toLocaleString() : ''}</span></div>`).join('')}
      ${list.length > 12 ? `<div class="na">+${list.length - 12}</div>` : ''}</div>`;
  }

  /* A deliberately constrained evidence assistant. It does not call an LLM, infer a
   * score, or add a result: every answer is the same field-bound sentence already used
   * in the seven evidence sections below. Its job is navigation and comprehension. */
  function quickEvidenceGuide(g, pathwayN, ev, limitationText) {
    const zh = I18N.getLang() === 'zh';
    const L = G7[zh ? 'zh' : 'en'];
    const p = DataService.foldPhrase(g.lp);
    const dir = p ? (p.lfc > 0 ? (zh ? '高于对照' : 'higher than control')
      : (p.lfc < 0 ? (zh ? '低于对照' : 'lower than control') : (zh ? '接近对照' : 'close to control'))) : '';
    const mult = (p && Math.abs(p.lfc) > 0.05)
      ? (zh ? `（约 ${p.multiple.toFixed(2)} 倍）` : ` (about ${p.multiple.toFixed(2)}×)`) : '';
    const d = deltaRank(g);
    const mem = (typeof Pathways !== 'undefined' && Pathways.ready()) ? Pathways.forGene(g.gene_id) : null;
    const allPw = mem ? mem.reactome.concat(mem.gobp) : [];
    const q = [
      [2, zh ? '它在 MPTP 模型中发生了什么？' : 'What happened in the MPTP model?', L.l2(g, dir, mult)],
      [3, zh ? '为什么它的排名值得关注？' : 'Why is its ranking worth attention?', L.l3(g, d)],
      [4, zh ? '它有没有蛋白网络信息？' : 'Does it have protein-network information?', L.l4(g)],
      [5, zh ? 'PFF 模型提供了什么证据？' : 'What does the PFF model show?', L.l5(g)],
      [6, zh ? '它涉及哪些已知通路或过程？' : 'Which pathways or processes involve it?', L.l6(allPw, pathwayN)],
      [7, zh ? '已有 PD 研究是否涉及它？' : 'Does existing PD research mention it?', L.l7(ev)],
      [0, zh ? '当前证据还缺什么？' : 'What evidence is still missing?', limitationText],
      [0, zh ? '它为什么仍只是研究候选？' : 'Why is it still a research candidate?',
        zh ? '当前结果只表示冻结分析中的研究优先级和已加载证据；它不证明疾病因果，也不代表已验证治疗靶点。'
           : 'These results show research priority and loaded evidence inside a frozen analysis; they do not establish disease causality or a validated therapeutic target.'],
    ];
    return `<section class="evidenceCoach beginnerOnly" aria-label="${esc(zh ? '快速证据解读' : 'Quick evidence guide')}">
      <div class="coachHead"><div><div class="summaryK">${esc(zh ? '快速证据解读' : 'Quick evidence guide')}</div>
        <p>${esc(zh ? '选择一个问题，先看简短答案；需要细节时可跳到对应的原始证据。'
                         : 'Choose a question for a short answer, then jump to the underlying evidence when you need detail.')}</p></div></div>
      <div class="coachGrid">${q.map(([n, question, answer]) => `<button type="button" class="coachCard" data-evjump="${n}">
        <span class="coachQ">${esc(question)}</span><span class="coachA">${answer}</span>
        ${n ? `<span class="coachGo">${esc(zh ? '查看证据 →' : 'See evidence →')}</span>` : ''}
      </button>`).join('')}</div>
    </section>`;
  }

  // This is deliberately a citation check, not an AI chat. The only value sent is the
  // selected public gene identifier; notes, shortlist state, free text and personal
  // information never leave the browser. The Worker independently resolves the gene
  // against a hash-pinned public snapshot.
  function frozenEvidenceLookup(g) {
    const zh = I18N.getLang() === 'zh';
    return `<section class="frozenLookup beginnerOnly" aria-label="${esc(zh ? '服务器端证据核验' : 'Server-side evidence check')}">
      <div class="summaryK">${esc(zh ? '服务器端证据核验（非 AI）' : 'Server-side evidence check (not AI)')}</div>
      <p>${esc(zh
        ? '可核验服务器是否从固定公开来源独立读取了该基因的研究字段和引用。点击后只发送当前基因 ID；请不要输入个人或健康信息。'
        : 'Verify that the server independently reads this gene’s research fields and citations from a fixed public source. Clicking sends only this gene ID; do not enter personal or health information.')}</p>
      <button type="button" class="lookupButton" data-frozen-lookup="${esc(g.gene_id)}">${esc(zh ? '核验证据与引用' : 'Verify evidence and citations')}</button>
      <div class="lookupResult" role="status" aria-live="polite"></div>
    </section>`;
  }

  function researchQa(g, limitationText) {
    const zh = I18N.getLang() === 'zh';
    const examples = zh
      ? ['它在 MPTP 模型中发生了什么？', '为什么它的排名值得关注？', '当前证据还缺什么？']
      : ['What happened in the MPTP model?', 'Why is its ranking worth attention?', 'What evidence is still missing?'];
    return `<section class="researchQa beginnerOnly" aria-label="${esc(zh ? '研究证据问答' : 'Research evidence Q&A')}">
      <div class="summaryK">${esc(zh ? '研究证据问答' : 'Research evidence Q&A')}</div>
      <p class="qaAvailability">${esc(zh ? '正在检查服务状态…' : 'Checking service status…')}</p>
      <div class="qaForm" hidden>
        <label for="qaQuestion">${esc(zh ? '仅询问此基因的 MPTP、PFF、排名、网络、通路或 PD 参考证据。不要输入个人或健康信息。' : 'Ask only about this gene’s MPTP, PFF, ranking, network, pathway, or PD-reference evidence. Do not enter personal or health information.')}</label>
        <div class="qaExamples" aria-label="${esc(zh ? '示例问题' : 'Example questions')}">
          ${examples.map(question => `<button type="button" class="qaExample" data-qa-example="${esc(question)}">${esc(question)}</button>`).join('')}
        </div>
        <textarea id="qaQuestion" maxlength="600" rows="3" placeholder="${esc(zh ? '例如：它在 MPTP 模型中发生了什么？' : 'For example: What happened in the MPTP model?')}"></textarea>
        <button type="button" class="qaAsk" data-qa-gap="${esc(limitationText)}">${esc(zh ? '询问研究证据' : 'Ask about research evidence')}</button>
      </div><div class="qaResult" role="status" aria-live="polite"></div>
    </section>`;
  }

  function gene(host, i) {
    const zh = I18N.getLang() === 'zh';
    const g = DataService.get_gene_detail(Number(i));
    if (!g) { host.innerHTML = `<h1>Gene Detail</h1><div class="note warn">Unknown node_index.</div>`; return; }
    const net = DataService.get_network_neighborhood(g.i, 1);
    const nb = (net.edges || []).map(e => {
      const other = e.u === g.i ? e.v : e.u;
      return { o: DataService.get_gene_detail(other), w: e.w };
    }).sort((a, b) => b.w - a.w);
    const eligible = g.eligP;
    const den = DataService.get_rank_denominators();
    const dMax = den['STRING-RWR-v1'].max.toLocaleString();
    const mem = (typeof Pathways !== 'undefined' && Pathways.ready()) ? Pathways.forGene(g.gene_id) : null;
    const pathwayN = mem ? mem.reactome.length + mem.gobp.length : 0;
    const ev = (typeof PdEvidence !== 'undefined' && PdEvidence.ready()) ? PdEvidence.forGene(g.gene_id) : null;
    const pdN = ev ? ev.gwas_associations : 0;
    const fold = DataService.foldPhrase(g.lp);
    const support = [];
    if (fold) support.push(zh
      ? `MPTP 模型中表达${fold.lfc > 0 ? '升高' : (fold.lfc < 0 ? '降低' : '接近不变')}，约 ${fold.multiple.toFixed(2)} 倍。`
      : `Expression is ${fold.lfc > 0 ? 'higher' : (fold.lfc < 0 ? 'lower' : 'near unchanged')} in MPTP (about ${fold.multiple.toFixed(2)}×).`);
    if (g.degree > 0) support.push(zh ? `当前蛋白网络记录了 ${g.degree} 个直接互作伙伴。` : `${g.degree} direct interaction partners are recorded in the current protein network.`);
    if (pathwayN > 0) support.push(zh ? `当前参考层收录了 ${pathwayN} 条相关通路或生物过程。` : `${pathwayN} pathway or biological-process annotations are present.`);
    if (pdN > 0) support.push(zh ? `已加载的 PD 遗传学来源包含 ${pdN} 条关联记录。` : `Loaded PD genetics sources contain ${pdN} association records.`);
    const gaps = [];
    if (!g.degree) gaps.push(zh ? '缺少蛋白网络传播支持' : 'no propagated protein-network support');
    if (!g.eligV) gaps.push(zh ? '另一个 PD 模型中不可比较' : 'not comparable in the other PD model');
    else if (DataService.validation_state(g).id === 'near_zero') gaps.push(zh ? '另一个 PD 模型中的变化接近零' : 'change is near zero in the other PD model');
    if (!pathwayN) gaps.push(zh ? '当前通路参考层中没有注释' : 'no annotation in the current pathway reference');
    if (!pdN) gaps.push(zh ? '已加载的 PD 遗传学来源未提到该基因' : 'not mentioned by the loaded PD genetics sources');
    const limitationText = gaps.length ? gaps.join(zh ? '；' : '; ')
      : (zh ? '仍需独立实验与机制研究。' : 'Independent experimental and mechanistic follow-up is still required.');

    // Seven-section evidence page: plain language first, raw fields behind a fold.
    const sevenSections = geneSevenSections(g, nb);
    host.innerHTML = `
      <a class="contextBack beginnerOnly" href="#candidates">← ${esc(zh ? '返回候选基因' : 'Back to candidate genes')}</a>
      <h1>${NT(g.symbol || g.gene_id)} <span class="na" style="font-size:13px">${esc(T('g7.evidence'))}</span></h1>
      <p class="lede expertOnly"><span class="mono">${NT(g.gene_id)}</span> · node_index <b>${g.i}</b> ·
        ${zh ? '小鼠' : 'mouse'} <span class="mono">${NT(g.mouse || 'NA')}</span> ·
        ${zh ? '符号仅用于显示，从不作为连接键' : 'display symbol is never a join key'}</p>
      ${help('gene')}

      <section class="geneBeginnerSummary beginnerOnly">
        <div class="summaryWhy"><div class="summaryK">${esc(zh ? '为什么这个基因在这里' : 'Why this gene is here')}</div>
          <p>${esc(g.statRank !== null
            ? (zh ? `它在当前表达优先级排序中位于第 ${g.statRank} 位，因此值得作为研究候选进一步检查。`
                  : `It is rank ${g.statRank} in the current expression-based prioritization, so it is a candidate for further research review.`)
            : (zh ? '它属于固定基因全集，但当前主模型没有为它报告研究优先级排名。'
                  : 'It is in the fixed gene universe, but the primary model reports no research-priority rank for it.'))}</p></div>
        <div class="summaryGrid">
          ${support.slice(0, 3).map(x => `<div class="summaryEvidence">✓ ${esc(x)}</div>`).join('') || `<div class="summaryEvidence muted">${esc(zh ? '当前没有可概括的支持证据。' : 'No supporting evidence can be summarized here.')}</div>`}
        </div>
        <div class="summaryGaps"><b>${esc(zh ? '目前缺少或有限的证据：' : 'Evidence that is missing or limited:')}</b> ${esc(limitationText)}</div>
        ${scientificBoundary(limitationText)}
        <div class="toolbar summaryActions">
          ${Shortlist.button(g.i)}
          <a class="btnLink primary" href="#workspace/${g.i}">${esc(zh ? '加入我的研究' : 'Add to My Research')}</a>
          <a class="btnLink" href="#network/${g.i}/1">${esc(zh ? '查看网络关系' : 'Inspect network')}</a>
        </div>
      </section>

      ${quickEvidenceGuide(g, pathwayN, ev, limitationText)}

      ${frozenEvidenceLookup(g)}
      ${researchQa(g, limitationText)}

      <details class="geneEvidenceDetails" ${beginner() ? '' : 'open'}>
      <summary class="beginnerOnly">${esc(zh ? '查看完整证据与技术详情' : 'View full evidence and technical details')}</summary>
      <div class="geneFullEvidence">
      <div class="toolbar expertOnly">
        ${Shortlist.button(g.i)}
        <a class="btnLink" href="#network/${g.i}/1">${esc(T('gene.toNetwork'))}</a>
        <a class="btnLink" href="#validation/${g.i}">${esc(T('gene.toValidation'))}</a>
        <a class="btnLink" href="#candidates">${esc(T('gene.toScreening'))}</a>
      </div>

      <!-- Metric strip. Beginner mode names each metric in Chinese; Expert mode keeps the
           technical field names. Same values in both. -->
      <div class="grid cards">
        ${card(zh ? '表达排名' : 'STAT rank', g.statRank ?? 'NA',
               zh ? '12,577 个可分析节点中' : 'among 12,577 eligible')}
        ${card(zh ? '网络排名' : 'RWR rank', g.rwrRank ?? 'NA',
               zh ? `稀疏刻度 1–${dMax}` : `sparse scale 1–${dMax}`)}
        ${card(zh ? 'Δrank（仅供参考）' : 'Δrank', (() => { const d = deltaRank(g);
          return d === null ? 'NA' : (d > 0 ? '+' + d : String(d)); })(),
          zh ? 'STAT − RWR · 仅用于显示' : 'STAT − RWR · display only')}
        ${card(zh ? '直接互作蛋白' : 'Degree', g.degree.toLocaleString(),
               g.degree === 0 ? (zh ? '无互作连接' : 'isolated node') : 'STRING PPI')}
        ${card('MPTP log2FC', f(g.lp, 4), eligible ? (zh ? '可分析' : 'eligible')
                                                    : (zh ? '不可分析' : 'not eligible'))}
        ${card('PFF log2FC', f(g.lv, 4), g.eligV ? (zh ? '可分析' : 'eligible')
                                                  : (zh ? '不可分析' : 'not eligible'))}
      </div>

      ${sevenSections}

      <div class="panel"><h2 style="margin-top:0">${esc(zh ? '网络邻域' : 'Neighbourhood')}</h2>
        <div id="gNet"></div>
        <div class="legend">${esc(zh ? '点击任意节点可跳转到该基因。' : 'Click any node to jump to it.')}</div></div>

      <div class="panel"><h2 style="margin-top:0">${esc(zh ? '溯源信息' : 'Provenance')}</h2>
        <div class="two">
          <div>
            ${row(zh ? '结构全集' : 'Structural universe', 'U3 · fixed identity')}
            ${row(zh ? '节点索引' : 'Node index', g.i)}
            ${row(zh ? '排序规则' : 'Ordering', 'ASCII-lexical human Ensembl gene_id')}
          </div>
          <div>
            ${row(zh ? '表达' : 'Expression', 'DESeq2 1.46.0 · apeglm 1.28.0')}
            ${row(zh ? '网络' : 'Network', 'STRING v12 physical · score ≥ 700')}
            ${row(zh ? '注释' : 'Annotation', 'GENCODE M35 · Ensembl 112')}
          </div>
        </div>
        <div class="note" style="margin-bottom:0">${zh
          ? `该节点的身份与 <code>node_index</code> 是冻结的。表达统计量与排名是在此之后附加的，
             它们不能增加、删除或重新编号任何节点。`
          : `This node's identity and <code>node_index</code> are
             frozen. Expression statistics and rankings were attached afterwards and cannot add, remove or
             renumber nodes.`}</div>
      </div>
      </div></details>`;

    Charts.network(host.querySelector('#gNet'), net, { onSelect: goGene });
    const lookup = host.querySelector('[data-frozen-lookup]');
    if (lookup) {
      lookup.onclick = async () => {
        const result = host.querySelector('.lookupResult');
        lookup.disabled = true;
        result.textContent = zh ? '正在核验固定公开证据…' : 'Verifying frozen public evidence…';
        try {
          const response = await fetch('https://xunzi-pd-reproduction.3474119431pcw.workers.dev/v1/evidence', {
            method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ gene_id: lookup.dataset.frozenLookup }),
          });
          const body = await response.json();
          if (!response.ok || body.status !== 'evidence_loaded') throw new Error('evidence unavailable');
          const citations = (body.evidence || []).slice(0, 8).map(item =>
            `<li><b>${esc(item.label)}</b>: <span class="notranslate mono" translate="no">${esc(item.value)}</span></li>`).join('');
          result.innerHTML = `<div class="lookupSuccess"><b>${esc(zh ? '已核验：' : 'Verified:')}</b> ${esc(body.gene.symbol || body.gene.gene_id)} · ${esc(zh ? '固定提交' : 'pinned commit')} <span class="mono">${esc(body.source_snapshot.commit.slice(0, 7))}</span>
            <ul>${citations}</ul><p>${esc(zh ? '这些字段是研究背景，不证明疾病因果关系或已验证治疗靶点。' : 'These fields are research context; they do not establish disease causality or a validated therapeutic target.')}</p></div>`;
        } catch {
          result.textContent = zh
            ? '暂时无法核验服务器端证据。当前页面中的冻结本地证据不受影响。'
            : 'Server-side evidence cannot be verified right now. The frozen local evidence already shown on this page is unaffected.';
        } finally { lookup.disabled = false; }
      };
    }
    const qa = host.querySelector('.researchQa');
    if (qa) {
      const availability = qa.querySelector('.qaAvailability'), form = qa.querySelector('.qaForm'), result = qa.querySelector('.qaResult');
      const base = 'https://xunzi-pd-reproduction.3474119431pcw.workers.dev';
      fetch(base + '/health').then(r => r.json()).then(status => {
        if (status.status === 'ready') { availability.textContent = zh ? '服务已就绪。' : 'Service is ready.'; form.hidden = false; }
        else availability.textContent = zh ? 'AI 问答尚未启用。可继续使用上方的非 AI 证据核验。' : 'AI Q&A is not enabled. You can still use the non-AI evidence check above.';
      }).catch(() => { availability.textContent = zh ? '暂时无法检查 AI 服务状态。' : 'AI service status is temporarily unavailable.'; });
      qa.querySelectorAll('[data-qa-example]').forEach(button => {
        button.onclick = () => { qa.querySelector('#qaQuestion').value = button.dataset.qaExample; qa.querySelector('#qaQuestion').focus(); };
      });
      qa.querySelector('.qaAsk').onclick = async () => {
        const question = qa.querySelector('#qaQuestion').value.trim();
        if (!question) { result.textContent = zh ? '请先输入一个研究证据问题。' : 'Enter a research-evidence question first.'; return; }
        const ask = qa.querySelector('.qaAsk'); ask.disabled = true; result.textContent = zh ? '正在读取已核验的研究证据…' : 'Reading verified research evidence…';
        try {
          const response = await fetch(base + '/v1/answer', { method: 'POST', headers: { 'content-type': 'application/json' },
            body: JSON.stringify({ gene_id: g.gene_id, question, language: zh ? 'zh' : 'en' }) });
          const body = await response.json();
          if (body.status === 'answered') {
            const rawAnswer = String(body.answer || '').trim();
            const boundary = String(body.boundary || '').trim();
            const conclusion = boundary && rawAnswer.endsWith(boundary) ? rawAnswer.slice(0, -boundary.length).trim() : rawAnswer;
            const citations = (body.evidence || []).slice(0, 8).map(item => `<li><b>${esc(item.label)}</b><span class="notranslate mono" translate="no">${esc(item.value)}</span></li>`).join('');
            result.innerHTML = `<div class="qaAnswerCard">
              <section><h3>${esc(zh ? '结论（仅限已加载证据）' : 'Answer from loaded evidence')}</h3><p>${esc(conclusion)}</p></section>
              <section><h3>${esc(zh ? '对应证据引用' : 'Evidence citations')}</h3><ul>${citations || `<li>${esc(zh ? '当前记录没有可显示的字段引用。' : 'No field citations are available in this record.')}</li>`}</ul></section>
              <section><h3>${esc(zh ? '当前还缺什么' : 'What is still missing')}</h3><p>${esc(ask.dataset.qaGap)}</p></section>
              <section class="qaBoundary"><h3>${esc(zh ? '科研边界' : 'Research boundary')}</h3><p>${esc(boundary)}</p></section>
              <div class="qaFeedback"><span>${esc(zh ? '这次回答有帮助吗？' : 'Was this answer helpful?')}</span>
                <button type="button" data-qa-feedback="true">${esc(zh ? '有帮助' : 'Helpful')}</button>
                <button type="button" data-qa-feedback="false">${esc(zh ? '没帮助' : 'Not helpful')}</button>
                <small class="qaFeedbackStatus"></small></div>
            </div>`;
            result.querySelectorAll('[data-qa-feedback]').forEach(button => {
              button.onclick = async () => {
                const controls = result.querySelectorAll('[data-qa-feedback]'); controls.forEach(control => { control.disabled = true; });
                const feedbackStatus = result.querySelector('.qaFeedbackStatus');
                try {
                  const feedback = await fetch(base + '/v1/feedback', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ helpful: button.dataset.qaFeedback === 'true' }) });
                  if (!feedback.ok) throw new Error('feedback unavailable');
                  feedbackStatus.textContent = zh ? '已记录匿名反馈，谢谢。' : 'Anonymous feedback recorded. Thank you.';
                } catch { feedbackStatus.textContent = zh ? '暂时无法记录反馈。' : 'Feedback could not be recorded right now.'; }
              };
            });
          } else result.textContent = body.answer || body.error || (zh ? '当前无法回答。' : 'Cannot answer right now.');
        } catch { result.textContent = zh ? '暂时无法访问问答服务。' : 'The Q&A service is temporarily unavailable.'; }
        finally { ask.disabled = false; }
      };
    }
    host.querySelectorAll('[data-evjump]').forEach(button => {
      button.onclick = () => {
        const n = Number(button.dataset.evjump);
        if (!n) return;
        const details = host.querySelector('.geneEvidenceDetails');
        if (details) details.open = true;
        const section = host.querySelector(`.evSection.s${n}`);
        if (section) requestAnimationFrame(() => section.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      };
    });
    host.querySelectorAll('tbody tr').forEach(tr => tr.onclick = () => goGene(+tr.dataset.i));
    // The two-column reading sits after the seven sections: they describe what the data
    // says, this says what to do with it and where it could mislead.
    const full = host.querySelector('.geneFullEvidence');
    if (full) full.insertAdjacentHTML('beforeend', Workspace.whyCautions(g, 100));
    Shortlist.bind(host);
    Glossary.bind(host);
    host.insertAdjacentHTML('beforeend',
      nextStep(T('next.gene'), T('next.geneBtn'), '#workspace/' + g.i));
  }

  /* -------------------------------------------------- MPTP <-> PFF paired (v1.6) */
  function pairedPanel(g) {
    const zh = I18N.getLang() === 'zh';
    const pair = DataService.validation_pair(g);
    const glyph = (a, b) => {
      const arrow = { up: '↑', down: '↓', flat: '→' }[a] || '?';
      const arrow2 = { up: '↑', down: '↓', flat: '→' }[b] || '~0';
      return `${arrow} ${arrow2}`;
    };
    const state = {
      same_direction: [zh ? '同向' : 'same direction', 'ok'],
      opposite_direction: [zh ? '反向' : 'opposite direction', 'warn'],
      validation_near_zero: [zh ? '验证接近零' : 'validation near zero', 'na'],
      not_comparable: [zh ? '不可比较' : 'not comparable', 'na'],
    }[pair.agreement] || ['', 'na'];
    const side = (title, d, glyphTxt) => `
      <div class="pairCol">
        <div class="pairH">${esc(title)}</div>
        ${row('log2FC', cellFmt(d.lfc))}
        ${row('FDR', cellP(d.fdr))}
        ${row(zh ? '可分析' : 'eligible', d.eligible
          ? '<span class="pill on">TRUE</span>' : '<span class="pill off">FALSE</span>')}
        <div class="pairGlyph">${esc(glyphTxt)}</div>
      </div>`;
    return `<div class="panel">
      <h2 style="margin-top:0">${esc(zh ? 'MPTP ↔ PFF 单基因对照' : 'MPTP ↔ PFF paired view')}</h2>
      <div class="pairRow">
        ${side('MPTP · ' + (zh ? '发现模型' : 'discovery'), pair.primary, pair.primary.dir ? { up: '↑', down: '↓', flat: '→' }[pair.primary.dir] : '?')}
        ${side('PFF · ' + (zh ? '验证模型' : 'validation'), pair.pff, pair.pff.dir ? { up: '↑', down: '↓', flat: '→' }[pair.pff.dir] : '~0')}
        <div class="pairCol pairAgree">
          <div class="pairH">${esc(zh ? '方向' : 'Direction')}</div>
          <div class="pairGlyph big">${esc(glyph(pair.primary.dir, pair.pff.dir))}</div>
          <span class="tag ${pair.agreement === 'same_direction' ? 't-green'
            : (pair.agreement === 'opposite_direction' ? 't-grey' : 't-grey')}">${esc(state[0])}</span>
        </div>
      </div>
      <div class="note ${pair.directionInterpretable ? '' : 'warn'}">
        ${esc(zh
          ? '只有当验证效应与零有实质差异时，方向一致性才有解释意义。'
          : 'Directional agreement should only be interpreted when the validation effect is meaningfully different from zero.')}
      </div>
    </div>`;
  }
  const cellFmt = v => (v === null || v === undefined || Number.isNaN(v))
    ? '<span class="na">NA</span>' : f(v, 4);
  const cellP = v => (v === null || v === undefined || Number.isNaN(v))
    ? '<span class="na">NA</span>' : pv(v);

  /* ================= 7. PROVENANCE ================= */
  function provenance(host) {
    const zh = I18N.getLang() === 'zh';
    const o = DataService.load_overview();
    const p = DataService.get_provenance() || {};
    host.innerHTML = `
      <h1 class="titleBeginner">${esc(zh ? '来源资料' : 'Provenance')}</h1>
      <h1 class="titleExpert">Provenance</h1>
      <p class="lede">${zh
        ? '本次构建由什么组成。完整的审计轨迹保存在仓库的 checkpoint 与 gate 报告中，此处有意不重复。'
        : `What this build is made of. The full audit trail lives in the repository's checkpoint
           and gate reports and is deliberately not reproduced here.`}</p>

      <div class="two">
        <div class="panel"><h2 style="margin-top:0">${esc(zh ? '参考数据' : 'References')}</h2>
          ${row(zh ? '基因组注释' : 'Genome annotation', 'GENCODE M35 · GRCm39')}
          ${row(zh ? '同源映射' : 'Orthology', 'Ensembl release 112 · 1:1 mouse–human')}
          ${row(zh ? '蛋白网络' : 'Protein network', 'STRING v12.0 · physical PPI · score ≥ 700')}
          ${row(zh ? '基因符号' : 'Gene symbol', 'Ensembl 112 · display only, never a join key')}
        </div>
        <div class="panel"><h2 style="margin-top:0">${esc(zh ? '软件版本' : 'Software')}</h2>
          ${row(zh ? '比对' : 'Alignment', 'STAR 2.7.11b')}
          ${row(zh ? '计数' : 'Counting', 'featureCounts 2.0.8')}
          ${row(zh ? '链特异性' : 'Strandedness', 'unstranded (-s 0) · RSeQC 5.0.4')}
          ${row(zh ? '差异表达' : 'Differential expression',
                 'R 4.4.2 · Bioconductor 3.20 · DESeq2 1.46.0 · apeglm 1.28.0')}
          ${row(zh ? '图分析' : 'Graph analysis', 'Python 3.12.7 · networkx 3.4.2 · scipy 1.14.1')}
        </div>
      </div>

      <div class="panel">
        <h2 style="margin-top:0">${esc(zh ? '固定身份' : 'Fixed identity')}</h2>
        <div class="two">
          <div>
            ${row(zh ? '结构全集' : 'Structural universe', `U3 · ${o.nodes.toLocaleString()} nodes`)}
            ${row(zh ? '图' : 'Graph', `${o.edges.toLocaleString()} undirected edges`)}
            ${row(zh ? '边权' : 'Edge weight', 'combined_score / 1000')}
            ${row(zh ? '孤立节点' : 'Isolated nodes', `${o.isolated.toLocaleString()} retained, degree 0`)}
          </div>
          <div>
            ${row(zh ? '节点顺序' : 'Node order', 'ASCII-lexical human Ensembl gene_id')}
            ${row(zh ? '节点索引' : 'Node index', 'contiguous, zero-based')}
            ${row(zh ? '不可变性' : 'Immutability', 'identity, order and edges are frozen')}
            ${row(zh ? 'B2 的作用' : 'B2 role', 'attached masks only — no nodes added or removed')}
          </div>
        </div>
      </div>

      <div class="panel">
        <h2 style="margin-top:0">${esc(zh ? '解读边界' : 'Interpretation guards')}</h2>
        <div class="note">${zh
          ? `节点身份、顺序与图的边在任何表达统计量计算<b>之前</b>就已固定。
             表达、显著性、排名或生物学预期都不能增加、删除或重新编号任何节点。
             未通过表达过滤的节点会保留其行，统计量为 <code>NA</code>、
             <code>reported_rank = NA</code>，而不是消失。`
          : `Node identity, ordering and graph edges were fixed <b>before</b> any expression
             statistic was computed. Expression, significance, ranking or biological expectation cannot add,
             remove or renumber a node. A node failing an expression filter keeps its row with
             <code>NA</code> statistics and <code>reported_rank = NA</code> instead of disappearing.`}</div>
        <div class="note warn">${zh
          ? `这是一次<b>独立重建</b> —— 不是已发表 XunZi 模型的复现。
             本应用不加载任何已发表的 checkpoint、graph mask 或排名。
             基线结果来自两套透明、未训练、确定性的方法。`
          : `This is an <b>independent reconstruction</b> — not a reproduction of the
             published XunZi model. No published checkpoint, graph mask or ranking is loaded. Baseline results
             come from two transparent, untrained, deterministic methods.`}</div>
      </div>`;
  }

  /** Enter the demo at a given step. Used by the #demo/<n> deep link. */
  function demoGoTo(n) { demo.on = true; demoGo(Number(n) || 0); }

  return { overview, de, ranking, network, validation, gene, provenance,
           screening: (host, state) => Screening.render(host, state),
           candidates: (host, state) => Candidates.render(host, state),
           workspace: (host, state) => Workspace.render(host, state),
           pathway: (host, state) => V16Pages.pathway(host, state),
           pd: (host, state) => V16Pages.pd(host, state),
           parseNetworkArg, parseScreeningArg, parseGeneArg, parseOptionalGeneArg,
           parseWorkspaceArg, parseLensArg,
           deltaRank, bindSearch, nextStep, scientificBoundary, beginner,
           // Lazy: evaluated on call, not at module-init time. Binding this eagerly made
           // pages.js depend on v16pages.js having already loaded, and a wrong script
           // order killed the whole module with a ReferenceError.
           help: (id) => V16Pages.helpPanel(id),
           mountDemo, startGuidedDemo, demoGoTo, demoActive, DEMO_STEPS };
})();
