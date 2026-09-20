/* XunZi-PD — Research Workspace.
 *
 * The interpretation surface: pick up to four candidates and compare them across every
 * layer of evidence the frozen pipeline produced, then extend that with the v1.6 layers
 * (pathway context and PD reference evidence).
 *
 * It produces NO combined score. There is deliberately no "overall", no "best gene" and
 * no winner. Where two genes differ, the interface shows the two numbers and says which
 * field each came from.
 *
 * Copy lives here for the same reason it does in screening.js: it is a long, self-
 * contained narrative and keeping it beside the markup makes the wording reviewable.
 */
const Workspace = (() => {
  const MAX_COMPARE = 4;

  const WS = {
    en: {
      nav: 'Research Workspace',
      title: 'PD Research Workspace',
      sub: 'Choose up to four candidates and compare them across expression, network, the '
         + 'independent PD model, pathway context and existing PD genetics — side by side, '
         + 'with no combined score.',
      noScore: 'No overall score, no ranking, no winner is produced here. Each row is one '
             + 'field from the frozen data, shown next to the same field for the other genes.',

      addGene: 'Add a candidate',
      addHint: 'Search a gene, or add from your shortlist.',
      addFromSL: 'Add from shortlist',
      empty: 'No candidates selected yet. Search above to add one, or add from your shortlist.',
      compare: 'Candidate comparison',
      compareN: 'candidates',
      maxNote: 'Up to four at a time.',
      remove: 'Remove',
      savedHint: 'Saved in this browser only. It is not uploaded and never enters a calculation.',
      share: 'Copy share link',
      shareDone: 'Share link copied',
      exportMd: 'Export Markdown',

      /* First screen: the reader's own candidate list, one card per gene. */
      mineTitle: 'My research candidates',
      mineEmpty: 'You have not added a candidate gene yet.',
      mineGo: 'Find candidate genes',
      mineOr: 'or',
      mineFromSL: 'open Guided Screening',
      kWhy: 'Why it is here',
      kEvidence: 'What the evidence shows so far',
      kTodo: 'What is still unchecked',
      kNote: 'Your note',
      noteHint: 'kept in this browser only — never used in any calculation',
      whySearch: 'Added from the gene search',
      whyShortlist: 'Added from your shortlist',
      whyLens: 'Added from the exploration view',
      todoDone: 'all seven evidence surfaces visited',
      todoNone: 'no evidence surface visited yet',
      todoRest: 'not looked at yet:',
      funnelMore: 'See how this list was filtered',
      j_expression: 'Expression', j_ranking: 'Ranking', j_network: 'Protein network',
      j_pairs: 'MPTP / PFF', j_pathways: 'Pathways', j_pd: 'PD evidence',
      j_research: 'My research',

      secIdentity: 'Identity',
      secMPTP: 'MPTP (discovery model)',
      secNetwork: 'Protein network (STRING)',
      secPFF: 'PFF (independent model)',
      secStatus: 'Analysis status',
      human: 'Human Ensembl', mouse: 'Mouse Ensembl',
      lfc: 'log2FC', fdr: 'FDR', statRank: 'STAT rank',
      degree: 'Degree', context: 'Network context', rwrRank: 'RWR rank', dr: 'Δrank (indicative)',
      valLfc: 'log2FC', valFdr: 'FDR', valState: 'Comparison state',
      cpmP: 'CPM pass · primary', cpmV: 'CPM pass · validation',
      eligP: 'Eligible · primary', eligV: 'Eligible · validation',

      matrixTitle: 'Candidate evidence matrix',
      matrixSub: 'One row per evidence field, one column per gene. ✓ means the field is '
               + 'present, — means it is not, NA means the value does not exist for that '
               + 'gene. No colour grade, no total.',
      yes: '✓', no: '—', na: 'NA',

      funnelTitle: 'Candidate funnel',
      funnelSub: 'Every stage is a real count. The last stage is research candidates — '
               + 'a working list, not a target set.',
      fUniverse: 'Structural universe', fEligible: 'Primary eligible',
      fRanked: 'Candidate ranking', fTopK: 'Your top-K view',
      fNetwork: 'Network review', fShortlist: 'Research candidates',
      fPending: 'not reached',

      reportTitle: 'Research summary',
      reportSub: 'A rule-generated summary of the fields above. No model writes this text: '
               + 'each line names the field it came from.',
      generate: 'Generate research summary',
      print: 'Print', exportTxt: 'Export TXT', exportCsv: 'Export CSV',
      reportLimits: 'Interpretation limits',
      valNonNearZero: 'NON-NEAR-ZERO CHANGE', valNearZero: 'NEAR ZERO',
      valNotComparable: 'NOT COMPARABLE',

      knownTitle: 'Known vs emerging candidates',
      knownSub: 'How many of your candidates appear in the PD reference evidence layer '
              + 'currently loaded.',
      known: 'Known-context candidates',
      emerging: 'Emerging candidates',
      knownNote: 'Known-context means this layer found PD reference evidence for the gene. '
               + 'Emerging means it did not.',
      emergingWarn: 'Lack of reference evidence does not mean novelty, and it does not '
                  + 'establish a new PD gene. It means the sources loaded here did not '
                  + 'mention it.',
      knownList: 'with PD reference evidence', emergingList: 'without PD reference evidence',
      noCandidates: 'Add candidates above to populate this view.',
    },
    zh: {
      nav: 'PD研究工作台',
      title: 'PD 研究工作台',
      sub: '选择最多四个候选基因，在表达、网络、独立 PD 模型、通路背景与已有 PD 遗传学证据上并排比较 —— '
         + '不产生任何综合评分。',
      noScore: '此处不产生总分、不排序、不评选最优基因。每一行都是冻结数据中的一个字段，'
             + '与其他基因的同一字段并排展示。',

      addGene: '添加候选基因',
      addHint: '搜索基因，或从候选清单添加。',
      addFromSL: '从候选清单添加',
      empty: '尚未选择候选基因。在上方搜索添加，或从候选清单添加。',
      compare: '候选基因比较',
      compareN: '个候选',
      maxNote: '一次最多四个。',
      remove: '移除',
      savedHint: '仅保存在当前浏览器中，不会上传，也不会进入任何计算。',
      share: '复制分享链接',
      shareDone: '分享链接已复制',
      exportMd: '导出 Markdown',

      /* 首屏：读者自己的候选清单，每个基因一张卡片。 */
      mineTitle: '我的研究候选',
      mineEmpty: '你还没有加入候选基因。',
      mineGo: '去寻找候选基因',
      mineOr: '或',
      mineFromSL: '打开候选筛选',
      kWhy: '为什么加入',
      kEvidence: '目前看到的证据',
      kTodo: '还需要查看什么',
      kNote: '用户备注',
      noteHint: '只保存在本浏览器，不参与任何计算',
      whySearch: '通过基因搜索加入',
      whyShortlist: '从候选清单加入',
      whyLens: '来自探索视角',
      todoDone: '七层证据都已查看',
      todoNone: '还没有查看任何一层证据',
      todoRest: '还没看：',
      funnelMore: '查看筛选流程',
      j_expression: '表达', j_ranking: '排名', j_network: '蛋白网络',
      j_pairs: 'MPTP / PFF', j_pathways: '通路', j_pd: 'PD 证据',
      j_research: '我的研究',

      secIdentity: '身份标识',
      secMPTP: 'MPTP（发现模型）',
      secNetwork: '蛋白网络（STRING）',
      secPFF: 'PFF（独立模型）',
      secStatus: '分析状态',
      human: '人类 Ensembl', mouse: '小鼠 Ensembl',
      lfc: 'log2FC', fdr: 'FDR', statRank: 'STAT 排名',
      degree: '直接互作蛋白', context: '网络背景', rwrRank: 'RWR 排名', dr: 'Δrank（仅供参考）',
      valLfc: 'log2FC', valFdr: 'FDR', valState: '比较状态',
      cpmP: 'CPM 通过 · 主队列', cpmV: 'CPM 通过 · 验证队列',
      eligP: '可分析 · 主队列', eligV: '可分析 · 验证队列',

      matrixTitle: '候选证据矩阵',
      matrixSub: '每行一个证据字段，每列一个基因。✓ 表示该字段存在，— 表示不存在，'
               + 'NA 表示该基因没有这个值。不给出颜色评级，也没有合计。',
      yes: '✓', no: '—', na: 'NA',

      funnelTitle: '候选漏斗',
      funnelSub: '每个阶段都是真实计数。最后一步是研究候选清单 —— 一份工作清单，不是靶点集合。',
      fUniverse: '结构全集', fEligible: '主队列可分析',
      fRanked: '候选排名', fTopK: '你选择的 Top-K 视图',
      fNetwork: '网络复核', fShortlist: '研究候选',
      fPending: '尚未到达',

      reportTitle: '研究摘要',
      reportSub: '根据以上字段由规则生成的摘要。没有任何模型撰写这段文字：每一行都标出它来自哪个字段。',
      generate: '生成研究摘要',
      print: '打印', exportTxt: '导出 TXT', exportCsv: '导出 CSV',
      reportLimits: '解释限制',
      valNonNearZero: '非近零变化', valNearZero: '接近零', valNotComparable: '不可比较',

      knownTitle: '已知背景候选 vs 新出现候选',
      knownSub: '你的候选中有多少出现在当前加载的 PD 参考证据层中。',
      known: '已知背景候选',
      emerging: '新出现候选',
      knownNote: '“已知背景”表示该层为该基因找到了 PD 参考证据；“新出现”表示没有找到。',
      emergingWarn: '缺少参考证据不代表新颖性，也不能据此认定这是一个新的 PD 基因。'
                  + '它只说明此处加载的来源没有提到它。',
      knownList: '有 PD 参考证据', emergingList: '无 PD 参考证据',
      noCandidates: '在上方添加候选基因以填充此视图。',
    },
  };
  const S = (k) => {
    const d = WS[I18N.getLang()] || WS.en;
    return (k in d) ? d[k] : (WS.en[k] !== undefined ? WS.en[k] : k);
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
  const cell = (v, fmt) => (v === null || v === undefined || Number.isNaN(v))
    ? `<span class="na">NA</span>` : (fmt ? fmt(v) : esc(v));

  /* The reader's selected candidates are product state, not scientific data. Keeping
   * them locally makes My Research useful across refreshes without an account, server,
   * cookie, upload or new database. A share URL is explicit and contains node indexes
   * only; notes are deliberately excluded. */
  const SAVED = (() => {
    const KEY = 'xz.workspace.v1';
    const clean = xs => Array.from(new Set((Array.isArray(xs) ? xs : [])
      .map(Number).filter(n => Number.isInteger(n) && n >= 0 && n < 15688))).slice(0, MAX_COMPARE);
    const get = () => {
      try { return clean(JSON.parse(localStorage.getItem(KEY) || '[]')); }
      catch (e) { return []; }
    };
    const set = xs => {
      const v = clean(xs);
      try { localStorage.setItem(KEY, JSON.stringify(v)); } catch (e) {}
      return v;
    };
    return { get, set };
  })();

  /* ------------------------------------------------------------ evidence matrix
   * Rows are evidence fields, columns are genes. ✓ / — / NA only. Deliberately no
   * colour grade and no total: the brief forbids a summary verdict, and a traffic-light
   * grid is a verdict with the arithmetic hidden.
   */
  const MATRIX_ROWS = [
    { id: 'primary_de', get: g => (g.lp !== null && g.fp !== null) ? 'yes' : 'na' },
    { id: 'stat_rank', get: g => g.statRank !== null ? 'yes' : 'na' },
    { id: 'network_connected', get: g => g.degree > 0 ? 'yes' : 'no' },
    { id: 'rwr_rank', get: g => g.rwrRank !== null ? 'yes' : 'na' },
    { id: 'network_promoted', get: g => {
        const d = (g.statRank !== null && g.rwrRank !== null) ? g.statRank - g.rwrRank : null;
        return d === null ? 'na' : (d > 0 ? 'yes' : 'no');
      } },
    { id: 'validation_measurable', get: g => g.lv !== null ? 'yes' : 'na' },
    { id: 'validation_fdr', get: g => g.fv !== null ? 'yes' : 'na' },
    { id: 'validation_near_zero', get: g => {
        if (g.lv === null) return 'na';
        return Math.abs(g.lv) < DataService.NEAR_ZERO_LFC ? 'yes' : 'no';
      } },
  ];

  const MATRIX_LABEL = {
    en: {
      primary_de: 'Primary DE statistics',
      stat_rank: 'STAT-DE-v1 rank',
      network_connected: 'Network connected (degree > 0)',
      rwr_rank: 'STRING-RWR-v1 rank',
      network_promoted: 'Network promotion (Δrank > 0)',
      validation_measurable: 'Measurable in validation cohort',
      validation_fdr: 'Validation FDR available',
      validation_near_zero: 'Validation effect near zero',
    },
    zh: {
      primary_de: '主队列差异表达统计量',
      stat_rank: 'STAT-DE-v1 排名',
      network_connected: '网络连通（degree > 0）',
      rwr_rank: 'STRING-RWR-v1 排名',
      network_promoted: '网络提升（Δrank > 0）',
      validation_measurable: '验证队列可测量',
      validation_fdr: '验证 FDR 可用',
      validation_near_zero: '验证效应接近零',
    },
  };
  const mlabel = id => (MATRIX_LABEL[I18N.getLang()] || MATRIX_LABEL.en)[id] || id;

  function matrix(genes) {
    const sym = { yes: S('yes'), no: S('no'), na: S('na') };
    const cls = { yes: 'mx-yes', no: 'mx-no', na: 'mx-na' };
    return `<div class="tableWrap" style="max-height:none"><table class="matrixTable">
      <thead><tr><th scope="col">${esc(mlabel('primary_de')).replace(/.*/, '')}${esc(S('matrixTitle'))}</th>
        ${genes.map(g => `<th scope="col" class="num">${esc(g.symbol || g.gene_id)}</th>`).join('')}</tr></thead>
      <tbody>${MATRIX_ROWS.map(r => `<tr>
        <td class="mxLabel">${esc(mlabel(r.id))}</td>
        ${genes.map(g => {
          const v = r.get(g);
          return `<td class="num"><span class="${cls[v]}" title="${esc(mlabel(r.id) + ': ' + sym[v])}">${sym[v]}</span></td>`;
        }).join('')}
      </tr>`).join('')}</tbody></table></div>`;
  }

  /* ------------------------------------------------------------------- funnel */
  function funnelHtml(topK, shortlistN, reviewedN) {
    const stages = DataService.funnel({ topK, shortlistN, reviewedN });
    const label = {
      universe: S('fUniverse'), eligible: S('fEligible'), ranked: S('fRanked'),
      topk: S('fTopK'), network_review: S('fNetwork'), shortlist: S('fShortlist'),
    };
    return `<div class="funnel">${stages.map((st, i) => `
      <div class="fnStep${st.frozen ? ' frozen' : ''}">
        <div class="fnN">${st.n === null ? `<span class="na">${esc(S('fPending'))}</span>`
                                          : st.n.toLocaleString()}</div>
        <div class="fnL">${esc(label[st.id] || st.id)}</div>
        ${st.frozen ? '' : `<div class="fnT">${esc(I18N.getLang() === 'zh' ? '你的选择' : 'your selection')}</div>`}
      </div>${i < stages.length - 1 ? '<div class="fnA">↓</div>' : ''}`).join('')}</div>`;
  }

  /* --------------------------------------------------------- interpretation pairs */
  function whyCautions(g, topK) {
    const zh = I18N.getLang() === 'zh';
    const whyTxt = {
      expr_change: d => zh
        ? `MPTP 模型中 ${d.lfc > 0 ? '上调' : (d.lfc < 0 ? '下调' : '几乎不变')}，log2FC ${d.lfc.toFixed(3)}（约 ${d.multiple.toFixed(2)} 倍），FDR ${pv(d.fdr)}。`
        : `Measured ${d.lfc > 0 ? 'higher' : (d.lfc < 0 ? 'lower' : 'unchanged')} in MPTP: log2FC ${d.lfc.toFixed(3)} (about ${d.multiple.toFixed(2)}×), FDR ${pv(d.fdr)}.`,
      expr_rank: d => zh
        ? `STAT-DE-v1 排名第 ${d.rank}，位于你所选 top ${d.topK} 之内。`
        : `STAT-DE-v1 rank ${d.rank} — inside the top ${d.topK} you selected.`,
      network_edges: d => zh
        ? `STRING 网络中记录了 ${d.degree} 个互作伙伴。`
        : `Has ${d.degree} recorded interaction partner${d.degree === 1 ? '' : 's'} in STRING.`,
      no_network_edges: () => zh
        ? `在当前 STRING physical network 中没有保留任何互作边（degree 0）。`
        : `No retained interaction edge in the current STRING physical network (degree 0).`,
      promoted: d => zh
        ? `网络传播后优先级上升，Δrank +${d.delta}。`
        : `Priority rose after network propagation: Δrank +${d.delta}.`,
      demoted: d => zh
        ? `网络传播后优先级下降，Δrank ${d.delta}。`
        : `Priority fell after network propagation: Δrank ${d.delta}.`,
      val_signal: d => zh
        ? `PFF 中的效应幅度落在近零区间之外：log2FC ${d.lv.toFixed(3)}，FDR ${pv(d.fdr)}。`
        : `The PFF effect is outside the near-zero range: log2FC ${d.lv.toFixed(3)}, FDR ${pv(d.fdr)}.`,
      val_near_zero: d => zh
        ? `PFF 中基本没有变化（|log2FC| = ${Math.abs(d.lv).toFixed(4)} < 0.05）。`
        : `Essentially unchanged in PFF (|log2FC| = ${Math.abs(d.lv).toFixed(4)} < 0.05).`,
      val_missing: () => zh
        ? `PFF 验证队列中没有测量值。`
        : `No measurement in the PFF validation cohort.`,
    };
    const cautionTxt = {
      not_ranked: () => zh
        ? `该基因没有 STAT-DE-v1 排名（不是主队列可分析基因）。`
        : `This gene has no STAT-DE-v1 rank — it is not analysis-eligible in the primary cohort.`,
      outside_topk: d => zh
        ? `STAT-DE-v1 排名第 ${d.rank}，在你所选 top ${d.topK} 之外。这只说明它不在你当前的浏览范围内。`
        : `STAT-DE-v1 rank ${d.rank} sits outside the top ${d.topK} you selected. That only means it is outside your current view.`,
      fdr_is_not_a_verdict: d => zh
        ? `主队列 FDR 为 ${pv(d.fdr)}。本应用不施加显著性阈值，数值列出供你自行判断`
          + `（界面在 ${d.convention} 处着色，那只是显示约定）。`
        : `Primary FDR is ${pv(d.fdr)}. This app applies no significance threshold; the value is `
          + `shown so you can judge it (the interface shades at ${d.convention} purely as a display convention).`,
      val_near_zero: d => zh
        ? `PFF 效应接近零，因此其符号没有意义，不能据此判断方向是否一致。`
        : `The PFF effect is near zero, so its sign is not meaningful — direction agreement cannot be read from it.`,
      val_missing: () => zh
        ? `该基因在 PFF 队列中不可比较，无法在此检查。`
        : `This gene is not comparable in the PFF cohort, so nothing can be checked there.`,
      isolated: () => zh
        ? `degree 0：RWR 排名仅反映重启项 / 种子贡献，不包含任何传播而来的网络支持。`
        : `Degree 0: the RWR rank reflects the restart / seed contribution only, with no propagated network support.`,
      rank_universe_mismatch: d => zh
        ? `Δrank = ${d.delta}。STAT 与 RWR 使用不同的 reported-rank 全集，因此 Δrank 仅供参考，不是校准后的位移。`
        : `Δrank = ${d.delta}. STAT and RWR rank inside different reported-rank universes, so Δrank is indicative and not a calibrated shift.`,
      direction_opposite: d => zh
        ? `MPTP 与 PFF 方向相反（${d.lp.toFixed(3)} vs ${d.lv.toFixed(3)}）。两个模型机制不同，方向相反不等于结论冲突。`
        : `MPTP and PFF point in opposite directions (${d.lp.toFixed(3)} vs ${d.lv.toFixed(3)}). The models differ mechanistically; an opposite sign is not a contradiction.`,
    };
    const why = DataService.why_inspect(g, { topK })
      .map(it => (whyTxt[it.id] ? `<li>${esc(whyTxt[it.id](it.data))}</li>` : '')).join('');
    const caut = DataService.cautions(g, { topK })
      .map(it => (cautionTxt[it.id] ? `<li>${esc(cautionTxt[it.id](it.data))}</li>` : '')).join('');
    return `<div class="two whyTwo">
      <div class="whyBox"><div class="wbT">${esc(zh ? '为什么值得关注？' : 'Why inspect?')}</div>
        <ul>${why}</ul></div>
      <div class="whyBox caut"><div class="wbT">${esc(zh ? '为什么需要谨慎？' : 'Cautions')}</div>
        <ul>${caut}</ul></div>
    </div>`;
  }

  /* ------------------------------------------------------------ comparison table */
  function compareTable(genes) {
    const rowH = (label, fn, cls) => `<tr>
      <th scope="row" class="cmpLabel${cls ? ' ' + cls : ''}">${esc(label)}</th>
      ${genes.map(g => `<td class="num">${fn(g)}</td>`).join('')}</tr>`;
    const section = (label) => `<tr class="cmpSection"><th scope="row" colspan="${genes.length + 1}">${esc(label)}</th></tr>`;

    return `<div class="tableWrap" style="max-height:none"><table class="cmpTable">
      <thead><tr><th scope="col"></th>
        ${genes.map(g => `<th scope="col"><span class="cmpSym">${esc(g.symbol || g.gene_id)}</span>
          <button type="button" class="slRm" data-wsrm="${g.i}">${esc(S('remove'))}</button></th>`).join('')}
      </tr></thead><tbody>
      ${section(S('secIdentity'))}
      ${rowH(S('human'), g => `<span class="mono">${NT(g.gene_id)}</span>`)}
      ${rowH(S('mouse'), g => `<span class="mono">${NT(g.mouse || 'NA')}</span>`)}
      ${section(S('secMPTP'))}
      ${rowH(S('lfc'), g => cell(g.lp, v => f(v, 3)))}
      ${rowH(S('fdr'), g => cell(g.fp, pv))}
      ${rowH(S('statRank'), g => cell(g.statRank))}
      ${section(S('secNetwork'))}
      ${rowH(S('degree'), g => g.degree)}
      ${rowH(S('context'), g => g.degree > 0
        ? `<span class="tag t-purple">${esc(I18N.getLang() === 'zh' ? '连通' : 'connected')}</span>`
        : `<span class="tag t-grey">${esc(I18N.getLang() === 'zh' ? '孤立' : 'isolated')}</span>`)}
      ${rowH(S('rwrRank'), g => cell(g.rwrRank))}
      ${rowH(S('dr'), g => {
        const d = (g.statRank !== null && g.rwrRank !== null) ? g.statRank - g.rwrRank : null;
        return cell(d, v => v > 0 ? `<span class="up">+${v}</span>` : String(v));
      })}
      ${section(S('secPFF'))}
      ${rowH(S('valLfc'), g => cell(g.lv, v => f(v, 3)))}
      ${rowH(S('valFdr'), g => cell(g.fv, pv))}
      ${rowH(S('valState'), g => Screening.validationChip(g, { compact: true }))}
      ${section(S('secStatus'))}
      ${rowH(S('cpmP'), g => pill(g.cpmP))}
      ${rowH(S('cpmV'), g => pill(g.cpmV))}
      ${rowH(S('eligP'), g => pill(g.eligP))}
      ${rowH(S('eligV'), g => pill(g.eligV))}
      </tbody></table></div>`;
  }
  const pill = b => b ? '<span class="pill on">TRUE</span>' : '<span class="pill off">FALSE</span>';

  /** Where these candidates came from. Pure exploration metadata — it is the reader's
   *  own path through the app, and nothing scientific reads it. */
  function originNote(genes) {
    // WorkspaceState lives inside the V16Pages module, not in this scope. Referring to
    // it bare threw a ReferenceError and took the whole workspace render with it.
    const WS = (typeof V16Pages !== 'undefined') ? V16Pages.WorkspaceState : null;
    const origin = WS ? WS.origin : null;
    if (!origin || !genes.length || typeof Lenses === 'undefined') return '';
    const def = Lenses.get(origin);
    if (!def) return '';
    const zh = I18N.getLang() === 'zh';
    return `<div class="note" style="margin-bottom:12px">
      <b>${esc(S('addedFrom'))}:</b> ${esc(def.label[zh ? 'zh' : 'en'])}
      <span class="na">— ${esc(zh ? '这只是你的浏览路径记录，不是科学结论'
                                  : 'your browsing path, recorded for context only')}</span></div>`;
  }

  /* --------------------------------------------------------------- gene picker */

  /**
   * The reader's own note per candidate. localStorage only, exactly like the shortlist
   * and the review journey: nothing scientific reads it, it never enters the report,
   * and it never leaves the browser.
   */
  const NOTES = (() => {
    const KEY = 'xz.notes.v1';
    let d = {};
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const p = JSON.parse(raw);
        if (p && typeof p === 'object') {
          Object.keys(p).forEach(k => { if (/^\d+$/.test(k) && typeof p[k] === 'string') d[k] = p[k]; });
        }
      }
    } catch (e) { d = {}; }
    const save = () => { try { localStorage.setItem(KEY, JSON.stringify(d)); } catch (e) {} };
    return {
      get: i => d[i] || '',
      set: (i, v) => {
        const s = String(v == null ? '' : v).slice(0, 300);
        if (s) d[i] = s; else delete d[i];
        save();
      },
    };
  })();

  /** Why this gene is on the reader's list. Browsing provenance — never a property of
   *  the gene, and never read by anything scientific. */
  function whyAdded(g) {
    const inSL = (typeof Shortlist !== 'undefined') && Shortlist.has(g.i);
    const origin = (typeof V16Pages !== 'undefined' && V16Pages.WorkspaceState)
      ? V16Pages.WorkspaceState.origin : null;
    const def = (origin && typeof Lenses !== 'undefined') ? Lenses.get(origin) : null;
    const zh = I18N.getLang() === 'zh';
    if (def) {
      return `${esc(S('whyLens'))}「${esc(def.label[zh ? 'zh' : 'en'])}」`;
    }
    return esc(inSL ? S('whyShortlist') : S('whySearch'));
  }

  /** One candidate card: the gene, why it is here, what is known so far, what is left. */
  function mineCard(g) {
    const zh = I18N.getLang() === 'zh';
    const beg = (document.documentElement.dataset.mode || 'beginner') === 'beginner';
    const pr = (typeof Journey !== 'undefined') ? Journey.progress(g.i)
      : { done: 0, total: 0, steps: [] };
    const todo = pr.steps.filter(s => !s.seen).map(s => S('j_' + s.id));
    const vs = DataService.validation_state(g);
    const stLabel = { non_near_zero: S('valNonNearZero'), near_zero: S('valNearZero'),
                      not_comparable: S('valNotComparable') }[vs.id];
    const fold = DataService.foldPhrase(g.lp);
    const facts = beg ? [
      fold ? (zh
        ? `MPTP 中表达${fold.lfc > 0 ? '升高' : (fold.lfc < 0 ? '降低' : '接近不变')}，约 ${fold.multiple.toFixed(2)} 倍`
        : `Expression is ${fold.lfc > 0 ? 'higher' : (fold.lfc < 0 ? 'lower' : 'near unchanged')} in MPTP (about ${fold.multiple.toFixed(2)}×)`) : '',
      zh ? `${g.degree} 个蛋白互作伙伴` : `${g.degree} protein interaction partner${g.degree === 1 ? '' : 's'}`,
      `PFF: ${stLabel}`,
    ].filter(Boolean).join(' · ') : [
      `MPTP log2FC ${f(g.lp, 3)} · FDR ${pv(g.fp)}`,
      `${S('statRank')} #${g.statRank ?? 'NA'} · ${S('rwrRank')} #${g.rwrRank ?? 'NA'}`,
      `${S('degree')} ${g.degree}`,
      `PFF ${stLabel}`,
    ].join(' · ');
    return `<div class="mrCard">
      <div class="mrHead">
        <a class="cc2Sym" href="#gene/${g.i}">${NT(g.symbol || g.gene_id)}</a>
        <span class="mono" style="color:var(--dim)">${NT(g.gene_id)}</span>
        <span class="na">${pr.done} / ${pr.total}</span>
        <button type="button" class="slRm" data-wsrm="${g.i}">${esc(S('remove'))}</button>
      </div>
      <div class="mrRow"><span class="mrK">${esc(S('kWhy'))}</span><span class="mrV">${whyAdded(g)}</span></div>
      <div class="mrRow"><span class="mrK">${esc(S('kEvidence'))}</span>
        <span class="mrV${beg ? '' : ' mono'}">${esc(facts)}</span></div>
      <div class="mrRow"><span class="mrK">${esc(S('kTodo'))}</span>
        <span class="mrV">${todo.length === 0 ? esc(S('todoDone'))
          : (pr.done === 0 ? esc(S('todoNone')) : esc(S('todoRest'))) + (todo.length === 0 ? '' : ' '
            + todo.map(x => `<span class="todoChip">${esc(x)}</span>`).join(''))}</span></div>
      <div class="mrRow"><span class="mrK">${esc(S('kNote'))}</span>
        <span class="mrV"><input type="text" class="mrNote" data-note="${g.i}"
          value="${esc(NOTES.get(g.i))}" placeholder="${esc(S('noteHint'))}"></span></div>
    </div>`;
  }

  function picker(genes) {
    const full = genes.length >= MAX_COMPARE;
    return `<div class="panel minePanel">
      <h2 style="margin-top:0">${esc(S('mineTitle'))}
        <span class="na">${genes.length} / ${MAX_COMPARE}</span></h2>
      <div class="toolbar">
        <div class="searchWrap"><input id="wsq" ${full ? 'disabled' : ''}
          placeholder="${esc(S('addHint'))}" style="min-width:300px"></div>
        <button type="button" id="wsFromSL">${esc(S('addFromSL'))}</button>
        <button type="button" id="wsShare" ${genes.length ? '' : 'disabled'}>${esc(S('share'))}</button>
        <span class="spacer">${esc(S('maxNote'))}</span>
      </div>
      <div class="localOnlyHint" id="wsLocalHint">${esc(S('savedHint'))}</div>
      ${genes.length ? genes.map(mineCard).join('')
        : `<div class="emptyState">
             <div class="esT">${esc(S('mineEmpty'))}</div>
             <div class="esA">
               <a class="btnLink primary" href="#candidates">${esc(S('mineGo'))}</a>
               <span class="na">${esc(S('mineOr'))}</span>
               <a class="btnLink" href="#screening">${esc(S('mineFromSL'))}</a>
             </div>
           </div>`}
    </div>`;
  }

  /* The candidate panel now carries its own empty state (with a way out of it), so the
   * old grey note after it would only repeat the same sentence. */
  const emptyNote = () => '';

  /* ------------------------------------------------------------------- report */
  function reportText(genes, topK) {
    const zh = I18N.getLang() === 'zh';
    const L = [];
    L.push(zh ? 'XunZi-PD 研究摘要（规则生成）' : 'XunZi-PD Research Summary (rule-generated)');
    L.push(zh ? '本文件由数据字段直接生成，未使用任何模型撰写文字，也不构成治疗靶点建议。'
              : 'Generated directly from data fields. No model writes this text, and it is not a '
                + 'therapeutic-target recommendation.');
    L.push('');
    genes.forEach(g => {
      L.push('='.repeat(58));
      L.push(`${g.symbol || g.gene_id}   ${g.gene_id}`);
      L.push('='.repeat(58));
      L.push(zh ? '主队列（MPTP vs Saline，发现模型）' : 'Primary model (MPTP vs Saline, discovery)');
      L.push(`  log2FC : ${f(g.lp, 4)}`);
      L.push(`  FDR    : ${pv(g.fp)}`);
      L.push(`  STAT rank : ${g.statRank ?? 'NA'}`);
      L.push('');
      L.push(zh ? '蛋白网络（STRING v12 physical）' : 'Protein network (STRING v12 physical)');
      L.push(`  degree : ${g.degree}`);
      L.push(`  context: ${g.degree > 0 ? (zh ? '连通' : 'connected') : (zh ? '孤立' : 'isolated')}`);
      L.push(`  RWR rank : ${g.rwrRank ?? 'NA'}`);
      const d = (g.statRank !== null && g.rwrRank !== null) ? g.statRank - g.rwrRank : null;
      L.push(`  Δrank  : ${d === null ? 'NA' : d}  ${zh ? '（不同排名全集，仅供参考）' : '(different rank universes — indicative only)'}`);
      L.push('');
      L.push(zh ? '验证（PFF vs PBS，独立模型）' : 'Validation (PFF vs PBS, independent model)');
      L.push(`  log2FC : ${f(g.lv, 4)}`);
      L.push(`  FDR    : ${pv(g.fv)}`);
      const vs = DataService.validation_state(g);
      // These labels live in this module's own dictionary. Reaching for Screening's
      // keys returned the bare key name — 'stPresent' — straight into the report text.
      const stLabel = { non_near_zero: S('valNonNearZero'), near_zero: S('valNearZero'),
                        not_comparable: S('valNotComparable') }[vs.id];
      L.push(`  state  : ${stLabel}`);
      if (vs.id === 'non_near_zero') {
        L.push(zh ? '           （幅度分类，不等于统计显著 / 可重复 / 已验证）'
                  : '           (magnitude classification only — not significance, replication or validation)');
      }
      if (vs.id === 'near_zero') {
        L.push(zh ? '           （接近零，符号没有意义）' : '           (near zero — the sign is not meaningful)');
      }

      const pw = (typeof Pathways !== 'undefined') ? Pathways.forGene(g.gene_id) : null;
      if (pw) {
        L.push('');
        L.push(zh ? '通路背景（成员关系，非富集）' : 'Pathway context (membership, not enrichment)');
        const list = pw.reactome.slice(0, 6).concat(pw.gobp.slice(0, 4));
        if (!list.length) L.push(zh ? '  当前通路参考层中没有该基因。' : '  Not present in the loaded pathway reference.');
        list.forEach(p => L.push(`  [${p.source}] ${p.name}`));
        L.push(`  ${zh ? '共' : 'total'} ${pw.reactome.length} Reactome · ${pw.gobp.length} GO BP`);
      }

      const pd = (typeof PdEvidence !== 'undefined') ? PdEvidence.forGene(g.gene_id) : null;
      if (pd) {
        L.push('');
        L.push(zh ? 'PD 参考证据（外部背景，不参与排名）' : 'PD reference evidence (external context, never feeds ranking)');
        if (pd.gwas_associations > 0) {
          L.push(zh ? `  GWAS 关联数 : ${pd.gwas_associations}` : `  GWAS associations : ${pd.gwas_associations}`);
          L.push(`  ${zh ? '最强 p 值' : 'strongest p'} : ${pd.strongest_p}`);
          L.push(`  ${zh ? '研究编号' : 'studies'} : ${pd.studies.slice(0, 8).join(', ')}`);
        } else {
          L.push(zh ? '  当前参考层未发现该基因的 PD 关联证据。'
                    : '  No PD association evidence found for this gene in the loaded reference.');
        }
      }

      L.push('');
      L.push(zh ? '解释限制' : 'Interpretation limits');
      const lim = {
        en: [
          'No overall score was computed; this summary lists fields, it does not rank.',
          'STAT and STRING-RWR rank inside different reported-rank universes, so Δrank is indicative.',
          'A non-near-zero validation effect is not statistical significance, not replication, and not biological validation.',
          'A near-zero validation effect has no interpretable sign.',
          'Pathway lines are membership lookups, not enrichment results.',
          'PD reference evidence is external context and never influenced any ranking.',
          'Nothing here identifies a therapeutic target, and nothing here establishes disease causation.',
        ],
        zh: [
          '未计算任何综合评分；本摘要只是列出字段，不进行排序。',
          'STAT 与 STRING-RWR 使用不同的 reported-rank 全集，因此 Δrank 仅供参考。',
          '验证效应为非近零，不等于统计显著、不等于可重复、也不等于生物学验证。',
          '接近零的验证效应其符号没有解释意义。',
          '通路信息是成员关系查询，不是富集结果。',
          'PD 参考证据属于外部背景，从未参与任何排名。',
          '本文件不认定任何治疗靶点，也不确立任何疾病因果关系。',
        ],
      }[zh ? 'zh' : 'en'];
      lim.forEach(x => L.push(`  - ${x}`));
      L.push('');
    });
    return L.join('\n');
  }

  /* --------------------------------------------------------------------- page */
  function render(host, state) {
    const hasExplicitGenes = !!state && Object.prototype.hasOwnProperty.call(state, 'genes');
    state = Object.assign({ genes: [], topK: 100, sel: null }, state || {});
    // A deep link is authoritative. A bare #workspace restores this browser's list.
    state.genes = hasExplicitGenes ? SAVED.set(state.genes) : SAVED.get();
    // Session state lives on the module so navigating away and back keeps the selection.
    render._state = state;

    function paint() {
      const resolved = state.genes.map(i => DataService.get_gene_detail(i)).filter(Boolean);
      host.innerHTML = shell(resolved);
      wire(resolved);
      Glossary.bind(host);
      Shortlist.bind(host);
    }

    function shell(genes) {
      const beg = (document.documentElement.dataset.mode || 'beginner') === 'beginner';
      return `
        <h1 class="titleBeginner">${esc(T('ws2.q'))}</h1>
        <h1 class="titleExpert">${esc(S('title'))}</h1>
        <p class="lede screeningLede">${esc(S('sub'))}</p>
        ${Pages.help('workspace')}
        <div class="note">${esc(S('noScore'))}</div>

        ${picker(genes)}
        ${originNote(genes)}
        ${genes.length ? `
          ${knownEmerging(genes)}
          <details class="workspaceEvidenceDetails" ${beg ? '' : 'open'}>
            <summary>${esc(I18N.getLang() === 'zh' ? '技术比较与导出' : 'Technical comparison and export')}</summary>
          <div class="panel">
            <h2 style="margin-top:0">${esc(S('compare'))} <span class="na">${genes.length} ${esc(S('compareN'))}</span></h2>
            ${compareTable(genes)}
          </div>
          <div class="panel">
            <h2 style="margin-top:0">${esc(S('matrixTitle'))}</h2>
            <p class="lede">${esc(S('matrixSub'))}</p>
            ${matrix(genes)}
          </div>
          ${genes.map(g => `<div class="panel">
            <h2 style="margin-top:0">${NT(g.symbol || g.gene_id)} <span class="na">${NT(g.gene_id)}</span></h2>
            ${whyCautions(g, state.topK)}
          </div>`).join('')}
          <div class="panel">
            <h2 style="margin-top:0">${esc(S('reportTitle'))}</h2>
            <p class="lede">${esc(S('reportSub'))}</p>
            <textarea id="wsReport" class="reportBox" readonly rows="14"></textarea>
            <div class="toolbar" style="margin-top:10px">
              <button type="button" class="primary" id="wsGen">${esc(S('generate'))}</button>
              <button type="button" id="wsPrint">${esc(S('print'))}</button>
              <button type="button" id="wsTxt">${esc(S('exportTxt'))}</button>
              <button type="button" id="wsCsv">${esc(S('exportCsv'))}</button>
              <button type="button" id="wsMd">${esc(S('exportMd'))}</button>
            </div>
          </div></details>
        ` : emptyNote()}

        <details class="why funnelFold">
          <summary>${esc(S('funnelMore'))}</summary>
          <div class="panel">
            <h2 style="margin-top:0">${esc(S('funnelTitle'))}</h2>
            <p class="lede">${esc(S('funnelSub'))}</p>
            ${funnelHtml(state.topK, Shortlist.size(), genes.length)}
          </div>
        </details>`;
    }

    function knownEmerging(genes) {
      if (typeof PdEvidence === 'undefined' || !PdEvidence.ready()) return '';
      const known = genes.filter(g => PdEvidence.forGene(g.gene_id)?.gwas_associations > 0);
      const emerging = genes.filter(g => !(PdEvidence.forGene(g.gene_id)?.gwas_associations > 0));
      const list = (arr, empty) => arr.length
        ? `<ul class="keList">${arr.map(g => `<li><a href="#gene/${g.i}">${esc(g.symbol || g.gene_id)}</a></li>`).join('')}</ul>`
        : `<div class="na">${esc(empty)}</div>`;
      return `<div class="panel">
        <h2 style="margin-top:0">${esc(S('knownTitle'))}</h2>
        <p class="lede">${esc(S('knownSub'))}</p>
        <div class="two">
          <div class="keCard known"><div class="keT">${esc(S('known'))} · ${known.length}</div>
            <div class="keS">${esc(S('knownList'))}</div>${list(known, S('noCandidates'))}</div>
          <div class="keCard emerging"><div class="keT">${esc(S('emerging'))} · ${emerging.length}</div>
            <div class="keS">${esc(S('emergingList'))}</div>${list(emerging, S('noCandidates'))}</div>
        </div>
        <div class="note warn">${esc(S('emergingWarn'))}</div>
      </div>`;
    }

    function addGene(i) {
      if (state.genes.includes(i) || state.genes.length >= MAX_COMPARE) return;
      state.genes.push(i); state.genes = SAVED.set(state.genes); paint();
    }

    function wire(genes) {
      const q = host.querySelector('#wsq');
      if (q) bindSearch(q, g => addGene(g.i));
      const fromSL = host.querySelector('#wsFromSL');
      if (fromSL) fromSL.onclick = () => {
        Shortlist.all().forEach(i => { if (state.genes.length < MAX_COMPARE) addGene(i); });
        paint();
      };
      host.querySelectorAll('[data-wsrm]').forEach(b => {
        b.onclick = () => {
          state.genes = SAVED.set(state.genes.filter(x => x !== +b.dataset.wsrm)); paint();
        };
      });
      const share = host.querySelector('#wsShare');
      if (share) share.onclick = async () => {
        const url = new URL(location.href);
        url.hash = '#workspace/' + state.genes.join(',');
        try { await navigator.clipboard.writeText(url.href); }
        catch (e) {
          const ta = document.createElement('textarea');
          ta.value = url.href; ta.style.position = 'fixed'; ta.style.opacity = '0';
          document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove();
        }
        share.textContent = S('shareDone');
      };
      // The reader's own notes. Written on input, never read by anything scientific.
      host.querySelectorAll('[data-note]').forEach(inp => {
        inp.oninput = () => NOTES.set(Number(inp.dataset.note), inp.value);
      });

      const box = host.querySelector('#wsReport');
      const setText = () => { if (box) box.value = reportText(genes, state.topK); };
      if (box) setText();
      const gen = host.querySelector('#wsGen');
      if (gen) gen.onclick = () => { setText(); if (box) box.scrollTop = 0; };
      const pr = host.querySelector('#wsPrint');
      if (pr) pr.onclick = () => {
        setText();
        const w = window.open('', '_blank');
        if (!w) return;
        w.document.write(`<pre style="font:12px/1.5 ui-monospace,Menlo,Consolas,monospace">`
          + esc(reportText(genes, state.topK)) + '</pre>');
        w.document.close(); w.focus(); w.print();
      };
      const tx = host.querySelector('#wsTxt');
      if (tx) tx.onclick = () => download('xunzi-pd-research-summary.txt',
        reportText(genes, state.topK), 'text/plain');
      const cv = host.querySelector('#wsCsv');
      if (cv) cv.onclick = () => download('xunzi-pd-research-summary.csv',
        reportCsv(genes), 'text/csv');
      const md = host.querySelector('#wsMd');
      if (md) md.onclick = () => download('xunzi-pd-research-summary.md',
        reportMarkdown(genes, state.topK), 'text/markdown');
    }

    function reportMarkdown(genes, topK) {
      const title = I18N.getLang() === 'zh' ? '# XunZi-PD 研究摘要' : '# XunZi-PD Research Summary';
      const boundary = I18N.getLang() === 'zh'
        ? '> 研究候选不等于已验证靶点。本文件由冻结数据字段按规则生成。'
        : '> A research candidate is not a validated target. This file is rule-generated from frozen data fields.';
      return `${title}\n\n${boundary}\n\n\`\`\`text\n${reportText(genes, topK)}\n\`\`\`\n`;
    }

    function reportCsv(genes) {
      const head = ['gene_symbol', 'gene_id', 'mouse_gene_id',
        'primary_log2FC', 'primary_FDR', 'STAT_reported_rank',
        'graph_degree', 'network_context', 'RWR_reported_rank', 'delta_rank_indicative',
        'validation_log2FC', 'validation_FDR', 'validation_state',
        'pathway_reactome_n', 'pathway_gobp_n', 'pd_gwas_associations',
        'analysis_eligible_primary', 'analysis_eligible_validation'];
      const lines = [
        '# User-generated exploratory research summary.',
        '# Not a validated therapeutic-target list. Ranks are the authoritative reported_rank values.',
        head.join(','),
      ];
      genes.forEach(g => {
        const d = (g.statRank !== null && g.rwrRank !== null) ? g.statRank - g.rwrRank : null;
        const pw = (typeof Pathways !== 'undefined') ? Pathways.forGene(g.gene_id) : null;
        const pd = (typeof PdEvidence !== 'undefined') ? PdEvidence.forGene(g.gene_id) : null;
        lines.push([
          g.symbol || '', g.gene_id, g.mouse || '',
          g.lp ?? 'NA', g.fp ?? 'NA', g.statRank ?? 'NA',
          g.degree, g.degree > 0 ? 'connected' : 'isolated', g.rwrRank ?? 'NA', d ?? 'NA',
          g.lv ?? 'NA', g.fv ?? 'NA', DataService.validation_state(g).id,
          pw ? pw.reactome.length : 'NA', pw ? pw.gobp.length : 'NA',
          pd ? pd.gwas_associations : 'NA',
          g.eligP ? 'TRUE' : 'FALSE', g.eligV ? 'TRUE' : 'FALSE',
        ].map(v => {
          const s = String(v);
          return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
        }).join(','));
      });
      return lines.join('\n') + '\n';
    }

    function download(name, text, mime) {
      const blob = new Blob([text], { type: mime + ';charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 2000);
    }

    const bindSearch = (window.Pages && Pages.bindSearch) ? Pages.bindSearch
      : (input, onPick) => {
          input.onchange = () => {
            const hit = DataService.search_genes(input.value, 1)[0];
            if (hit) onPick(hit);
          };
        };

    paint();
    return {
      add: addGene,
      get genes() { return state.genes.slice(); },
      get topK() { return state.topK; },
    };
  }

  return { render, MAX_COMPARE, MATRIX_ROWS, MATRIX_LABEL, reportText, whyCautions,
           compareTable, matrix, funnelHtml, WS, SAVED };
})();
