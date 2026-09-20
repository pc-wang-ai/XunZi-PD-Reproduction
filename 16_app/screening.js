/* XunZi-PD — Guided Screening.
 *
 * The beginner-facing entry point: a five-step pass over evidence that already exists,
 * built so someone who has never met DESeq2, STRING or RWR can still follow what is
 * being claimed and what is not.
 *
 * Read-only. Every number comes from DataService; the only state this page owns is the
 * current step, the reader's chosen top-K range, and which candidate card is open.
 * Nothing here computes a statistic or introduces a cutoff.
 *
 * Copy for this page lives in a page-local dictionary rather than the shared I18N table:
 * it is a long, self-contained narrative, and keeping it next to the markup it describes
 * makes the wording reviewable in one place. Shared chrome strings stay in I18N.
 */
const Screening = (() => {
  /* ------------------------------------------------------------------ copy */
  const SC = {
    en: {
      nav: 'Guided Screening',
      title: 'Finding PD candidate genes worth further study, among 15,688 genes',
      sub: 'First we ask whether a gene changes in the Parkinson\'s disease model. Then we look at '
         + 'whether the protein it encodes sits in an affected interaction network. Finally we use an '
         + 'independent PD model to check whether those candidates still have support.',
      caveat: '“Candidate gene” is not “validated therapeutic target”.',
      caveatBody: 'This tool ranks genes as worth studying next. Becoming a therapeutic target also '
         + 'requires mechanism work, druggability assessment and experimental validation — none of '
         + 'which this app does.',

      dnaTitle: 'What the two layers actually measure',
      dnaCap1: 'RNA-seq mainly tells us whether Gene A changes its expression.',
      dnaCap2: 'The STRING network tells us which other proteins the protein encoded by Gene A interacts with.',
      whyTitle: 'Why look at genes and proteins together?',
      whyBody: 'A gene\'s expression level and its protein\'s role in the cell are different kinds of '
         + 'evidence. A gene can change strongly but sit alone in the network, with no known '
         + 'interaction partner. Another can change modestly while sitting at the centre of a group of '
         + 'proteins that all act together. This app shows both layers side by side so you can judge '
         + 'each candidate on more than one axis — it does not claim one layer is better than the other.',

      modelsTitle: 'Two fixed models — neither is interchangeable',
      modelsNote: 'The pipeline is fixed: MPTP is always the discovery model, PFF is always the '
         + 'validation model. You cannot switch them, and the validation cohort never influenced any '
         + 'ranking.',
      m1: 'Step 1 — Discovery model', m1a: 'MPTP vs Saline', m1b: '4 vs 4',
      m1use: 'Use: find candidate genes here',
      m2: 'Step 2 — Validation model', m2a: 'PFF vs PBS', m2b: '5 vs 5',
      m2use: 'Use: check whether a candidate still shows a signal in a different PD model',
      discovery: 'DISCOVERY MODEL', validation: 'VALIDATION MODEL',

      steps: ['Find changed genes', 'Compare the two rankings', 'Check the protein network',
              'Check the independent model', 'Build your shortlist'],
      stepWord: 'Step',
      of: 'of',

      /* step 1 */
      s1title: 'Three ideas, and then the data',
      s1body: 'Before the table, three terms. You do not need to know how they are computed — you '
            + 'need to know what question each one answers.',
      cLfc: 'How big is the change',
      cLfcEx: 'log2FC +1 ≈ about twice the control level. log2FC −1 ≈ about half. 0 ≈ no measurable change.',
      cFdr: 'How strong is the evidence',
      cFdrEx: 'Corrected for testing thousands of genes at once. Smaller is stronger. It says nothing '
            + 'about how large the change is.',
      cElig: 'Can this gene be analysed at all',
      cEligEx: 'Whether the gene passed the pre-declared expression filter. Genes that fail keep their '
             + 'row with NA — they are never deleted.',
      s1go: 'View the expression results',

      /* step 2 */
      s2title: 'Two ways of ranking the same genes',
      s2body: 'Both rankings cover exactly the same 12,577 analysis-eligible genes. They differ in '
            + 'what they take into account.',
      rk1: 'Only the gene\'s own expression',
      rk1q: 'Whose own expression change is the most noteworthy?',
      rk1n: 'STAT-DE-v1',
      rk2: 'Add the protein network',
      rk2q: 'Once the interactions around a gene are taken into account, whose priority rises?',
      rk2n: 'STRING-RWR-v1',
      topk: 'Show how many?',
      topkNote: 'Explore only — not a biological cutoff.',
      topkNote2: 'Changing this only changes which rows are listed here. It changes no rank, score or '
               + 'result anywhere in the app.',
      legend: 'What the labels mean',
      legendNote: 'Every label below is read straight from frozen values. A label is a description of '
                + 'the data, never a verdict about the gene.',
      candidates: 'candidates',
      cardHint: 'Select a gene to see why it stands out.',

      /* step 3 */
      s3title: 'The network is between proteins, not genes',
      s3lead: 'What you are looking at is not DNA connecting to DNA. It is the set of interactions '
            + 'between the proteins these genes encode.',
      s3pick: 'Pick a gene',
      s3none: 'Nothing selected yet. Choose a candidate in step 2, or search below.',
      s3adv: 'Advanced network view',
      s3advNote: 'Shows a wider neighbourhood. Leave this off unless you need it.',
      centre: 'Selected gene',
      neighbours: 'interacting proteins',

      /* step 4 */
      s4title: 'Does the signal still show up in a different PD model?',
      s4lead: 'MPTP is used to discover candidates. PFF is used to check them. They are different '
            + 'models of the disease, so a candidate does not have to look the same in both.',
      s4warn: 'A different sign does not automatically mean the two models disagree biologically. '
            + 'When a validation log2FC is close to zero, its sign may only reflect tiny fluctuation.',
      stPresent: 'NON-NEAR-ZERO CHANGE',
      stNear: 'NEAR ZERO',
      stMissing: 'NOT COMPARABLE',
      stPresentD: 'The validation effect is outside the near-zero range. This is an effect-magnitude '
                + 'classification only — it is not statistical significance, not a replicated '
                + 'finding, and not biological validation. The FDR is shown alongside it.',
      stNearD: 'Essentially unchanged in the validation model — within the analysis\'s |log2FC| < 0.05 '
             + 'near-zero range. The sign of such a value is not meaningful.',
      stMissingD: 'This gene has no measurement in the validation cohort, so nothing can be checked here.',
      s4rule: 'NEAR ZERO uses the existing validation-analysis definition, |validation log2FC| < 0.05. '
            + 'No new cutoff is introduced on this page.',

      /* step 5 */
      s5title: 'Your candidate shortlist',
      s5lead: 'Add genes from anywhere in the app with “Add to shortlist”. This list lives only in '
            + 'your browser — it is not uploaded, and it never affects the frozen analysis.',
      s5empty: 'Your shortlist is empty. Open a candidate and add it, or add the top entries from '
             + 'step 2.',
      col: { gene: 'Gene', lp: 'Primary log2FC', fp: 'Primary FDR', stat: 'STAT rank',
             rwr: 'RWR rank', degree: 'Degree', lv: 'Validation log2FC', fv: 'Validation FDR',
             notes: 'Notes' },
      remove: 'Remove', clear: 'Clear all', export: 'Export CSV',
      exported: 'Exported. The file states that this is an exploratory list you generated, not a '
              + 'validated target list.',
      addTop: 'Add the listed candidates',

      nextTitle: 'What should I do next?',
      next1: 'Once you have found genes with an expression signal, the next question is whether the '
           + 'network changes their priority.',
      next1btn: 'Go to step 2',
      next2: 'Select a candidate you find interesting, then look at the protein network around it.',
      next2btn: 'Check the network',
      next3: 'Once you know whether it has real network context, check the independent PFF model.',
      next3btn: 'Check validation',
      next4: 'Add the genes you want to follow up to your shortlist and export it.',
      next4btn: 'Build the shortlist',
      next5: 'That is the full pass. You can revisit any step, switch to Expert mode for every raw '
           + 'field, or read the full term list below.',
      next5btn: 'Back to step 1',
      openRk: 'Open the full Ranking page',
      openVal: 'Open the full Validation page',
      openNet: 'Open the full Network explorer',
      openDe: 'Open the full Expression table',

      glossTitle: 'Terms used on this page',
      glossBody: 'Every specialist term, defined once. The same definitions are available anywhere '
               + 'they appear, behind the ? mark.',
      slTitle: 'Shortlist',
      slEmpty: 'Nothing added yet.',
    },
    zh: {
      nav: '候选筛选',
      title: '从 15,688 个基因中寻找值得进一步研究的 PD 候选基因',
      sub: '我们先看基因在帕金森病模型中是否发生变化，再看其对应蛋白是否处于异常的互作网络，'
         + '最后使用独立 PD 模型检查这些候选是否仍有支持。',
      caveat: '“候选基因” ≠ “已验证治疗靶点”。',
      caveatBody: '本工具用于优先排序后续值得研究的基因。真正成为治疗靶点还需要机制研究、可药性评估与实验验证 —— '
         + '这些都不是本应用能完成的。',

      dnaTitle: '两层证据分别在测量什么',
      dnaCap1: 'RNA-seq 主要告诉我们：Gene A 的表达是否发生变化。',
      dnaCap2: 'STRING 网络告诉我们：Gene A 对应的蛋白，与哪些其他蛋白发生互作。',
      whyTitle: '为什么要同时看基因和蛋白？',
      whyBody: '基因的表达量与其蛋白在细胞中的作用，是两类不同的证据。一个基因可能变化很大，'
         + '却在网络中独自存在、没有已知的互作伙伴；另一个基因可能变化温和，却位于一群协同工作的蛋白中心。'
         + '本应用把两层证据并排展示，让你能从多个维度判断每个候选 —— 它并不声称哪一层更重要。',

      modelsTitle: '两个固定模型 —— 不可互换',
      modelsNote: '流程是固定的：MPTP 始终是发现模型，PFF 始终是验证模型。二者不能互换，'
         + '验证队列也从未影响任何排名。',
      m1: '第一步 — 发现模型', m1a: 'MPTP vs Saline', m1b: '4 vs 4',
      m1use: '用途：从这里寻找候选基因',
      m2: '第二步 — 验证模型', m2a: 'PFF vs PBS', m2b: '5 vs 5',
      m2use: '用途：检查候选基因在另一种 PD 模型中是否仍有信号',
      discovery: '发现模型', validation: '验证模型',

      steps: ['发现表达异常', '比较候选排名', '检查蛋白网络', '检查独立模型', '形成候选清单'],
      stepWord: '第', of: '步，共',

      s1title: '先理解三个概念，再看数据',
      s1body: '在看表格之前，先认识三个术语。你不需要知道它们怎么算出来，只需要知道各自回答了什么问题。',
      cLfc: '变化有多大',
      cLfcEx: 'log2FC +1 ≈ 表达量约为对照的 2 倍；−1 ≈ 约为 1/2；0 ≈ 没有可测变化。',
      cFdr: '证据有多强',
      cFdrEx: '已对同时检验数千个基因做了校正。数值越小证据越强。它不反映变化幅度的大小。',
      cElig: '这个基因能否进入分析',
      cEligEx: '该基因是否通过了预先声明的表达量过滤。未通过的基因仍保留在表中、统计量为 NA —— 从不删除。',
      s1go: '查看 Primary 表达结果',

      s2title: '同一批基因的两种排名方式',
      s2body: '两套排名覆盖完全相同的 12,577 个可分析基因，区别在于各自考虑了哪些信息。',
      rk1: '只看基因自身的表达',
      rk1q: '谁自身的表达变化最值得关注？',
      rk1n: 'STAT-DE-v1',
      rk2: '加入蛋白网络',
      rk2q: '把一个基因周围的蛋白互作关系也考虑进去后，谁的优先级提高？',
      rk2n: 'STRING-RWR-v1',
      topk: '显示多少个？',
      topkNote: '仅供探索 —— 不是生物学阈值。',
      topkNote2: '修改此项只改变此处列出哪些行，不改变本应用中任何排名、分数或结果。',
      legend: '这些标签的含义',
      legendNote: '以下每个标签都直接读取自冻结字段。标签是对数据的描述，不是对基因的判定。',
      candidates: '个候选',
      cardHint: '选择一个基因，查看它为什么突出。',

      s3title: '网络连接的是蛋白质，不是基因',
      s3lead: '这里看的不是 DNA 之间互相连接，而是这些基因所编码蛋白之间的相互作用。',
      s3pick: '选择一个基因',
      s3none: '尚未选择。可在第 2 步挑选候选，或在下方搜索。',
      s3adv: '高级网络视图',
      s3advNote: '显示更大范围的邻域。不需要时请保持关闭。',
      centre: '所选基因',
      neighbours: '互作蛋白',

      s4title: '换一种 PD 模型，信号还在吗？',
      s4lead: 'MPTP 用来发现候选，PFF 用来检查候选。它们是不同的疾病模型，因此候选不必在两者中表现一致。',
      s4warn: '正负方向不同，并不自动代表两个模型生物学相反。当 validation log2FC 接近 0 时，'
            + '其符号可能只反映微小波动。',
      stPresent: '非近零变化',
      stNear: '接近零',
      stMissing: '不可比较',
      stPresentD: '验证队列中的效应幅度落在近零区间之外。这仅是对效应幅度的分类 —— 不等于统计显著，'
                + '不等于结果可重复，也不等于生物学验证。此处同时列出 FDR。',
      stNearD: '在验证模型中基本没有变化 —— 落在本分析的 |log2FC| < 0.05 近零区间内。这类数值的符号没有意义。',
      stMissingD: '该基因在验证队列中没有测量值，因此无法在此比较。',
      s4rule: '“接近零”使用的是既有验证分析定义 |validation log2FC| < 0.05，本页不引入任何新阈值。',

      s5title: '你的候选清单',
      s5lead: '在应用任意位置点击“加入候选清单”即可添加。该清单只保存在你的浏览器中 —— 不会上传，'
            + '也绝不影响冻结的分析结果。',
      s5empty: '候选清单为空。打开某个候选后加入，或从第 2 步添加列出的条目。',
      col: { gene: '基因', lp: 'Primary log2FC', fp: 'Primary FDR', stat: 'STAT 排名',
             rwr: 'RWR 排名', degree: '度', lv: 'Validation log2FC', fv: 'Validation FDR',
             notes: '备注' },
      remove: '移除', clear: '清空', export: '导出 CSV',
      exported: '已导出。文件内注明这是你生成的探索性清单，而非经过验证的靶点列表。',
      addTop: '添加列出的候选',

      nextTitle: '下一步该做什么？',
      next1: '找到有表达信号的基因后，下一步比较 STAT-DE 和 STRING-RWR 排名。',
      next1btn: '进入第 2 步',
      next2: '选中感兴趣的候选后，下一步查看其蛋白网络。',
      next2btn: '检查蛋白网络',
      next3: '判断它是否具有真实网络上下文后，再查看 PFF 独立验证。',
      next3btn: '查看验证',
      next4: '把你想继续跟进的基因加入候选清单并导出。',
      next4btn: '构建候选清单',
      next5: '完整流程到此结束。你可以回到任意步骤，切换到专家模式查看全部原始字段，或阅读下方的术语表。',
      next5btn: '回到第 1 步',
      openRk: '打开完整候选排名页',
      openVal: '打开完整验证页',
      openNet: '打开完整网络浏览器',
      openDe: '打开完整差异表达表',

      glossTitle: '本页使用的术语',
      glossBody: '所有专业术语只定义一次。它们出现的地方都能通过 ? 号查看同样的定义。',
      slTitle: '候选清单',
      slEmpty: '尚未添加任何基因。',
    },
  };
  const S = (k) => {
    const d = SC[I18N.getLang()] || SC.en;
    return (k in d) ? d[k] : (SC.en[k] !== undefined ? SC.en[k] : k);
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

  const STEPS = [
    { n: 1, id: 'expression', page: 'de' },
    { n: 2, id: 'ranking', page: 'ranking' },
    { n: 3, id: 'network', page: 'network' },
    { n: 4, id: 'validation', page: 'validation' },
    { n: 5, id: 'shortlist', page: null },
  ];
  const TOPK_CHOICES = [20, 50, 100];

  /* ------------------------------------------------------- presentation pieces */

  /** DNA → gene → mRNA → protein → interacting proteins. Deliberately schematic: this
   *  is a diagram of a concept, not of any gene in the dataset. */
  function centralDogma() {
    const zh = I18N.getLang() === 'zh';
    const partner = (name, cls) => `<div class="dnaPartner ${cls}">Protein ${name}</div>`;
    return `<div class="dna" role="img" aria-label="${esc(zh
      ? '示意流程：DNA → 基因 → mRNA → 蛋白质 → 与之互作的蛋白质'
      : 'Schematic: DNA → gene → mRNA → protein → proteins it interacts with')}">
      <div class="dnaNode top">DNA</div>
      <div class="dnaArrow">▼</div>
      <div class="dnaNode gene">Gene A</div>
      <div class="dnaArrow"><span class="dnaLab">${zh ? '转录' : 'transcription'}</span>▼</div>
      <div class="dnaNode">mRNA</div>
      <div class="dnaArrow"><span class="dnaLab">${zh ? '翻译' : 'translation'}</span>▼</div>
      <div class="dnaNode prot">Protein A</div>
      <div class="dnaArrow">▼</div>
      <div class="dnaPartners">
        ${partner('B', 'p1')}${partner('C', 'p2')}${partner('D', 'p3')}
      </div>
      <div class="dnaTag notranslate" translate="no">STRING ${zh ? '互作' : 'interaction'}</div>
    </div>`;
  }

  const modelCard = (kind, title, a, b, use) => `
    <div class="modelCard ${kind}">
      <div class="mcTag">${kind === 'disc' ? S('discovery') : S('validation')}</div>
      <div class="mcTitle">${esc(title)}</div>
      <div class="mcPair">${esc(a)} <span class="mcN">${esc(b)}</span></div>
      <div class="mcUse">${esc(use)}</div>
      <div class="mcTerm">${Glossary.chip(kind === 'disc' ? 'primary' : 'validation')}</div>
    </div>`;

  /** Explanation tag chips for a gene, from DataService.explain_gene. */
  function tagChips(g, topK) {
    const zh = I18N.getLang() === 'zh';
    const ex = DataService.explain_gene(g, { topK });
    if (!ex) return '';
    // Each entry is a function of its own tag, so nothing is evaluated for a tag that
    // is not present. Building these strings eagerly made every absent tag a
    // `.find(...).rank` on undefined at render time.
    const map = {
      strong_expression: (t) => ({
        cls: 't-blue',
        t: zh ? `表达证据突出 · top ${t.topK} 之内` : `Strong expression candidate · within top ${t.topK}`,
        tip: zh ? `STAT-DE-v1 排名第 ${t.rank}，在你选择的 top ${t.topK} 之内。`
                : `STAT-DE-v1 rank ${t.rank}, inside the top ${t.topK} you chose.`,
      }),
      network_supported: (t) => ({
        cls: 't-purple',
        t: zh ? `网络支持 · degree ${t.degree}` : `Network-supported · degree ${t.degree}`,
        tip: zh ? '该蛋白在冻结网络中至少有一个保留的互作伙伴。'
                : 'The encoded protein has at least one retained interaction partner in the frozen network.',
      }),
      isolated: () => ({
        cls: 't-grey',
        t: zh ? '无 STRING 网络支持 · degree 0' : 'Isolated · no STRING network support',
        tip: zh ? '该基因仍可能有很强的表达证据，但当前 STRING physical network 没有为它提供传播支持。'
                : 'This gene may still have strong expression evidence, but the current STRING physical '
                  + 'network gives it no propagated support.',
      }),
      network_promoted: (t) => ({
        cls: 't-green',
        t: zh ? `网络加入后优先级提高 · Δrank +${t.delta}` : `Network-promoted · Δrank +${t.delta}`,
        tip: zh ? 'Δrank = STAT reported rank − RWR reported rank，两者排名全集略有不同，因此仅供参考。'
                : 'Δrank = STAT reported rank − RWR reported rank. The two rank over slightly '
                  + 'different universes, so this is indicative only.',
      }),
      not_promoted: (t) => ({
        cls: 't-grey',
        t: zh ? `网络加入后未提升 · Δrank ${t.delta}` : `Not promoted by network · Δrank ${t.delta}`,
        tip: zh ? '网络传播后排名没有提高。这不表示该基因不重要。'
                : 'The network did not raise its priority. This does not make the gene unimportant.',
      }),
    };
    return ex.tags.map(t => {
      const make = map[t.id];
      if (!make) return '';
      const m = make(t);
      return `<span class="tag ${m.cls}" tabindex="0" title="${esc(m.tip)}">${esc(m.t)}</span>`;
    }).join('');
  }

  /**
   * `compact` drops the explanatory sentence to a title attribute. Inside a narrow table
   * cell the full description is a ~1,500px nowrap line, which stretches the whole table
   * and pushes every other column out of view.
   */
  const validationChip = (g, { compact = false } = {}) => {
    const vs = DataService.validation_state(g);
    const map = {
      non_near_zero: ['v-green', S('stPresent'), S('stPresentD')],
      near_zero: ['v-amber', S('stNear'), S('stNearD')],
      not_comparable: ['v-grey', S('stMissing'), S('stMissingD')],
    };
    const [cls, label, desc] = map[vs.id];
    if (compact) {
      return `<span class="valState ${cls}" title="${esc(desc)}">`
        + `<span class="vsTag">${esc(label)}</span></span>`;
    }
    return `<div class="valState ${cls}"><span class="vsTag">${esc(label)}</span>`
      + `<span class="vsDesc">${esc(desc)}</span></div>`;
  };

  /** Why is this gene interesting — rule-generated, every clause tied to a field. */
  function whyList(g, topK) {
    const zh = I18N.getLang() === 'zh';
    const items = DataService.why_interesting(g, { topK });
    const text = {
      expr_change: (d) => {
        const mult = d.multiple >= 1.05 || d.multiple <= 0.95
          ? (zh ? `（约 ${d.multiple.toFixed(2)} 倍）` : ` (about ${d.multiple.toFixed(2)}×)`) : '';
        const dir = d.lfc > 0 ? (zh ? '上调' : 'higher') : (d.lfc < 0 ? (zh ? '下调' : 'lower') : (zh ? '几乎不变' : 'essentially unchanged'));
        return zh ? `在 MPTP 模型中发现 ${dir}，log2FC ${d.lfc.toFixed(3)}${mult}，FDR ${pv(d.fdr)}。`
                  : `Measured ${dir} in the MPTP model: log2FC ${d.lfc.toFixed(3)}${mult}, FDR ${pv(d.fdr)}.`;
      },
      expr_rank: (d) => zh
        ? `在 STAT-DE-v1 中排名第 ${d.rank}，位于你选择的 top ${d.topK} 之内。`
        : `Ranks ${d.rank} under STAT-DE-v1 — inside the top ${d.topK} you selected.`,
      network_edges: (d) => zh
        ? `在 STRING 网络中记录了 ${d.degree} 个互作伙伴。`
        : `Has ${d.degree} recorded interaction partner${d.degree === 1 ? '' : 's'} in the STRING network.`,
      no_network_edges: () => zh
        ? `在当前 STRING physical network 中没有保留任何互作边（degree 0）。`
        : `Has no retained interaction edge in the current STRING physical network (degree 0).`,
      promoted: (d) => zh
        ? `网络传播后排名提高，Δrank +${d.delta}。`
        : `Its priority rose after network propagation: Δrank +${d.delta}.`,
      demoted: (d) => zh
        ? `网络传播后排名下降，Δrank ${d.delta}。这不表示该基因不重要。`
        : `Its priority fell after network propagation: Δrank ${d.delta}. That does not make it unimportant.`,
      val_signal: (d) => zh
        ? `在 PFF 验证模型中仍可测得变化：log2FC ${d.lv.toFixed(3)}，FDR ${pv(d.fdr)}。`
        : `Still measurable in the PFF validation model: log2FC ${d.lv.toFixed(3)}, FDR ${pv(d.fdr)}.`,
      val_near_zero: (d) => zh
        ? `在 PFF 验证模型中基本没有变化（|log2FC| = ${Math.abs(d.lv).toFixed(4)} < 0.05），其符号没有意义。`
        : `Essentially unchanged in the PFF validation model (|log2FC| = ${Math.abs(d.lv).toFixed(4)} < 0.05); its sign is not meaningful.`,
      val_missing: () => zh
        ? `在 PFF 验证队列中没有测量值，无法在此比较。`
        : `Has no measurement in the PFF validation cohort, so nothing can be compared there.`,
    };
    return items.map(it => (text[it.id] ? `<li>${esc(text[it.id](it.data))}</li>` : '')).join('');
  }

  /* ------------------------------------------------------------ candidate card */
  /** The simplified card shown before the full Gene Detail page. */
  function candidateCard(g, { topK, onClose, onOpen } = {}) {
    const zh = I18N.getLang() === 'zh';
    const p = DataService.foldPhrase(g.lp);
    const dirIcon = p ? (p.lfc > 0 ? '↑' : (p.lfc < 0 ? '↓' : '→')) : '—';
    const vs = DataService.validation_state(g);
    const vsLabel = { non_near_zero: S('stPresent'), near_zero: S('stNear'),
                      not_comparable: S('stMissing') }[vs.id];
    const vsCls = { non_near_zero: 'v-green', near_zero: 'v-amber', not_comparable: 'v-grey' }[vs.id];

    const block = (n, title, body, cls) => `
      <div class="ccBlock ${cls || ''}">
        <div class="ccN">${esc(n)}</div>
        <div class="ccT">${esc(title)}</div>
        <div class="ccB">${body}</div>
      </div>`;

    return `<div class="candCard" role="dialog" aria-label="${esc((g.symbol || g.gene_id) + ' candidate summary')}">
      <div class="ccHead">
        <div>
          <div class="ccSym">${NT(g.symbol || g.gene_id)}</div>
          <div class="ccId mono">${NT(g.gene_id)}</div>
        </div>
        <div class="ccActions">
          ${Shortlist.button(g.i)}
          <button type="button" class="ccClose" aria-label="${esc(zh ? '关闭' : 'Close')}">×</button>
        </div>
      </div>

      <div class="ccGrid">
        ${block('1', zh ? 'MPTP 表达变化' : 'MPTP expression',
          `<span class="ccDir">${dirIcon}</span> log2FC <b>${f(g.lp, 3)}</b> · FDR <b>${pv(g.fp)}</b>`, 'b-blue')}
        ${block('2', zh ? '统计优先级' : 'Statistical priority',
          `STAT rank <b>${g.statRank ?? 'NA'}</b>`, 'b-blue')}
        ${block('3', zh ? '网络优先级' : 'Network priority',
          `RWR rank <b>${g.rwrRank ?? 'NA'}</b>`
          + `<span class="ccNote">${esc(zh ? '（两套排名全集不同，Δrank 仅供参考）' : '(different rank universes — Δrank is indicative)')}</span>`, 'b-purple')}
        ${block('4', zh ? '网络支持' : 'Network support',
          `Degree <b>${g.degree}</b>`, 'b-purple')}
        ${block('5', zh ? 'PFF 验证' : 'PFF validation',
          `log2FC <b>${f(g.lv, 3)}</b> · FDR <b>${pv(g.fv)}</b><br>`
          + `<span class="valState ${vsCls}"><span class="vsTag">${esc(vsLabel)}</span></span>`, 'b-green')}
      </div>

      <div class="ccWhy">
        <div class="ccWhyT">${esc(zh ? '这个基因为什么值得注意？' : 'Why is this gene interesting?')}</div>
        <ul>${whyList(g, topK)}</ul>
        <div class="ccWhyNote">${esc(zh
          ? '以上每一条都由真实数据字段直接生成，用于说明该候选为何出现在列表中。'
            + '它不表示该基因导致疾病，也不表示它可作为治疗靶点。'
          : 'Each line above is generated directly from a data field, to explain why this candidate '
            + 'appears in the list. It does not mean the gene causes disease or could serve as a '
            + 'therapeutic target.')}</div>
      </div>

      <div class="ccFoot">
        <button type="button" class="primary ccOpen">${esc(zh ? '打开完整基因详情 →' : 'Open full Gene Detail →')}</button>
        ${g.degree > 0 ? `<button type="button" class="ccNet">${esc(zh ? '查看网络' : 'Inspect network')}</button>` : ''}
        <button type="button" class="ccVal">${esc(zh ? '查看验证' : 'Check validation')}</button>
      </div>
    </div>`;
  }

  /* ------------------------------------------------------------------ page */
  function render(host, state) {
    state = Object.assign({ step: 1, topK: 20, sel: null, adv: false }, state || {});
    const zh = I18N.getLang() === 'zh';

    function go(step) { state.step = step; paint(); }
    function paint() {
      host.innerHTML = shell();
      wire();
      Glossary.bind(host);
      Shortlist.bind(host);
    }

    function shell() {
      const step = state.step;
      return `
        <h1>${esc(S('nav'))}</h1>
        <p class="lede screeningLede">${esc(S('title'))}</p>
        <p class="lede">${esc(S('sub'))}</p>

        <div class="note warn caveatNote">
          <b>${esc(S('caveat'))}</b>
          <button type="button" class="gloss glossInline" data-gloss="__caveat"
                  aria-label="${esc(zh ? '说明' : 'What this means')}">?<span class="visuallyHidden">${esc(zh ? '说明' : 'What this means')}</span></button>
          <div class="caveatBody">${esc(S('caveatBody'))}</div>
        </div>

        ${heroBlock()}
        ${stepper()}
        ${stepBody()}
        ${nextBlock()}
        ${step === 5 ? glossaryBlock() : ''}
      `;
    }

    /* --- intro blocks shown above the stepper, on every step --- */
    function heroBlock() {
      return `
        <h2>${esc(S('dnaTitle'))}</h2>
        <div class="panel dnaPanel">
          <div class="two">
            <div>${centralDogma()}</div>
            <div class="dnaCopy">
              <p class="dnaLine"><span class="dot blue"></span>${esc(S('dnaCap1'))}</p>
              <p class="dnaLine"><span class="dot purple"></span>${esc(S('dnaCap2'))}</p>
              <details class="why">
                <summary>${esc(S('whyTitle'))}</summary>
                <p>${esc(S('whyBody'))}</p>
              </details>
            </div>
          </div>
        </div>

        <h2>${esc(S('modelsTitle'))}</h2>
        <div class="two">
          ${modelCard('disc', S('m1'), S('m1a'), S('m1b'), S('m1use'))}
          ${modelCard('val', S('m2'), S('m2a'), S('m2b'), S('m2use'))}
        </div>
        <div class="note">${esc(S('modelsNote'))}</div>`;
    }

    function stepper() {
      const steps = S('steps');
      return `<div class="stepper" role="tablist" aria-label="${esc(zh ? '候选筛选步骤' : 'Screening steps')}">
        ${STEPS.map(s => {
          const cur = s.n === state.step;
          const done = s.n < state.step;
          return `<button type="button" role="tab" class="stepBtn${cur ? ' cur' : ''}${done ? ' done' : ''}"
            data-step="${s.n}" aria-selected="${cur}" aria-current="${cur ? 'step' : 'false'}">
            <span class="stepNum">${s.n}</span>
            <span class="stepLabel">${esc(steps[s.n - 1])}</span>
          </button>`;
        }).join('<span class="stepSep" aria-hidden="true">›</span>')}
      </div>`;
    }

    function nextBlock() {
      const step = state.step;
      const n = {
        1: ['next1', 'next1btn', 2], 2: ['next2', 'next2btn', 3], 3: ['next3', 'next3btn', 4],
        4: ['next4', 'next4btn', 5], 5: ['next5', 'next5btn', 1],
      }[step];
      const links = {
        1: `<a class="nextLink" href="#de">${esc(S('openDe'))}</a>`,
        2: `<a class="nextLink" href="#ranking">${esc(S('openRk'))}</a>`,
        3: `<a class="nextLink" href="#network">${esc(S('openNet'))}</a>`,
        4: `<a class="nextLink" href="#validation">${esc(S('openVal'))}</a>`,
        5: '',
      }[step];
      return `<div class="panel nextPanel">
        <div class="nextT">${esc(S('nextTitle'))}</div>
        <p class="nextBody">${esc(S(n[0]))}</p>
        <div class="toolbar" style="margin:0">
          <button type="button" class="primary" id="scNext" data-go="${n[2]}">${esc(S(n[1]))}</button>
          ${links}
        </div>
      </div>`;
    }

    /* ------------------------------- step 1 ------------------------------- */
    function step1() {
      const concept = (name, termId, ex) => `
        <div class="concept">
          <div class="conceptH">${esc(name)} ${Glossary.chip(termId)}</div>
          <div class="conceptBody">${esc(ex)}</div>
        </div>`;
      return `<div class="panel stepPanel">
        <div class="stepHead"><span class="stepBig">1</span>
          <div><h2 class="stepTitle">${esc(S('s1title'))}</h2>
          <p class="stepLede">${esc(S('s1body'))}</p></div></div>
        <div class="three">
          ${concept(S('cLfc'), 'log2fc', S('cLfcEx'))}
          ${concept(S('cFdr'), 'fdr', S('cFdrEx'))}
          ${concept(S('cElig'), 'eligible', S('cEligEx'))}
        </div>
        <div class="toolbar" style="margin-top:14px">
          <a class="btnLink primary" href="#de">${esc(S('s1go'))}</a>
        </div>
      </div>`;
    }

    /* ------------------------------- step 2 ------------------------------- */
    function candidates(topK) {
      return DataService.get_rankings('STAT-DE-v1')
        .filter(x => x.g.eligP).slice(0, topK).map(x => x.g);
    }

    function step2() {
      const list = candidates(state.topK);
      return `<div class="panel stepPanel">
        <div class="stepHead"><span class="stepBig">2</span>
          <div><h2 class="stepTitle">${esc(S('s2title'))}</h2>
          <p class="stepLede">${esc(S('s2body'))}</p></div></div>

        <div class="two">
          <div class="rkExpl blue">
            <div class="rkWho">${esc(S('rk1'))}</div>
            <div class="rkQ">${esc(S('rk1q'))}</div>
            <div class="rkName mono notranslate" translate="no">${esc(S('rk1n'))}</div>
            <div class="rkChip">${Glossary.chip('statde')}</div>
          </div>
          <div class="rkExpl purple">
            <div class="rkWho">${esc(S('rk2'))}</div>
            <div class="rkQ">${esc(S('rk2q'))}</div>
            <div class="rkName mono notranslate" translate="no">${esc(S('rk2n'))}</div>
            <div class="rkChip">${Glossary.chip('rwr')}</div>
          </div>
        </div>

        <div class="toolbar" style="margin-top:14px">
          <label>${esc(S('topk'))}
            <select id="scTopK">
              ${TOPK_CHOICES.map(k => `<option value="${k}" ${state.topK === k ? 'selected' : ''}>Top ${k}</option>`).join('')}
            </select>
          </label>
          <span class="badge warnBadge">${esc(S('topkNote'))}</span>
          <span class="spacer">${list.length} ${esc(S('candidates'))}</span>
        </div>
        <div class="legend" style="margin-bottom:10px">${esc(S('topkNote2'))}</div>

        <div class="legend" style="margin-bottom:6px"><b>${esc(S('legend'))}</b> — ${esc(S('legendNote'))}</div>

        <div class="cardGrid">
          ${list.map(g => `
            <button type="button" class="geneCard" data-g="${g.i}">
              <div class="gcSym">${NT(g.symbol || g.gene_id)}</div>
              <div class="gcLfc">log2FC <b>${f(g.lp, 2)}</b> · FDR <b>${pv(g.fp)}</b></div>
              <div class="gcTags">${tagChips(g, state.topK)}</div>
            </button>`).join('')}
        </div>
        <div class="legend">${esc(S('cardHint'))}</div>
      </div>`;
    }

    /* ------------------------------- step 3 ------------------------------- */
    function step3() {
      const sel = state.sel !== null ? DataService.get_gene_detail(state.sel) : null;
      if (!sel) {
        return `<div class="panel stepPanel">
          <div class="stepHead"><span class="stepBig">3</span>
            <div><h2 class="stepTitle">${esc(S('s3title'))}</h2>
            <p class="stepLede">${esc(S('s3lead'))}</p></div></div>
          <div class="note">${esc(S('s3none'))}</div>
          <div class="toolbar"><div class="searchWrap">
            <input id="scSearch" placeholder="${esc(zh ? '搜索基因 —— 符号 / Ensembl ID / 小鼠 ID' : 'search a gene — symbol, Ensembl ID or mouse ID')}" style="min-width:300px">
          </div></div>
          ${state.sel !== null ? '' : ''}
        </div>`;
      }
      const hops = state.adv ? 2 : 1;
      const net = DataService.get_network_neighborhood(sel.i, hops);
      return `<div class="panel stepPanel">
        <div class="stepHead"><span class="stepBig">3</span>
          <div><h2 class="stepTitle">${esc(S('s3title'))}</h2>
          <p class="stepLede">${esc(S('s3lead'))}</p></div></div>

        <div class="toolbar">
          <div class="searchWrap"><input id="scSearch"
            placeholder="${esc(zh ? '搜索基因 —— 符号 / Ensembl ID / 小鼠 ID' : 'search a gene — symbol, Ensembl ID or mouse ID')}" style="min-width:260px"></div>
          <label class="advToggle"><input type="checkbox" id="scAdv" ${state.adv ? 'checked' : ''}>
            ${esc(S('s3adv'))}</label>
          <span class="spacer">${esc(S('s3advNote'))}</span>
        </div>

        <div class="netLegendBar">
          <span class="nlCentre"><i></i>${esc(S('centre'))}</span>
          <span class="nlHop1"><i></i>${esc(S('neighbours'))}</span>
          ${state.adv ? `<span class="nlHop2"><i></i>${esc(zh ? '2-hop 蛋白' : '2-hop proteins')}</span>` : ''}
        </div>
        <div id="scNet"></div>
      </div>`;
    }

    /* ------------------------------- step 4 ------------------------------- */
    function step4() {
      const sel = state.sel !== null ? DataService.get_gene_detail(state.sel) : null;
      const pool = sel ? [sel] : [];
      return `<div class="panel stepPanel">
        <div class="stepHead"><span class="stepBig">4</span>
          <div><h2 class="stepTitle">${esc(S('s4title'))}</h2>
          <p class="stepLede">${esc(S('s4lead'))}</p></div></div>
        <div class="note warn">${esc(S('s4warn'))}</div>
        ${pool.length ? `<div class="valFocus">
            <div class="vfSym">${NT(sel.symbol || sel.gene_id)}</div>
            ${validationChip(sel)}
            <div class="vfNums">log2FC <b>${f(sel.lv, 4)}</b> · FDR <b>${pv(sel.fv)}</b></div>
          </div>` : `<div class="note">${esc(S('s3none'))}</div>`}
        <div class="three" style="margin-top:12px">
          <div class="valCard v-green"><div class="vcTag">${esc(S('stPresent'))}</div>
            <div class="vcBody">${esc(S('stPresentD'))}</div></div>
          <div class="valCard v-amber"><div class="vcTag">${esc(S('stNear'))}</div>
            <div class="vcBody">${esc(S('stNearD'))}</div></div>
          <div class="valCard v-grey"><div class="vcTag">${esc(S('stMissing'))}</div>
            <div class="vcBody">${esc(S('stMissingD'))}</div></div>
        </div>
        <div class="legend">${esc(S('s4rule'))}</div>
      </div>`;
    }

    /* ------------------------------- step 5 ------------------------------- */
    function step5() {
      const rows = Shortlist.rows();
      const c = S('col');
      const body = rows.length
        ? `<div class="tableWrap" style="max-height:420px"><table>
            <thead><tr>
              <th scope="col">${esc(c.gene)}</th><th scope="col">${esc(c.lp)}</th>
              <th scope="col">${esc(c.fp)}</th><th scope="col">${esc(c.stat)}</th>
              <th scope="col">${esc(c.rwr)}</th><th scope="col">${esc(c.degree)}</th>
              <th scope="col">${esc(c.lv)}</th><th scope="col">${esc(c.fv)}</th>
              <th scope="col">${esc(c.notes)}</th><th scope="col"></th>
            </tr></thead><tbody>
            ${rows.map(g => `<tr>
              <td class="sym"><a href="#gene/${g.i}">${NT(g.symbol || g.gene_id)}</a></td>
              <td class="num">${f(g.lp, 3)}</td><td class="num">${pv(g.fp)}</td>
              <td class="num">${g.statRank ?? 'NA'}</td><td class="num">${g.rwrRank ?? 'NA'}</td>
              <td class="num">${g.degree}</td>
              <td class="num">${f(g.lv, 3)}</td><td class="num">${pv(g.fv)}</td>
              <td class="num na">—</td>
              <td><button type="button" class="slRm" data-rm="${g.i}">${esc(S('remove'))}</button></td>
            </tr>`).join('')}</tbody></table></div>`
        : `<div class="note">${esc(S('s5empty'))}</div>`;

      return `<div class="panel stepPanel">
        <div class="stepHead"><span class="stepBig">5</span>
          <div><h2 class="stepTitle">${esc(S('s5title'))}</h2>
          <p class="stepLede">${esc(S('s5lead'))}</p></div></div>
        <div class="toolbar">
          <span class="pill ${rows.length ? 'on' : 'na'}">${rows.length}</span>
          <button type="button" id="scExport" ${rows.length ? '' : 'disabled'}>${esc(S('export'))}</button>
          <button type="button" id="scClear" ${rows.length ? '' : 'disabled'}>${esc(S('clear'))}</button>
          <button type="button" id="scAddTop">${esc(S('addTop'))}</button>
        </div>
        ${body}
        <div class="legend">${esc(zh
          ? '导出的 CSV 首行会注明：这是用户自建的探索性清单，而非经过验证的治疗靶点列表。'
          : 'The exported CSV states in its header that it is a user-generated exploratory list, not a validated therapeutic-target list.')}</div>
      </div>`;
    }

    function glossaryBlock() {
      return `<div class="panel">
        <h2 class="stepTitle" style="text-transform:none;font-size:15px">${esc(S('glossTitle'))}</h2>
        <p class="lede">${esc(S('glossBody'))}</p>
        ${Glossary.table()}
      </div>`;
    }

    function stepBody() {
      return [null, step1, step2, step3, step4, step5][state.step]();
    }

    /* ------------------------------------------------------------------ wiring */
    function wire() {
      host.querySelectorAll('.stepBtn').forEach(b => {
        b.onclick = () => go(+b.dataset.step);
      });
      const nx = host.querySelector('#scNext');
      if (nx) nx.onclick = () => go(+nx.dataset.go);

      const sel = host.querySelector('#scTopK');
      if (sel) sel.onchange = e => {
        state.topK = +e.target.value;
        // K is a view range. Say so once, in the banner, and keep it out of anything
        // that could be mistaken for a result.
        state.sel = null;
        paint();
      };

      // candidate cards -> open the simplified summary first, never straight to Gene Detail
      host.querySelectorAll('.geneCard').forEach(c => {
        c.onclick = () => {
          state.sel = +c.dataset.g;
          openCard(+c.dataset.g);
        };
      });

      const srch = host.querySelector('#scSearch');
      if (srch) {
        const bind = (window.Pages && Pages.bindSearch) ? Pages.bindSearch : null;
        if (bind) bind(srch, g => { state.sel = g.i; paint(); });
        else srch.onchange = () => {
          const hit = DataService.search_genes(srch.value, 1)[0];
          if (hit) { state.sel = hit.i; paint(); }
        };
      }
      const adv = host.querySelector('#scAdv');
      if (adv) adv.onchange = e => { state.adv = e.target.checked; paint(); };

      const ex = host.querySelector('#scExport');
      if (ex) ex.onclick = () => {
        Shortlist.download();
        const l = host.querySelector('#scExportNote');
        if (l) l.textContent = S('exported');
      };
      const cl = host.querySelector('#scClear');
      if (cl) cl.onclick = () => { Shortlist.clear(); paint(); };
      const at = host.querySelector('#scAddTop');
      if (at) at.onclick = () => { candidates(state.topK).forEach(g => Shortlist.add(g.i)); paint(); };
      host.querySelectorAll('[data-rm]').forEach(b => {
        b.onclick = () => { Shortlist.remove(+b.dataset.rm); paint(); };
      });

      if (state.step === 3) paintNetwork();
    }

    function paintNetwork() {
      const box = host.querySelector('#scNet');
      if (!box || state.sel === null) return;
      const sel = DataService.get_gene_detail(state.sel);
      const hops = state.adv ? 2 : 1;
      const net = DataService.get_network_neighborhood(sel.i, hops);

      if (net.isolated) {
        box.innerHTML = `<div class="note warn">
          <b>${NT(sel.symbol || sel.gene_id)}</b> — ${esc(zh
            ? '这个基因仍可能有很强的表达证据，但当前 STRING physical network 没有为它提供传播支持。'
            : 'this gene may still have strong expression evidence, but the current STRING physical '
              + 'network gives it no propagated support.')}</div>`;
        return;
      }
      if (net.overBudget && !state.forceLarge) {
        box.innerHTML = `<div class="note warn">
          <b>${esc(zh ? '该邻域较大：' : 'This neighbourhood is large: ')}
          ${net.size.nodes.toLocaleString()} ${esc(zh ? '个节点 /' : 'nodes /')}
          ${net.size.edges.toLocaleString()} ${esc(zh ? '条边。' : 'edges.')}</b>
          ${esc(zh ? '这些计数是精确值，未做任何筛选。是否继续绘制由你决定。'
                    : 'Those counts are exact and nothing has been filtered. Drawing it is your call.')}
          <div class="toolbar" style="margin-top:10px">
            <button type="button" class="primary" id="scDraw">${esc(zh ? '以渲染上限绘制' : 'Draw with rendering limit')}</button>
            <button type="button" id="scAdvOff">${esc(zh ? '关闭高级视图' : 'Turn off advanced view')}</button>
          </div></div>`;
        box.querySelector('#scDraw').onclick = () => { state.forceLarge = true; paint(); };
        box.querySelector('#scAdvOff').onclick = () => {
          state.adv = false; state.forceLarge = false; paint();
        };
        return;
      }
      box.innerHTML = `<div class="grid cards" style="margin-bottom:10px">
          <div class="card"><div class="k">${esc(zh ? '显示节点' : 'Nodes shown')}</div>
            <div class="v">${net.nodes.length.toLocaleString()}</div>
            <div class="n">${hops}-hop</div></div>
          <div class="card"><div class="k">${esc(zh ? '显示边' : 'Edges shown')}</div>
            <div class="v">${net.edges.length.toLocaleString()}</div>
            <div class="n">${net.truncated ? (zh ? `共 ${net.size.edges.toLocaleString()} 条` : `of ${net.size.edges.toLocaleString()} induced`) : ''}</div></div>
          <div class="card"><div class="k">${esc(zh ? '度' : 'Degree')}</div>
            <div class="v">${sel.degree}</div><div class="n">${esc(zh ? '冻结图' : 'frozen graph')}</div></div>
          <div class="card"><div class="k">log2FC</div>
            <div class="v">${f(sel.lp, 3)}</div><div class="n">MPTP</div></div>
        </div>
        ${net.truncated ? `<div class="note">${esc(zh
          ? `已应用渲染上限：显示 ${net.edges.length.toLocaleString()} 条边中的最高权重部分。所有节点均已绘制。这是显示限制，不是科学筛选。`
          : `Rendering limit applied: showing the ${net.edges.length.toLocaleString()} highest-weight of ${net.size.edges.toLocaleString()} induced edges. All nodes are drawn. This is a display limit, not a scientific filter.`)}</div>` : ''}
        <div id="scNetSvg"></div>
        <div class="legend">${esc(zh ? '点击任意节点重新居中。节点大小 ∝ √degree · 边宽 ∝ weight。'
                                     : 'Click any node to re-centre. Node size ∝ √degree · edge width ∝ weight.')}</div>`;
      Charts.network(box.querySelector('#scNetSvg'), net, { onSelect: i => { state.sel = i; paint(); } });
    }

    /* ---------------------------------------------------------- candidate card */
    function openCard(i) {
      const g = DataService.get_gene_detail(i);
      if (!g) return;
      closeCard();
      const wrap = document.createElement('div');
      wrap.className = 'ccWrap';
      wrap.innerHTML = candidateCard(g, { topK: state.topK });
      document.body.appendChild(wrap);
      const close = () => closeCard();
      wrap.querySelector('.ccClose').onclick = close;
      wrap.addEventListener('click', e => { if (e.target === wrap) close(); });
      const onEsc = e => { if (e.key === 'Escape') { close(); } };
      document.addEventListener('keydown', onEsc);
      wrap.__onEsc = onEsc;
      wrap.querySelector('.ccOpen').onclick = () => { close(); location.hash = '#gene/' + i; };
      const nb = wrap.querySelector('.ccNet');
      if (nb) nb.onclick = () => { close(); state.step = 3; state.sel = i; location.hash = '#screening/3'; };
      wrap.querySelector('.ccVal').onclick = () => {
        close(); location.hash = '#validation/' + i;
      };
      Shortlist.bind(wrap);
      const f1 = wrap.querySelector('.ccClose');
      if (f1) f1.focus();
    }
    function closeCard() {
      const w = document.querySelector('.ccWrap');
      if (!w) return;
      if (w.__onEsc) document.removeEventListener('keydown', w.__onEsc);
      w.remove();
    }

    paint();
    return { get step() { return state.step; }, closeCard };
  }

  return { render, candidateCard, tagChips, validationChip, whyList, STEPS, TOPK_CHOICES, SC };
})();
