/* XunZi-PD — glossary and inline term help.
 *
 * Every specialist term the app uses has exactly one definition here, so the wording
 * cannot drift between pages. A term is rendered as
 *
 *     STRING network 蛋白互作网络  [?]
 *
 * and the [?] opens 1-3 sentences. The Chinese name is shown in both languages: the
 * point of this module is that a reader meeting the term for the first time can see
 * what it means without leaving the page.
 *
 * Definitions describe the concept, never a result. No term here asserts that any gene
 * is a target, a cause, or validated.
 */
const Glossary = (() => {
  const TERMS = {
    gene: {
      en: 'Gene', zh: '基因',
      body_en: 'A stretch of DNA that carries the instructions for building one product, ' +
        'usually a protein. In this app a "gene" is a row in the analysis table, ' +
        'identified by its Ensembl gene ID — the gene symbol is display-only and never a join key.',
      body_zh: '一段携带“制造某一种产物（通常是蛋白质）”指令的 DNA。在本应用中，一个“基因”是分析表中的一行，' +
        '以 Ensembl gene ID 标识 —— 基因符号仅用于显示，从不作为关联键。',
    },
    protein: {
      en: 'Protein', zh: '蛋白质',
      body_en: 'The molecule a gene is translated into. Proteins do the work in the cell, and ' +
        'they rarely act alone — they bind and regulate each other. That mutual binding is ' +
        'what the network in this app describes.',
      body_zh: '基因被翻译后产生的分子。细胞内的实际工作由蛋白质完成，而它们很少单独行动 —— 彼此结合与调控。' +
        '本应用中的网络描述的正是这种相互作用。',
    },
    rnaseq: {
      en: 'RNA-seq', zh: 'RNA 测序',
      body_en: 'A method that reads out how much RNA each gene is producing in a sample. ' +
        'It measures transcript abundance, which is used here as a proxy for how active ' +
        'each gene is.',
      body_zh: '一种测定样本中每个基因产生多少 RNA 的方法。它测量转录本丰度，本应用用它作为基因活跃程度的代理指标。',
    },
    de: {
      en: 'Differential expression', zh: '差异表达',
      body_en: 'A comparison of how much each gene is expressed between two groups — here, a ' +
        'disease model and its control. A gene is "differentially expressed" when that ' +
        'difference is larger than the noise in the data suggests it should be.',
      body_zh: '比较两组之间每个基因的表达量差异 —— 在本应用中是疾病模型与其对照。当差异大于数据噪声所能解释的程度时，' +
        '称该基因“差异表达”。',
    },
    log2fc: {
      en: 'log2FC (log2 fold change)', zh: 'log2 倍数变化',
      body_en: 'How large the change is, on a doubling scale. log2FC +1 means about twice the ' +
        'control level; log2FC −1 means about half; 0 means no measurable change. Because it is ' +
        'log2, the scale is symmetric: +2 and −2 are the same size of change in opposite directions.',
      body_zh: '变化有多大，以 2 为底的倍数尺。log2FC +1 表示约为对照的 2 倍；−1 约为 1/2；0 表示没有可测变化。' +
        '由于是 log2 尺度，它是对称的：+2 与 −2 是方向相反、幅度相同的改变。',
    },
    fdr: {
      en: 'FDR (false discovery rate)', zh: 'FDR（错误发现率）',
      body_en: 'How strong the statistical evidence is, after correcting for testing thousands of ' +
        'genes at once. Smaller is stronger: FDR 0.01 means roughly 1 in 100 of the genes called ' +
        'at that level would be expected to be a false call. It is not a measure of how large the change is.',
      body_zh: '在同时检验数千个基因并做多重检验校正之后，统计证据有多强。数值越小证据越强：FDR 0.01 意味着在该水平上' +
        '被判定为阳性的基因中，大约每 100 个里预期有 1 个是误判。它不衡量变化幅度的大小。',
    },
    eligible: {
      en: 'Eligible (analysis eligible)', zh: '可分析（进入正式分析）',
      body_en: 'Whether a gene passed the pre-declared expression filter (a CPM threshold applied ' +
        'per cohort) and therefore takes part in the formal analysis. A gene that fails keeps its ' +
        'row with NA statistics — it is never deleted, and its position in the table never changes.',
      body_zh: '该基因是否通过了预先声明的表达量过滤（按队列分别施加的 CPM 阈值），从而进入正式分析。' +
        '未通过的基因仍保留在表中、统计量为 NA —— 从不删除，表格位置也不会改变。',
    },
    string: {
      en: 'STRING network', zh: '蛋白互作网络',
      body_en: 'A public database of known and predicted interactions between proteins. This app ' +
        'uses the physical interaction subset at a combined score of at least 700. It describes ' +
        'which proteins are known to touch each other — not which genes are similar.',
      body_zh: '一个收录已知与预测的蛋白质之间相互作用的公共数据库。本应用使用其中物理相互作用的部分，' +
        'combined score 阈值不低于 700。它描述的是哪些蛋白质已知会相互接触，而不是哪些基因相似。',
    },
    ppi: {
      en: 'PPI (protein–protein interaction)', zh: '蛋白互作',
      body_en: 'A physical contact between two proteins. One PPI is one edge in this app\'s network. ' +
        'A PPI says the two proteins interact — it does not say what the interaction does, nor ' +
        'whether it matters in disease.',
      body_zh: '两个蛋白质之间的物理接触。一条 PPI 就是本应用网络中的一条边。PPI 只说明两者存在相互作用，' +
        '并不说明该作用的功能，也不说明它是否与疾病相关。',
    },
    node: {
      en: 'Node', zh: '节点',
      body_en: 'One point in the network. Here every node is one gene, and the protein it encodes ' +
        'is the thing that actually interacts. The 15,688-node universe is fixed before any ' +
        'expression statistic is computed and never changes.',
      body_zh: '网络中的一个点。在本应用中每个节点对应一个基因，而真正发生相互作用的是它编码的蛋白质。' +
        '15,688 个节点的全集在任何表达统计量计算之前就已固定，且永不改变。',
    },
    edge: {
      en: 'Edge', zh: '边',
      body_en: 'A connection between two nodes — one recorded protein–protein interaction. Edge ' +
        'weight is the STRING combined score divided by 1000, so a heavier line means stronger ' +
        'evidence for that interaction.',
      body_zh: '两个节点之间的连接 —— 即一条被记录的蛋白互作。边权为 STRING combined score 除以 1000，' +
        '线越粗表示该相互作用的证据越强。',
    },
    degree: {
      en: 'Degree', zh: '度',
      body_en: 'How many interaction partners a node has. Degree 0 means the gene\'s protein has no ' +
        'retained interaction in this frozen network — it is "isolated". Isolated nodes are kept, ' +
        'never removed.',
      body_zh: '一个节点有多少个互作伙伴。degree 0 表示该基因对应的蛋白质在这个冻结网络中没有保留任何相互作用 —— ' +
        '即“孤立”。孤立节点会被保留，从不删除。',
    },
    statde: {
      en: 'STAT-DE-v1', zh: '仅基于表达量的排名',
      body_en: 'The expression-only baseline: it ranks genes by how large the change is multiplied ' +
        'by how strong the evidence is. It knows nothing about the network. Thousands of genes can ' +
        'share similar expression evidence, so on its own it cannot tell you which gene matters.',
      body_zh: '仅基于表达量的基线方法：用变化幅度乘以证据强度来排序基因。它完全不考虑网络。' +
        '成千上万个基因可能具有相似的表达证据，因此单靠它无法判断哪个基因更重要。',
    },
    rwr: {
      en: 'STRING-RWR-v1', zh: '网络传播排名',
      body_en: 'The network-aware baseline. It starts from the expression-only scores and lets them ' +
        'spread along the interaction network, so a gene can gain priority from the company it ' +
        'keeps. Ranking higher here means the network context supports it — not that it is validated.',
      body_zh: '考虑网络背景的基线方法。它从仅基于表达量的分数出发，让分数沿互作网络扩散，' +
        '因此一个基因可以从它的“邻居”那里获得优先级。在这里排名更高，说明网络背景支持它 —— 并不代表已被验证。',
    },
    primary: {
      en: 'Primary cohort', zh: '主队列（发现模型）',
      body_en: 'The MPTP vs Saline experiment (4 vs 4). This is the discovery model: every ranking ' +
        'in this app is computed from it alone. The pipeline is fixed — MPTP is always the ' +
        'discovery model and PFF is always the validation model; they cannot be swapped.',
      body_zh: 'MPTP vs Saline 实验（4 对 4）。这是发现模型：本应用中所有排名都只由它计算得出。' +
        '流程是固定的 —— MPTP 始终是发现模型，PFF 始终是验证模型，二者不可互换。',
    },
    validation: {
      en: 'Validation cohort', zh: '验证队列（验证模型）',
      body_en: 'The PFF vs PBS experiment (5 vs 5) — a mechanistically different Parkinson\'s ' +
        'disease model. It is used only to check whether a signal found in the discovery model is ' +
        'still measurable here. It never influences eligibility, graph membership or any ranking.',
      body_zh: 'PFF vs PBS 实验（5 对 5）—— 一种机制不同的帕金森病模型。它仅用于检查在发现模型中得到的信号' +
        '在此是否仍可测量。它从不影响可分析性、图成员资格或任何排名。',
    },
    bootstrap: {
      en: 'Bootstrap', zh: '自助重采样',
      body_en: 'A resampling check: the data is redrawn with replacement many times to see how much ' +
        'the ranking would move if the samples had come out slightly differently. It is a ' +
        'sensitivity analysis, never a way to pick a model, and no threshold is derived from it.',
      body_zh: '一种重采样检验：有放回地反复重抽数据，观察如果样本略有不同，排名会变动多少。' +
        '它属于敏感性分析，绝不用于挑选模型，也不据此产生任何阈值。',
    },
    ortholog: {
      en: 'Ortholog', zh: '直系同源基因',
      body_en: 'The corresponding gene in another species. The data here is human, while the ' +
        'experiment was in mouse, so each human gene is mapped one-to-one to its mouse ' +
        'counterpart before any analysis.',
      body_zh: '另一物种中对应的基因。本应用的数据是人类基因，而实验在小鼠中进行，' +
        '因此在分析前先将每个人类基因一对一映射到其小鼠对应基因。',
    },
  };

  const has = (id) => Object.prototype.hasOwnProperty.call(TERMS, id);
  const get = (id) => TERMS[id] || null;

  /** Localised full name, "STRING network 蛋白互作网络". */
  function name(id) {
    const t = get(id);
    return t ? `${t.en} ${t.zh}` : id;
  }
  /** Localised short label for inline use. */
  function label(id) {
    const t = get(id);
    if (!t) return id;
    return I18N.getLang() === 'zh' ? t.zh : t.en;
  }
  const body = (id) => {
    const t = get(id);
    if (!t) return '';
    return I18N.getLang() === 'zh' ? t.body_zh : t.body_en;
  };

  /**
   * Inline term chip: the term with a [?] affordance.
   * Rendered as a <button> so it is keyboard reachable and announced as a control.
   */
  function chip(id, { showName = false } = {}) {
    if (!has(id)) return '';
    const t = get(id);
    const text = showName ? name(id) : label(id);
    return `<button type="button" class="gloss" data-gloss="${id}"`
      + ` aria-label="${esc(name(id))} — definition">${esc(text)}`
      + `<span class="glossMark" aria-hidden="true">?</span></button>`;
  }

  const esc = s => String(s ?? '').replace(/[&<>"]/g,
    c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  /* ---------- popover ---------- */
  let POP = null;
  function pop() {
    if (POP) return POP;
    POP = document.createElement('div');
    POP.className = 'glossPop';
    POP.setAttribute('role', 'dialog');
    POP.setAttribute('aria-label', 'Term definition');
    POP.hidden = true;
    POP.innerHTML = '<div class="gpHead"><span class="gpName"></span>'
      + '<button type="button" class="gpClose" aria-label="Close definition">×</button></div>'
      + '<div class="gpBody"></div>';
    POP.querySelector('.gpClose').onclick = close;
    document.body.appendChild(POP);
    document.addEventListener('click', e => {
      if (!POP.hidden && !POP.contains(e.target) && !e.target.closest('[data-gloss]')) close();
    });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    window.addEventListener('resize', close);
    return POP;
  }

  function close() { if (POP) POP.hidden = true; }

  function open(btn) {
    const id = btn.dataset.gloss;
    const p = pop();
    p.querySelector('.gpName').textContent = name(id);
    p.querySelector('.gpBody').textContent = body(id);
    p.hidden = false;
    const r = btn.getBoundingClientRect();
    // Clamp to the viewport so a chip near an edge cannot push the panel off-screen.
    const w = Math.min(340, window.innerWidth - 24);
    p.style.width = w + 'px';
    p.style.left = Math.max(12, Math.min(r.left, window.innerWidth - w - 12)) + 'px';
    const below = r.bottom + 8;
    p.style.top = (below + p.offsetHeight > window.innerHeight - 12
      ? Math.max(12, r.top - p.offsetHeight - 8) : below) + 'px';
  }

  let bound = false;
  /** Wire every [data-gloss] chip inside `root`. Safe to call repeatedly. */
  function bind(root) {
    const scope = root || document;
    scope.querySelectorAll('[data-gloss]').forEach(btn => {
      if (btn.__glossBound) return;
      btn.__glossBound = true;
      btn.addEventListener('click', e => { e.preventDefault(); e.stopPropagation(); open(btn); });
      btn.addEventListener('mouseenter', () => open(btn));
      btn.addEventListener('focus', () => open(btn));
      btn.addEventListener('blur', close);
    });
    bound = true;
  }
  // Delegated fallback: pages re-render constantly, and a chip inside freshly inserted
  // HTML would otherwise be dead until bind() ran again.
  document.addEventListener('mouseover', e => {
    const b = e.target.closest && e.target.closest('[data-gloss]');
    if (b) open(b);
  });
  document.addEventListener('focusin', e => {
    const b = e.target.closest && e.target.closest('[data-gloss]');
    if (b) open(b);
  });

  /** Full glossary table, for the reference section on the Guided Screening page. */
  function table() {
    const zh = I18N.getLang() === 'zh';
    return `<div class="glossTable">${Object.keys(TERMS).map(id => {
      const t = TERMS[id];
      return `<div class="glossRow">
        <div class="gt">${esc(t.en)}<span class="gtzh">${esc(t.zh)}</span></div>
        <div class="gb">${esc(zh ? t.body_zh : t.body_en)}</div></div>`;
    }).join('')}</div>`;
  }

  return { TERMS, has, get, name, label, body, chip, bind, table, close, isBound: () => bound };
})();
