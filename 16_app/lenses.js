/* XunZi-PD — Candidate Discovery lenses (v1.8).
 *
 * Five ways to look at the SAME frozen result. A lens is a view: it reads existing
 * fields, sorts and filters them, and explains them. It computes no score, applies no
 * biological threshold, and changes nothing about the analysis.
 *
 * The two rules that matter most here:
 *
 *   1. NO DENSE RE-RANK. Ordering always uses the authoritative `reported_rank` values
 *      exactly as the baselines wrote them. A gene whose reported_rank is NA stays NA;
 *      it is never renumbered to fill a gap. The network-promoted lens sorts on the
 *      indicative Δrank, which is a difference of two reported ranks — never a new score.
 *
 *   2. A LENS NEVER PROMOTES. Filtering to genes with PD reference evidence does not
 *      move those genes up any ranking; it only decides what is listed. A test asserts
 *      the authoritative ranks are untouched after every lens is exercised.
 */
const Lenses = (() => {
  const TOPK_CHOICES = [20, 50, 100];

  /* Every lens declares: how to select, how to order, and how to explain itself.
   * `order` returns a comparator over gene records; `keep` filters. Both read frozen
   * fields only. */
  const DEFS = {
    expression: {
      label: { en: 'Expression change first', zh: '表达变化优先' },
      blurb: { en: 'Start with the genes whose own expression change stands out most.',
               zh: '从表达变化最值得关注的基因开始。' },
      secondary: { en: 'Browsed by STAT-DE authoritative rank.',
                   zh: '按 STAT-DE 的权威排名（authoritative rank）浏览。' },
      keep: g => g.eligP && g.statRank !== null,
      order: (a, b) => a.g.statRank - b.g.statRank,
      topK: true,
      why: (g, ctx) => ({
        en: `It sits at position ${g.statRank} of the expression-only ranking, inside the top ${ctx.topK} you are browsing.`,
        zh: `它在仅基于表达量的排名中位于第 ${g.statRank} 位，在你当前浏览的 top ${ctx.topK} 之内。`,
      }),
    },

    promoted: {
      label: { en: 'Moved up once the network was added', zh: '加入网络后相对排名提高' },
      blurb: { en: 'See which genes move up once the protein network is taken into account. '
                 + 'This is an exploratory comparison — it is not a new scientific score.',
               zh: '看哪些基因在加入蛋白网络后相对排名提高。'
                 + '这是探索性比较，不是新的科学评分。' },
      secondary: { en: 'Ordered by indicative Δrank — the difference between two reported '
                     + 'ranks, not a score computed here.',
                   zh: '按 indicative Δrank 排序 —— 两个报告排名之差，不是此处计算的评分。' },
      keep: g => g.statRank !== null && g.rwrRank !== null
                 && (g.statRank - g.rwrRank) > 0,
      // Indicative Δrank descending. This is a difference of two authoritative reported
      // ranks, NOT a score computed here.
      order: (a, b) => (b.g.statRank - b.g.rwrRank) - (a.g.statRank - a.g.rwrRank),
      why: (g) => ({
        en: `Its indicative relative position improved after network propagation (Δrank +${g.statRank - g.rwrRank}).`,
        zh: `加入网络传播后它的相对位置提高（Δrank +${g.statRank - g.rwrRank}）。`,
      }),
    },

    network: {
      // This lens selects on degree > 0 — the presence of recorded interactions. That is
      // not a claim that the network "supports" the gene, so neither label says so.
      label: { en: 'Has protein-network information', zh: '有蛋白互作网络信息' },
      blurb: { en: 'Start from candidates whose protein has recorded interactions in the fixed network.',
               zh: '从对应蛋白在固定网络中有互作记录的候选开始。' },
      secondary: { en: 'Candidates with at least one recorded interaction, by STRING-RWR '
                     + 'authoritative rank.',
                   zh: '至少有一条已记录互作的候选，按 STRING-RWR 的权威排名排序。' },
      keep: g => g.degree > 0,
      // RWR reported rank ascending. Genes with no reported rank sort last and keep NA.
      order: (a, b) => {
        const x = a.g.rwrRank, y = b.g.rwrRank;
        if (x === null && y === null) return a.g.i - b.g.i;
        if (x === null) return 1;
        if (y === null) return -1;
        return x - y;
      },
      why: (g) => ({
        en: `Its protein has ${g.degree} recorded interaction partner${g.degree === 1 ? '' : 's'} in the fixed STRING network.`,
        zh: `它对应的蛋白在固定的 STRING 网络中有 ${g.degree} 个已记录的互作蛋白。`,
      }),
    },

    pd: {
      label: { en: 'Already mentioned in PD research', zh: '已有 PD 外部证据' },
      blurb: { en: 'See the candidates that existing Parkinson\'s disease genetics already reports.',
               zh: '看已有帕金森病遗传学研究涉及的候选。' },
      secondary: { en: 'PD reference evidence present — GWAS Catalog, MONDO_0005180.',
                   zh: '存在 PD 参考证据 —— GWAS Catalog，MONDO_0005180。' },
      keep: g => (PdEvidence.forGene(g.gene_id) || {}).gwas_associations > 0,
      order: null,          // set by the user: STAT rank or RWR rank
      orderChoices: ['statRank', 'rwrRank'],
      defaultOrder: 'statRank',
      why: (g) => ({
        en: `The loaded PD reference layer contains ${PdEvidence.forGene(g.gene_id).gwas_associations} GWAS association(s) for this gene.`,
        zh: `当前加载的 PD 参考层中，该基因有 ${PdEvidence.forGene(g.gene_id).gwas_associations} 条 GWAS 关联。`,
      }),
    },

    both_models: {
      label: { en: 'Both PD models', zh: '两个模型都值得查看' },
      blurb: { en: 'Look at how candidates behave in the discovery and the validation model.',
               zh: '查看两个 PD 模型中的表现。' },
      secondary: { en: 'Primary eligible and validation eligible.',
                   zh: '主队列可分析，且验证队列可分析。' },
      keep: g => g.eligP && g.eligV,
      order: (a, b) => a.g.statRank - b.g.statRank,
      subviews: ['all', 'near_zero', 'non_near_zero'],
      why: (g) => {
        const vs = DataService.validation_state(g);
        return {
          en: `It is analysable in both models, and in the validation model it shows a ${vs.id === 'near_zero' ? 'near-zero' : 'non-near-zero'} change.`,
          zh: `它在两个模型中都可分析；在验证模型中呈现${vs.id === 'near_zero' ? '近零' : '非近零'}变化。`,
        };
      },
    },
  };

  const ORDER = ['expression', 'promoted', 'network', 'pd', 'both_models'];
  const has = id => Object.prototype.hasOwnProperty.call(DEFS, id);
  const get = id => DEFS[id] || null;

  /**
   * Build the list for one lens. Returns the whole filtered, ordered set — the caller
   * decides how many to render, so "showing 20 of 12,577" stays honest.
   */
  function list(id, opts = {}) {
    const def = get(id);
    if (!def) return null;
    const all = DataService.ready().byIdx.filter(Boolean).map(g => ({ g }));
    let kept = all.filter(x => def.keep(x.g));

    if (id === 'expression' && opts.topK) {
      // top-K is a browsing range over the authoritative order, not a threshold
      kept = kept.sort((a, b) => a.g.statRank - b.g.statRank).slice(0, opts.topK);
    }

    if (id === 'both_models' && opts.subview && opts.subview !== 'all') {
      kept = kept.filter(x => DataService.validation_state(x.g).id === opts.subview);
    }

    if (def.order) {
      kept = kept.slice().sort(def.order);
    } else if (def.orderChoices) {
      const key = def.orderChoices.includes(opts.order) ? opts.order : def.defaultOrder;
      kept = kept.slice().sort((a, b) => {
        const x = a.g[key], y = b.g[key];
        if (x === null && y === null) return a.g.i - b.g.i;
        if (x === null) return 1;          // NA stays NA and sorts last, never renumbered
        if (y === null) return -1;
        return x - y;
      });
    }
    return { def, rows: kept, id };
  }

  /** The funnel: three frozen counts and the current browsing count. */
  function funnel(showing) {
    const all = DataService.ready().byIdx.filter(Boolean);
    const eligible = all.filter(g => g.eligP).length;
    const ranked = all.filter(g => g.statRank !== null).length;
    return [
      { n: all.length, key: 'universe', frozen: true },
      { n: eligible, key: 'eligible', frozen: true },
      { n: ranked, key: 'ranked', frozen: true },
      { n: showing, key: 'browsing', frozen: false },
    ];
  }

  /** Cautions a lens should surface for one gene. Each is a read of a frozen field. */
  function cautions(g) {
    const out = [];
    if (g.degree === 0) out.push('isolated');
    const vs = DataService.validation_state(g);
    if (vs.id === 'near_zero') out.push('val_near_zero');
    if (vs.id === 'not_comparable') out.push('val_missing');
    if (g.fv !== null && g.fv >= DataService.FDR_DISPLAY) out.push('val_fdr_weak');
    if (g.rwrRank === null) out.push('rwr_na');
    const pd = (typeof PdEvidence !== 'undefined' && PdEvidence.ready())
      ? PdEvidence.forGene(g.gene_id) : null;
    if (!pd || pd.gwas_associations === 0) out.push('no_pd_evidence');
    const mem = (typeof Pathways !== 'undefined' && Pathways.ready())
      ? Pathways.forGene(g.gene_id) : null;
    if (!mem || (!mem.reactome.length && !mem.gobp.length)) out.push('no_pathway');
    return out;
  }

  return { DEFS, ORDER, has, get, list, funnel, cautions, TOPK_CHOICES };
})();
