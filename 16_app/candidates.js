/* XunZi-PD — Candidate Discovery (v1.8).
 *
 * The beginner's entry point into the candidate list. It answers one question — "where
 * do I start?" — by offering five ways to browse the SAME frozen result, and by saying
 * on every card why that gene is in the list.
 *
 * A lens is a view. It selects, sorts and explains fields that already exist. It does
 * not score, threshold, or promote. The two things this module must never do, and which
 * tests guard:
 *
 *   - renumber ranks. Ordering uses the authoritative reported_rank values. A gene with
 *     NA keeps NA and sorts last.
 *   - let a lens change a ranking. Filtering to genes with PD evidence decides what is
 *     LISTED; it does not move anything up any ranking.
 */
const Candidates = (() => {
  const C = {
    en: {
      title: 'Which genes are worth studying further?',
      expertTitle: 'Candidate Discovery',
      sub: 'Choose what you want to understand first. You can change the view at any time.',
      firstTime: 'First time here?',
      firstTimeBody: 'You do not need to look at all 12,577 genes. Start with one small list.',
      lensNote: 'These choices only change how you browse the existing results. They do not change the rankings.',
      chooseLens: 'What would you like to look at first?',
      currentLens: 'What you are looking at',
      recommended: 'Recommended first step',
      changeView: 'Change view',
      showing: (n, total) => `Showing ${n} of ${total.toLocaleString()} candidates`,
      showingNote: 'Genes not shown here have not been removed. You are only viewing one part of the full result.',

      topk: 'Show how many?',
      topkNote: 'This only controls how many genes you see at once; it is not a filter.',
      show: 'Show',
      loadMore: 'Load more',
      orderBy: 'Order by',
      subview: 'Which candidates?',
      subAll: 'All of both models', subNear: 'Near-zero in PFF', subNonNear: 'Non-near-zero in PFF',

      whyHere: 'Why am I seeing this gene?',
      whyLook: 'Why look at it?',
      care: 'What to be careful about?',
      openEvidence: 'Open the full evidence',
      addMine: '+ Add to My Research',
      nextSteps: 'Next steps',
      stepEvidence: 'Full evidence', stepNetwork: 'Protein network', stepPairs: 'MPTP / PFF',
      stepPathways: 'Pathways', stepPD: 'PD evidence', stepResearch: 'My research',

      mptp: 'Current model (MPTP)', dirUp: 'expression higher', dirDown: 'expression lower', dirFlat: 'unchanged',
      exprOnly: 'Expression only', networkLine: 'Protein network', afterNetwork: 'With network',
      pff: 'Other model (PFF)',
      connected: 'Connected', isolated: 'Isolated', neighbours: 'neighbours',
      stNonNear: 'Non-near-zero change', stNear: 'Near zero', stMissing: 'Not measured here',
      noEvidence: 'None',
      fold: 'Technical details',

      searchTitle: 'Already know a gene?',
      searchHint: 'Type a symbol, Ensembl ID or mouse ID — for example SNCA, LRRK2, GBA.',
      searchNote: 'A gene is shown whether or not it is in the current view. Nothing is hidden for being outside the top-K.',
      inUniverse: 'In the structural universe', notInUniverse: 'Not in the structural universe',
      eligP: 'Analysable in MPTP', eligV: 'Analysable in PFF',

      wizardTitle: 'I don’t know where to start',
      wizardBody: 'Which of these would you most like to look at?',
      wExpr: 'Genes whose own expression changed',
      wNet: 'Genes with more protein-network support',
      wUp: 'Genes that moved up once the network was added',
      wPd: 'Genes existing PD research already mentions',
      wBoth: 'How candidates behave in MPTP and PFF',

      compareTitle: 'Compare',
      compareHint: 'Tick up to four candidates, then open them side by side.',
      compareGo: 'Compare selected',
      compareMax: 'Four at a time.',
      clearSel: 'Clear selection',
      selected: 'selected',
      addedFrom: 'Added from',

      funnelTitle: 'Where this list comes from',
      fUniverse: 'Fixed gene universe', fEligible: 'Analysable in MPTP',
      fRanked: 'Formally ranked', fBrowsing: 'You are browsing',
      fBrowsingNote: 'A browsing choice, not a biological filter.',

      notHowTitle: 'This is not how the list was made',
      notHowBody: 'The app did not keep every gene with FDR < 0.05 and delete the rest. '
                + 'Every analysable gene received a formal rank, and the exploration views '
                + 'are different ways to browse that ranking. Candidate prioritisation is '
                + 'not the same thing as filtering on a significance cutoff.',

      journeyTitle: 'Candidate review',
      journeyNote: 'Review progress only — it records what you have looked at, not how good the gene is.',
      jExpression: 'Expression', jRanking: 'Ranking', jNetwork: 'Protein network',
      jPairs: 'MPTP / PFF', jPathways: 'Pathways', jPD: 'PD evidence', jResearch: 'My research',

      none: 'No candidate matches this view.',
      cautions: {
        isolated: 'Its protein has no recorded interaction partner, so its rank comes from its own expression only',
        val_near_zero: 'Essentially unchanged in the PFF model, so its direction there is not meaningful',
        val_missing: 'Not measured in the PFF cohort, so it cannot be checked in the other model',
        val_fdr_weak: 'The PFF FDR is not statistically compelling — this app applies no significance cutoff, so judge it yourself',
        rwr_na: 'It has no reported network rank',
        no_pd_evidence: 'Existing PD genetics, as loaded here, does not mention it — that is absence of evidence, not evidence of novelty',
        no_pathway: 'It carries no annotation in the loaded pathway reference',
        not_candidate: 'A candidate is not a validated therapeutic target',
      },
    },
    zh: {
      title: '哪些基因值得进一步研究？',
      expertTitle: '候选基因发现',
      sub: '先选择你最想了解的问题。之后可以随时换一种方式查看。',
      firstTime: '第一次使用？',
      firstTimeBody: '不需要一次看完 12,577 个基因，先从一小组候选开始。',
      lensNote: '下面的选择只改变浏览方式，不会改变原始排名。',
      chooseLens: '你想先看哪一类？',
      currentLens: '你正在看的类型',
      recommended: '建议第一次从这里开始',
      changeView: '切换视角',
      showing: (n, total) => `正在显示 ${n} / ${total.toLocaleString()} 个候选`,
      showingNote: '没有显示的基因并未被删除；你现在只是在查看完整结果中的一部分。',

      topk: '显示多少个？',
      topkNote: '这里只控制一次看多少个基因，不是筛选条件。',
      show: '显示',
      loadMore: '加载更多',
      orderBy: '排序依据',
      subview: '看哪一类？',
      subAll: '两个模型全部', subNear: 'PFF 中接近零', subNonNear: 'PFF 中非近零',

      whyHere: '为什么这个基因出现在当前列表？',
      whyLook: '为什么值得看？',
      care: '需要注意什么？',
      openEvidence: '查看完整证据',
      addMine: '+ 加入我的研究',
      nextSteps: '下一步',
      stepEvidence: '完整证据', stepNetwork: '蛋白网络', stepPairs: 'MPTP / PFF',
      stepPathways: '通路', stepPD: 'PD 证据', stepResearch: '我的研究',

      mptp: '当前模型（MPTP）', dirUp: '表达升高', dirDown: '表达降低', dirFlat: '无变化',
      exprOnly: '仅看表达', networkLine: '蛋白网络', afterNetwork: '加入网络后',
      pff: '另一个模型（PFF）',
      connected: '有互作连接', isolated: '无互作连接', neighbours: '个互作蛋白',
      stNonNear: '非近零变化', stNear: '接近零', stMissing: '在此未测量',
      noEvidence: '无',
      fold: '技术细节',

      searchTitle: '已经知道某个基因？',
      searchHint: '输入基因符号、Ensembl ID 或小鼠 ID —— 例如 SNCA、LRRK2、GBA。',
      searchNote: '无论该基因是否在当前视图中都会显示。不会因为不在 Top-K 之内而被隐藏。',
      inUniverse: '在结构全集中', notInUniverse: '不在结构全集中',
      eligP: 'MPTP 中可分析', eligV: 'PFF 中可分析',

      wizardTitle: '我不知道从哪里开始',
      wizardBody: '你更想看哪一类？',
      wExpr: '自身表达变化明显的',
      wNet: '有蛋白互作网络信息的',
      wUp: '加入网络后排名提高的',
      wPd: '已有 PD 研究提到的',
      wBoth: '比较 MPTP 与 PFF',

      compareTitle: '比较',
      compareHint: '勾选最多四个候选，然后并排打开。',
      compareGo: '比较所选',
      compareMax: '一次最多四个。',
      clearSel: '清除选择',
      selected: '已选',
      addedFrom: '来源视角',

      funnelTitle: '这份列表从哪来',
      fUniverse: '固定基因全集', fEligible: 'MPTP 中可分析',
      fRanked: '已完成正式排名', fBrowsing: '你正在浏览',
      fBrowsingNote: '浏览选择，不是生物学筛除。',

      notHowTitle: '这份列表不是这样筛出来的',
      notHowBody: '本应用并没有“保留 FDR < 0.05 的基因、删除其余”。所有可分析基因都获得了正式排名，'
                + '而各个探索视角只是浏览这份排名的不同方式。候选优先级排序不等于按显著性阈值做二值筛选。',

      journeyTitle: '候选复核',
      journeyNote: '仅代表复核进度 —— 它记录你看过什么，不代表这个基因有多好。',
      jExpression: '表达', jRanking: '排名', jNetwork: '蛋白网络',
      jPairs: 'MPTP / PFF', jPathways: '通路', jPD: 'PD 证据', jResearch: '我的研究',

      none: '当前视角下没有匹配的候选。',
      cautions: {
        isolated: '对应蛋白没有已记录的互作蛋白，排名只来自其自身表达',
        val_near_zero: '在 PFF 模型中基本没有变化，因此其方向没有意义',
        val_missing: '在 PFF 队列中没有测量值，无法在另一个模型中检查',
        val_fdr_weak: 'PFF 的 FDR 证据强度有限 —— 本应用不施加显著性阈值，请自行判断',
        rwr_na: '没有报告的网络排名',
        no_pd_evidence: '此处加载的 PD 遗传学来源没有提到它 —— 这是缺少证据，不代表新颖',
        no_pathway: '在当前加载的通路参考层中没有注释',
        not_candidate: '候选基因不等于已验证的治疗靶点',
      },
    },
  };
  const S = (k) => {
    const d = C[I18N.getLang()] || C.en;
    return (d[k] !== undefined) ? d[k] : (C.en[k] !== undefined ? C.en[k] : k);
  };

  const esc = s => String(s ?? '').replace(/[&<>"]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const f = (v, d = 3) => (v === null || v === undefined || Number.isNaN(v)) ? 'NA' : (+v).toFixed(d);
  const pv = v => {
    if (v === null || v === undefined || Number.isNaN(v)) return 'NA';
    v = +v;
    if (v === 0) return '0';
    return v < 1e-3 ? v.toExponential(2) : v.toFixed(4);
  };

  const state = {
    lens: null, topK: 20, order: 'statRank', subview: 'all',
    shown: 20, sel: [], search: null,
  };

  /* ------------------------------------------------------------------ landing */
  function lensCard(id) {
    const d = Lenses.get(id);
    const zh = I18N.getLang() === 'zh';
    return `<button type="button" class="lensCard" data-lens="${id}">
      <div class="lcHead">
        <span class="lcMark lens-${id}" aria-hidden="true"></span>
        <span class="lcTitle">${esc(d.label[zh ? 'zh' : 'en'])}</span>
        ${id === 'expression' ? `<span class="startRecommended">${esc(S('recommended'))}</span>` : ''}
      </div>
      <div class="lcBlurb">${esc(d.blurb[zh ? 'zh' : 'en'])}</div>
      <div class="lcSec expertOnly">${esc(d.secondary[zh ? 'zh' : 'en'])}</div>
    </button>`;
  }

  function wizard() {
    const opts = [
      ['expression', S('wExpr')], ['network', S('wNet')], ['promoted', S('wUp')],
      ['pd', S('wPd')], ['both_models', S('wBoth')],
    ];
    return `<div class="wizard" id="wizard" hidden>
      <div class="wzBody">
        <div class="wzT">${esc(S('wizardTitle'))}</div>
        <p class="wzQ">${esc(S('wizardBody'))}</p>
        ${opts.map(([id, label]) => `<button type="button" class="wzOpt" data-wz="${id}">
          <span class="lcMark lens-${id}" aria-hidden="true"></span>${esc(label)}</button>`).join('')}
        <button type="button" class="wzClose">${esc(I18N.getLang() === 'zh' ? '取消' : 'Cancel')}</button>
      </div>
    </div>`;
  }

  /* ------------------------------------------------------------------- funnel */
  function funnelHtml(showing) {
    const steps = Lenses.funnel(showing);
    const label = { universe: S('fUniverse'), eligible: S('fEligible'),
                    ranked: S('fRanked'), browsing: S('fBrowsing') };
    return `<div class="funnel miniFunnel">${steps.map((s, i) => `
      <div class="fnStep${s.frozen ? ' frozen' : ' browse'}">
        <div class="fnN">${s.n.toLocaleString()}</div>
        <div class="fnL">${esc(label[s.key] || s.key)}</div>
      </div>${i < steps.length - 1 ? '<div class="fnA">↓</div>' : ''}`).join('')}
      <div class="fnFoot">${esc(S('fBrowsingNote'))}</div>
    </div>`;
  }

  /* --------------------------------------------------------------------- card */
  function whyHere(g, lensId, ctx) {
    const d = Lenses.get(lensId);
    if (!d) return '';
    const zh = I18N.getLang() === 'zh';
    const w = d.why(g, ctx || {});
    return zh ? w.zh : w.en;
  }

  function card(g) {
    const zh = I18N.getLang() === 'zh';
    const beg = Pages.beginner();
    const pair = DataService.validation_pair(g);
    const glyph = { up: '↑', down: '↓', flat: '→' }[pair.primary.dir] || '—';
    const dirTxt = pair.primary.dir === 'up' ? S('dirUp')
      : (pair.primary.dir === 'down' ? S('dirDown') : S('dirFlat'));
    const vs = DataService.validation_state(g);
    const vsLabel = { non_near_zero: S('stNonNear'), near_zero: S('stNear'),
                      not_comparable: S('stMissing') }[vs.id];
    const vsCls = { non_near_zero: 'v-green', near_zero: 'v-amber', not_comparable: 'v-grey' }[vs.id];

    const why = Candidates.whyLine(g, zh);
    const care = Lenses.cautions(g).concat(['not_candidate'])
      .map(k => C[zh ? 'zh' : 'en'].cautions[k]).filter(Boolean);

    const selected = state.sel.includes(g.i);
    const stepper = (href, key, label, i) => {
      const done = Journey.seen(g.i, key);
      return `<a class="jStep${done ? ' done' : ''}" href="${href}"
        data-jmark="${key}" data-jgene="${g.i}">
        <span class="jsN">${done ? '✓' : i}</span>${esc(label)}</a>`;
    };

    return `<article class="candCard2" data-i="${g.i}">
      <header class="cc2Head">
        <label class="ccSel"><input type="checkbox" data-cmp="${g.i}" ${selected ? 'checked' : ''}
          aria-label="${esc(zh ? '选择用于比较' : 'select for comparison')}"></label>
        <a class="cc2Sym" href="#workbench/${g.i}">${NT(g.symbol || g.gene_id)}</a>
        <span class="cc2Id mono">${NT(g.gene_id)}</span>
      </header>

      <div class="whyHere"><span class="whT">${esc(S('whyHere'))}</span>
        <span class="whB">${esc(whyHere(g, state.lens, { topK: state.topK }))}</span></div>

      <div class="candidateQuick beginnerOnly">
        <div class="cqPriority"><span>${esc(zh ? '当前研究优先级' : 'Current research priority')}</span>
          <b>${g.statRank === null ? 'NA' : '#' + g.statRank}</b></div>
        <ul>${why.slice(0, 3).map(x => `<li>${esc(x)}</li>`).join('')}</ul>
        ${care.length ? `<p><b>${esc(zh ? '主要限制：' : 'Main limitation:')}</b> ${esc(care[0])}</p>` : ''}
      </div>

      <div class="cc2Facts expertOnly">
        <div class="cf"><span class="cfK">${esc(S('mptp'))}</span>
          <span class="cfV"><span class="cc2Dir ${pair.primary.dir}">${glyph}</span> ${esc(dirTxt)}</span></div>
        <div class="cf"><span class="cfK">${esc(S('exprOnly'))}</span>
          <span class="cfV mono">#${g.statRank ?? 'NA'}</span></div>
        <div class="cf"><span class="cfK">${esc(S('networkLine'))}</span>
          <span class="cfV">${esc(g.degree > 0 ? S('connected') : S('isolated'))} ·
            ${g.degree} ${esc(S('neighbours'))}</span></div>
        <div class="cf"><span class="cfK">${esc(S('afterNetwork'))}</span>
          <span class="cfV mono">#${g.rwrRank ?? 'NA'}</span></div>
        <div class="cf"><span class="cfK">${esc(S('pff'))}</span>
          <span class="cfV"><span class="valState ${vsCls}"><span class="vsTag">${esc(vsLabel)}</span></span></span></div>
      </div>

      <div class="expertOnly">${beg ? `<details class="techFold"><summary>${esc(S('fold'))}</summary>
        <div class="evFacts">
          <span><b>log2FC</b>${f(g.lp, 3)}</span><span><b>FDR</b>${pv(g.fp)}</span>
          <span><b>PFF log2FC</b>${f(g.lv, 3)}</span><span><b>PFF FDR</b>${pv(g.fv)}</span>
          <span><b>Δrank</b>${(g.statRank !== null && g.rwrRank !== null)
            ? (g.statRank - g.rwrRank > 0 ? '+' : '') + (g.statRank - g.rwrRank) : 'NA'}</span>
          <span><b>node_index</b>${g.i}</span>
        </div></details>`
      : `<div class="evFacts">
          <span><b>log2FC</b>${f(g.lp, 3)}</span><span><b>FDR</b>${pv(g.fp)}</span>
          <span><b>PFF log2FC</b>${f(g.lv, 3)}</span><span><b>PFF FDR</b>${pv(g.fv)}</span>
          <span><b>Δrank</b>${(g.statRank !== null && g.rwrRank !== null)
            ? (g.statRank - g.rwrRank > 0 ? '+' : '') + (g.statRank - g.rwrRank) : 'NA'}</span>
        </div>`}</div>

      <div class="cc2Why expertOnly"><div class="cc2WhyT">${esc(S('whyLook'))}</div>
        <ul>${why.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>
      <div class="cc2Why care expertOnly"><div class="cc2WhyT">${esc(S('care'))}</div>
        <ul>${care.map(x => `<li>${esc(x)}</li>`).join('')}</ul></div>

      <div class="jPanel expertOnly">
        <div class="jT">${esc(S('journeyTitle'))}
          <span class="na">${Journey.progress(g.i).done} / ${Journey.STEPS.length}</span></div>
        <div class="jSteps">
          ${stepper('#gene/' + g.i, 'expression', S('jExpression'), 1)}
          ${stepper('#gene/' + g.i, 'ranking', S('jRanking'), 2)}
          ${stepper('#network/' + g.i + '/1', 'network', S('jNetwork'), 3)}
          ${stepper('#gene/' + g.i, 'pairs', S('jPairs'), 4)}
          ${stepper('#pathway/' + g.i, 'pathways', S('jPathways'), 5)}
          ${stepper('#pd/' + g.i, 'pd', S('jPD'), 6)}
          ${stepper('#workspace/' + g.i, 'research', S('jResearch'), 7)}
        </div>
        <div class="legend">${esc(S('journeyNote'))}</div>
      </div>

      <footer class="cc2Foot">
        <a class="btnLink primary" href="#workbench/${g.i}" data-jmark="expression" data-jgene="${g.i}">${esc(I18N.getLang() === 'zh' ? '进入靶点工作台' : 'Open target workbench')} →</a>
        ${Shortlist.button(g.i)}
      </footer>
    </article>`;
  }

  /* --------------------------------------------------------------------- page */
  function render(host, st) {
    Object.assign(state, st || {});
    const zh = I18N.getLang() === 'zh';

    function paint() {
      host.innerHTML = state.lens ? lensView() : landing();
      wire();
      Glossary.bind(host);
      Shortlist.bind(host);
    }

    function landing() {
      return `
        <h1 class="titleBeginner">${esc(S('title'))}</h1>
        <h1 class="titleExpert">${esc(S('expertTitle'))}</h1>
        <p class="lede screeningLede">${esc(S('sub'))}</p>
        ${Pages.help('candidates')}

        <div class="note">
          <b>${esc(S('firstTime'))}</b> ${esc(S('firstTimeBody'))}
          <br><br>${esc(S('lensNote'))}
        </div>

        <h2>${esc(S('chooseLens'))}</h2>
        <div class="lensGrid">${Lenses.ORDER.map(lensCard).join('')}</div>

        <div class="toolbar" style="margin-top:14px">
          <button type="button" class="primary" id="cWizard">${esc(S('wizardTitle'))}</button>
        </div>

        ${searchPanel()}
        ${funnelHtml(0)}
        ${wizard()}
        ${notHow()}`;
    }

    function lensView() {
      const def = Lenses.get(state.lens);
      const res = Lenses.list(state.lens, {
        topK: state.topK, order: state.order, subview: state.subview,
      });
      const rows = res.rows;
      const showing = rows.slice(0, state.shown);
      const total = DataService.ready().byIdx.filter(Boolean).length;

      const controls = [];
      if (def.topK) {
        controls.push(`<label>${esc(S('topk'))}
          <select id="cTopK">${Lenses.TOPK_CHOICES.map(n =>
            `<option value="${n}" ${state.topK === n ? 'selected' : ''}>Top ${n}</option>`).join('')}</select></label>
          <span class="badge warnBadge">${esc(S('topkNote'))}</span>`);
      }
      if (def.orderChoices) {
        controls.push(`<label>${esc(S('orderBy'))}
          <select id="cOrder">
            <option value="statRank" ${state.order === 'statRank' ? 'selected' : ''}>STAT rank</option>
            <option value="rwrRank" ${state.order === 'rwrRank' ? 'selected' : ''}>RWR rank</option>
          </select></label>`);
      }
      if (def.subviews) {
        controls.push(`<label>${esc(S('subview'))}
          <select id="cSub">
            <option value="all" ${state.subview === 'all' ? 'selected' : ''}>${esc(S('subAll'))}</option>
            <option value="near_zero" ${state.subview === 'near_zero' ? 'selected' : ''}>${esc(S('subNear'))}</option>
            <option value="non_near_zero" ${state.subview === 'non_near_zero' ? 'selected' : ''}>${esc(S('subNon'))}</option>
          </select></label>`);
      }

      return `
        <h1 class="titleBeginner">${esc(S('title'))}</h1>
        <h1 class="titleExpert">${esc(S('expertTitle'))}</h1>
        <p class="lede screeningLede">${esc(S('sub'))}</p>

        <div class="lensBar">
          <div>
            <div class="lbK">${esc(S('currentLens'))}</div>
            <div class="lbV">${esc(def.label[zh ? 'zh' : 'en'])}</div>
            <div class="lbS beginnerOnly">${esc(def.blurb[zh ? 'zh' : 'en'])}</div>
            <div class="lbS expertOnly">${esc(def.secondary[zh ? 'zh' : 'en'])}</div>
          </div>
          <div class="lbRight">
            <div class="lbCount">${esc(S('showing')(showing.length, rows.length))}</div>
            <button type="button" id="cChange">${esc(S('changeView'))}</button>
          </div>
        </div>
        <div class="legend" style="margin-bottom:12px">${esc(S('showingNote'))}</div>
        ${Pages.help('candidates')}
        ${state.lens === 'promoted' ? `<div class="note warn">${esc(zh
          ? '这里比较的是两份排名中的相对位置。它只帮助浏览，不能当作新的科学评分。'
          : 'This compares relative positions in two rankings. It helps browsing and is not a new scientific score.')}</div>` : ''}

        <div class="panel">
          <div class="toolbar">
            ${controls.join('')}
            <label>${esc(S('show'))}
              <select id="cShown">${[20, 50, 100].map(n =>
                `<option value="${n}" ${state.shown === n ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
            <span class="spacer">${showing.length} / ${rows.length}</span>
            <button type="button" id="cBack">${esc(S('changeView'))}</button>
          </div>
          ${showing.length
            ? `<div class="candGrid">${showing.map(x => card(x.g)).join('')}</div>
               ${rows.length > state.shown
                 ? `<div class="toolbar" style="margin-top:12px;justify-content:center">
                      <button type="button" id="cMore">${esc(S('loadMore'))}
                        (${Math.min(100, rows.length - state.shown)})</button></div>`
                 : ''}`
            : `<div class="note">${esc(S('none'))}</div>`}
        </div>

        ${state.sel.length ? compareBar() : ''}
        ${searchPanel()}
        ${funnelHtml(showing.length)}
        ${notHow()}`;
    }

    function compareBar() {
      const genes = state.sel.map(i => DataService.get_gene_detail(i)).filter(Boolean);
      return `<div class="compareBar">
        <b>${esc(S('compareTitle'))}</b>
        <span class="badge">${genes.length} ${esc(S('selected'))} · ${esc(S('compareMax'))}</span>
        <span class="mono" style="color:var(--dim)">${NT(genes.map(g => g.symbol || g.gene_id).join(', '))}</span>
        <span class="spacer"></span>
        <button type="button" class="primary" id="cGo">${esc(S('compareGo'))} →</button>
        <button type="button" id="cClearSel">${esc(S('clearSel'))}</button>
      </div>`;
    }

    function searchPanel() {
      return `<div class="panel">
        <h2 style="margin-top:0">${esc(S('searchTitle'))}</h2>
        <p class="lede">${esc(S('searchNote'))}</p>
        <div class="toolbar">
          <div class="searchWrap"><input id="cSearch" placeholder="${esc(S('searchHint'))}"
            style="min-width:320px" value="${esc(state.search || '')}"></div>
        </div>
        <div id="cSearchOut"></div>
      </div>`;
    }

    function notHow() {
      return `<details class="helpPanel">
        <summary>${esc(S('notHowTitle'))}</summary>
        <div class="helpBody"><div class="helpRow"><span class="hv">${esc(S('notHowBody'))}</span></div></div>
      </details>`;
    }

    /* --------------------------------------------------------------- search */
    function searchHit(g) {
      const zh = I18N.getLang() === 'zh';
      const pd = (typeof PdEvidence !== 'undefined' && PdEvidence.ready())
        ? PdEvidence.forGene(g.gene_id) : null;
      const row = (k, v) => `<div class="metricRow"><span class="mk">${esc(k)}</span>
        <span class="mv">${v}</span></div>`;
      return `<div class="searchHit">
        <div class="shHead">
          <a class="cc2Sym" href="#workbench/${g.i}">${NT(g.symbol || g.gene_id)}</a>
          <span class="mono" style="color:var(--dim)">${NT(g.gene_id)}</span>
          <span class="pill on">${esc(S('inUniverse'))}</span>
        </div>
        <div class="two">
          <div>
            ${row(S('eligP'), g.eligP ? '<span class="pill on">TRUE</span>' : '<span class="pill off">FALSE</span>')}
            ${row(S('eligV'), g.eligV ? '<span class="pill on">TRUE</span>' : '<span class="pill off">FALSE</span>')}
            ${row('STAT rank', g.statRank ?? 'NA')}
          </div>
          <div>
            ${row('RWR rank', g.rwrRank ?? 'NA')}
            ${row('degree', g.degree)}
            ${row(zh ? 'PD 参考证据' : 'PD reference evidence',
                  pd && pd.gwas_associations > 0
                    ? `${pd.gwas_associations} →` : esc(S('noEvidence')))}
          </div>
        </div>
        <div class="toolbar" style="margin:8px 0 0">
          <a class="btnLink" href="#gene/${g.i}">${esc(S('openEvidence'))} →</a>
        </div>
      </div>`;
    }

    function runSearch(q) {
      const out = host.querySelector('#cSearchOut');
      if (!out) return;
      const term = (q || '').trim();
      if (!term) { out.innerHTML = ''; return; }
      const hits = DataService.search_genes(term, 8);
      out.innerHTML = hits.length ? hits.map(searchHit).join('')
        : `<div class="note">${esc(I18N.getLang() === 'zh'
            ? '结构全集中没有匹配的基因。' : 'No matching gene in the structural universe.')}</div>`;
    }

    /* --------------------------------------------------------------- wiring */
    function openLens(id) {
      if (!Lenses.has(id)) return;
      state.lens = id; state.shown = 20; state.sel = [];
      paint();
      window.scrollTo({ top: 0 });
    }

    function wire() {
      host.querySelectorAll('[data-lens]').forEach(b => {
        b.onclick = () => openLens(b.dataset.lens);
      });
      const back = host.querySelector('#cBack');
      if (back) back.onclick = () => { state.lens = null; paint(); };
      const chg = host.querySelector('#cChange');
      if (chg) chg.onclick = () => { state.lens = null; paint(); };

      const tk = host.querySelector('#cTopK');
      if (tk) tk.onchange = e => { state.topK = +e.target.value; state.shown = 20; paint(); };
      const od = host.querySelector('#cOrder');
      if (od) od.onchange = e => { state.order = e.target.value; paint(); };
      const sub = host.querySelector('#cSub');
      if (sub) sub.onchange = e => { state.subview = e.target.value; paint(); };
      const sh = host.querySelector('#cShown');
      if (sh) sh.onchange = e => { state.shown = +e.target.value; paint(); };
      const more = host.querySelector('#cMore');
      if (more) more.onclick = () => { state.shown = Math.min(100, state.shown + 20); paint(); };

      // quick compare
      host.querySelectorAll('[data-cmp]').forEach(cb => {
        cb.onchange = () => {
          const i = +cb.dataset.cmp;
          if (cb.checked) {
            if (state.sel.length >= 4 && !state.sel.includes(i)) { cb.checked = false; return; }
            if (!state.sel.includes(i)) state.sel.push(i);
          } else {
            state.sel = state.sel.filter(x => x !== i);
          }
          paint();
        };
      });
      const go = host.querySelector('#cGo');
      if (go) go.onclick = () => openCompare();
      const cl = host.querySelector('#cClearSel');
      if (cl) cl.onclick = () => { state.sel = []; paint(); };

      // journey: following a guided step marks it as seen
      host.querySelectorAll('[data-jmark]').forEach(a => {
        a.addEventListener('click', () => Journey.mark(+a.dataset.jgene, a.dataset.jmark));
      });

      // wizard
      const wz = host.querySelector('#cWizard');
      if (wz) wz.onclick = () => {
        const w = host.querySelector('#wizard');
        if (w) { w.hidden = false; const f = w.querySelector('.wzOpt'); if (f) f.focus(); }
      };
      const wClose = host.querySelector('.wzClose');
      if (wClose) wClose.onclick = () => { const w = host.querySelector('#wizard'); if (w) w.hidden = true; };
      host.querySelectorAll('[data-wz]').forEach(b => {
        b.onclick = () => {
          const w = host.querySelector('#wizard');
          if (w) w.hidden = true;
          openLens(b.dataset.wz);
        };
      });

      // search
      const sq = host.querySelector('#cSearch');
      if (sq) {
        sq.oninput = () => { state.search = sq.value; runSearch(sq.value); };
        runSearch(state.search || '');
      }
    }

    /** Hand off to the Workspace, recording which lens each candidate came from. */
    function openCompare() {
      const lens = state.lens;
      // The origin lens is user exploration metadata — it records how the reader found
      // these genes, and is never read by anything scientific.
      const WS = (typeof V16Pages !== 'undefined') ? V16Pages.WorkspaceState : null;
      if (WS) { WS.genes = state.sel.slice(); WS.origin = lens; }
      if (state.sel.length) location.hash = '#workspace/' + state.sel.join(',');
      else paint();
    }

    paint();
    return {
      get lens() { return state.lens; },
      get shown() { return state.shown; },
      get selected() { return state.sel.slice(); },
      get origin() { return state.lens; },
      openLens,
      _state: state,
    };
  }

  /* ------------------------------------------------- short phrasings (cards) */
  const whyLine = (g, zh) => {
    const out = [];
    if (g.lp !== null) {
      const mult = Math.pow(2, Math.abs(g.lp));
      out.push(zh
        ? `在 MPTP 模型中${g.lp > 0 ? '高于' : (g.lp < 0 ? '低于' : '接近')}对照`
          + `${Math.abs(g.lp) > 0.05 ? `（约 ${mult.toFixed(2)} 倍）` : ''}`
        : `${g.lp > 0 ? 'Higher' : (g.lp < 0 ? 'Lower' : 'Close to')} control in MPTP`
          + `${Math.abs(g.lp) > 0.05 ? ` (about ${mult.toFixed(2)}×)` : ''}`);
    }
    if (g.degree > 0) {
      out.push(zh ? `网络中有 ${g.degree} 个互作伙伴`
                  : `${g.degree} interaction partner${g.degree === 1 ? '' : 's'} in the network`);
    }
    const d = (g.statRank !== null && g.rwrRank !== null) ? g.statRank - g.rwrRank : null;
    if (d !== null && d > 0) {
      out.push(zh ? `加入网络信息后相对位置提高（Δrank +${d}，仅供参考）`
                  : `Its relative position improved once network context was added (Δrank +${d}, indicative)`);
    }
    const vs = DataService.validation_state(g);
    if (vs.id === 'non_near_zero') {
      out.push(zh ? '在另一个 PD 模型中也能测到变化（幅度分类，非验证）'
                  : 'A change is also measurable in the other PD model (a magnitude classification, not validation)');
    }
    return out;
  };

  return { render, whyLine, C, _state: state };
})();
