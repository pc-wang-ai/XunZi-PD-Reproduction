/* XunZi-PD — unified data service layer.
 *
 * This is the ONLY module that reads files. Pages call the functions below and never
 * touch CSV directly.
 *
 * Read scope: outputs/app_data/ only. No raw FASTQ/BAM, no pipeline re-run.
 */
const DataService = (() => {
  const BASE = '../outputs/app_data/';
  const FILES = {
    geneTable:   'app_gene_table.csv',
    geneDetail:  'app_gene_detail.csv',
    dePrimary:   'app_DE_results_primary.csv',
    deValidation:'app_DE_results_validation.csv',
    rankings:    'app_rankings.csv',
    nodes:       'app_network_nodes.csv',
    edges:       'app_network_edges.csv',
    provenance:  'app_provenance_summary.json',
    robustness:  'app_robustness.json',
    baselineCmp: 'app_baseline_comparison.json',
  };

  /* Column contracts. Every file the app reads declares the columns it must have and the
   * kind of each numeric column, so a renamed or re-typed column fails at load instead of
   * surfacing later as a silently empty chart. */
  const NUMERIC = {
    geneTable:  ['node_index', 'graph_degree'],
    geneDetail: ['node_index', 'graph_degree', 'baseMean_primary', 'lfc_shrunk_primary',
                 'pvalue_primary', 'padj_primary', 'baseMean_validation',
                 'lfc_shrunk_validation', 'pvalue_validation', 'padj_validation',
                 'stat_de_v1_score', 'stat_de_v1_rank',
                 'string_rwr_v1_score', 'string_rwr_v1_rank'],
    rankings:   ['node_index', 'rank', 'score'],
    nodes:      ['node_index'],
    edges:      ['source_node_index', 'target_node_index', 'weight'],
  };

  // ---------- CSV ----------
  /**
   * Strict RFC4180-ish reader. Malformed input is a hard error, never a silent drop.
   *
   * The previous version ended with `rows.filter(r => r.length === head.length)`, which
   * quietly deleted every ragged row: a truncated export or an unexpected embedded
   * newline would shrink the universe and every count downstream would still look like
   * a clean number. We would rather refuse to start than show a wrong 15,688.
   */
  function parseCSV(text, label = 'CSV') {
    const bad = (msg) => { throw new Error(`${label}: ${msg}`); };
    if (typeof text !== 'string') bad('not text');
    const rows = [];
    let row = [], cell = '', q = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (q) {
        if (c === '"') { if (text[i + 1] === '"') { cell += '"'; i++; } else q = false; }
        else cell += c;
      } else if (c === '"') q = true;
      else if (c === ',') { row.push(cell); cell = ''; }
      else if (c === '\n') { row.push(cell); rows.push(row); row = []; cell = ''; }
      else if (c !== '\r') cell += c;
    }
    if (q) bad('unterminated quoted field');
    if (cell.length || row.length) { row.push(cell); rows.push(row); }
    while (rows.length && rows[rows.length - 1].length === 1 && rows[rows.length - 1][0] === '') {
      rows.pop();                                   // trailing newline, not a row
    }
    if (!rows.length) bad('no rows (file is empty)');

    const head = rows[0];
    if (!head.length || head.every(h => h === '')) bad('missing header row');
    const seen = new Set();
    head.forEach((h) => {
      if (seen.has(h)) bad(`duplicate column name "${h}"`);
      seen.add(h);
    });

    const body = rows.slice(1);
    // Every table this app reads is required data; a header-only file is a failed
    // export, not an empty result set.
    if (!body.length) bad('header present but no data rows');

    return body.map((r, i) => {
      if (r.length !== head.length) {
        bad(`row ${i + 2} has ${r.length} columns, header declares ${head.length}`);
      }
      const o = {};
      head.forEach((h, k) => { o[h] = r[k]; });
      return o;
    });
  }

  async function get(name) {
    const res = await fetch(BASE + FILES[name], { cache: 'no-store' });
    if (!res.ok) throw new Error(`cannot read ${FILES[name]} (HTTP ${res.status})`);
    // Dispatch on the declared file type, never on a hardcoded name. A JSON asset
    // routed through the CSV parser silently yields an array of junk rows instead of
    // an object, and the failure then surfaces much later as a confusing
    // "cannot read properties of undefined" at the consumption site.
    return FILES[name].endsWith('.json') ? res.json() : parseCSV(await res.text(), FILES[name]);
  }

  // ---------- state ----------
  let S = null;

  // An explicit NA token means "no value" and becomes null. Anything else that is not a
  // finite number is a schema violation: `Number("n/a")` is NaN and NaN propagates into
  // every comparison as false, so a broken cell used to look like a gene that simply
  // never matched a filter. Throw instead.
  const NA_TOKEN = new Set(['', 'NA', 'N/A', 'NaN', 'nan', 'null', 'NULL', 'None']);
  function num(v, field) {
    if (v === undefined || v === null || NA_TOKEN.has(String(v))) return null;
    const x = Number(v);
    if (!Number.isFinite(x)) {
      throw new Error(`non-numeric value ${JSON.stringify(String(v))} in field ${field || '?'}`);
    }
    return x;
  }
  const bool = (v, field) => {
    const s = String(v).toUpperCase();
    if (s === 'TRUE') return true;
    if (s === 'FALSE') return false;
    throw new Error(`non-boolean value ${JSON.stringify(String(v))} in field ${field || '?'}`);
  };

  /** Verify a declared column contract before any value is read. */
  function checkColumns(rows, file, required) {
    if (!rows.length) throw new Error(`${file}: no data rows`);
    const have = new Set(Object.keys(rows[0]));
    const missing = required.filter(c => !have.has(c));
    if (missing.length) {
      throw new Error(`${file}: missing column(s) ${missing.join(', ')} `
        + `(file declares ${[...have].join(', ')})`);
    }
  }

  async function init() {
    const loaded = {};
    for (const name of Object.keys(FILES)) loaded[name] = await get(name);
    const { geneTable, geneDetail, deP, deV, rankings, nodes, edges, provenance,
            robustness, baselineCmp } = loaded;

    checkColumns(geneDetail, FILES.geneDetail, NUMERIC.geneDetail);
    checkColumns(rankings, FILES.rankings, NUMERIC.rankings);
    checkColumns(nodes, FILES.nodes, NUMERIC.nodes);
    checkColumns(edges, FILES.edges, NUMERIC.edges);

    const byIdx = [], byGene = new Map();
    geneDetail.forEach((g, rowNo) => {
      const i = num(g.node_index, `node_index@${rowNo}`);
      if (i === null || !Number.isInteger(i) || i < 0) {
        throw new Error(`${FILES.geneDetail}: invalid node_index ${JSON.stringify(g.node_index)}`);
      }
      if (byIdx[i]) throw new Error(`${FILES.geneDetail}: duplicate node_index ${i}`);
      const F = (c) => `${c} @node_index=${i}`;
      const rec = {
        i, gene_id: g.gene_id, symbol: g.gene_symbol, mouse: g.mouse_gene_id,
        cpmP: bool(g.CPM_pass_primary, F('CPM_pass_primary')),
        cpmV: bool(g.CPM_pass_validation, F('CPM_pass_validation')),
        eligP: bool(g.analysis_eligible_primary, F('analysis_eligible_primary')),
        eligV: bool(g.analysis_eligible_validation, F('analysis_eligible_validation')),
        statScore: num(g.stat_de_v1_score, F('stat_de_v1_score')),
        statRank: num(g.stat_de_v1_rank, F('stat_de_v1_rank')),
        rwrScore: num(g.string_rwr_v1_score, F('string_rwr_v1_score')),
        rwrRank: num(g.string_rwr_v1_rank, F('string_rwr_v1_rank')),
        degree: num(g.graph_degree, F('graph_degree')),
      };
      // Explanation attribute only. Derived from the frozen graph; it does not
      // change any STAT-DE or RWR score/rank.
      rec.networkContext = rec.degree === 0 ? 'ISOLATED' : 'CONNECTED';
      Object.assign(rec, {
        bp: num(g.baseMean_primary, F('baseMean_primary')),
        lp: num(g.lfc_shrunk_primary, F('lfc_shrunk_primary')),
        pp: num(g.pvalue_primary, F('pvalue_primary')),
        fp: num(g.padj_primary, F('padj_primary')),
        bv: num(g.baseMean_validation, F('baseMean_validation')),
        lv: num(g.lfc_shrunk_validation, F('lfc_shrunk_validation')),
        pv: num(g.pvalue_validation, F('pvalue_validation')),
        fv: num(g.padj_validation, F('padj_validation')),
      });
      byIdx[i] = rec;
      byGene.set(g.gene_id, rec);
      if (rec.symbol) byGene.set('sym:' + rec.symbol.toUpperCase(), rec);
    });

    // adjacency (undirected; edges are stored canonical u<v)
    const adj = new Map();
    const edgeList = edges.map((e, k) => {
      const u = num(e.source_node_index, `source_node_index@edge${k}`);
      const v = num(e.target_node_index, `target_node_index@edge${k}`);
      const w = num(e.weight, `weight@edge${k}`);
      if (!byIdx[u] || !byIdx[v]) {
        throw new Error(`${FILES.edges}: edge ${k} references node ${byIdx[u] ? v : u}, `
          + `which is not in the node table`);
      }
      (adj.get(u) || adj.set(u, []).get(u)).push({ to: v, w });
      (adj.get(v) || adj.set(v, []).get(v)).push({ to: u, w });
      return { u, v, w };
    });

    const rank = { 'STAT-DE-v1': {}, 'STRING-RWR-v1': {} };
    rankings.forEach((r, k) => {
      const m = r.model_id;
      if (!rank[m]) throw new Error(`${FILES.rankings}: unknown model_id "${m}"`);
      const ni = num(r.node_index, `node_index@rank${k}`);
      if (!byIdx[ni]) throw new Error(`${FILES.rankings}: unknown node_index ${r.node_index}`);
      rank[m][ni] = {
        node_index: ni, gene_id: r.gene_id, gene_symbol: r.gene_symbol,
        score: num(r.score, `score@rank${k}`),
        rank: num(r.rank, `rank@rank${k}`),
        model_id: m,
      };
    });

    const eligiblePrimary = byIdx.filter(Boolean).filter(g => g.eligP);
    const deDist = { lfcP: [], lfcV: [], padjP: [] };
    eligiblePrimary.forEach(g => {
      if (g.lp !== null) deDist.lfcP.push(g.lp);
      if (g.pp !== null && g.pp > 0) deDist.padjP.push(-Math.log10(g.pp));
    });
    byIdx.filter(Boolean).filter(g => g.eligV && g.lv !== null).forEach(g => deDist.lfcV.push(g.lv));

    S = { byIdx, byGene, adj, rank, edges: edgeList, nodes, provenance, robustness,
          baselineCmp, deDist, n: byIdx.length, edgesRaw: edges,
          nTable: geneTable.length };
    return S;
  }

  // ---------- public API ----------
  const ready = () => S;

  function load_overview() {
    const g = S.byIdx.filter(Boolean);
    const cut = (p) => {
      const v = g.map(p).filter(x => x !== null && !Number.isNaN(x));
      v.sort((a, b) => a - b);
      return v.length ? { median: v[Math.floor(v.length / 2)], n: v.length } : null;
    };
    return {
      nodes: S.n, edges: S.edges.length,
      connected: g.filter(x => x.degree > 0).length,
      isolated: g.filter(x => x.degree === 0).length,
      eligPrimary: g.filter(x => x.eligP).length,
      eligValidation: g.filter(x => x.eligV).length,
      cpmPrimary: g.filter(x => x.cpmP).length,
      cpmValidation: g.filter(x => x.cpmV).length,
      // reported_rank is NA for non-eligible nodes, so count only assigned ranks
      statRanked: Object.values(S.rank['STAT-DE-v1'] || {}).filter(r => r.rank !== null).length,
      rwrRanked: Object.values(S.rank['STRING-RWR-v1'] || {}).filter(r => r.rank !== null).length,
      rwrScored: S.nodes.length,
      lfcPrimaryMedian: cut(x => x.lp),
      lfcValidationMedian: cut(x => x.lv),
      provenance: S.provenance,
    };
  }

  function search_genes(q, limit = 25) {
    q = (q || '').trim().toUpperCase();
    if (!q) return [];
    // Relevance tiers: exact symbol, exact ID, symbol prefix, ID prefix, substring.
    // Without tiers an unrelated gene that merely appears earlier in node order can
    // outrank an exact match.
    const t0 = [], t1 = [], t2 = [], t3 = [], t4 = [];
    for (const g of S.byIdx) {
      if (!g) continue;
      const sym = (g.symbol || '').toUpperCase();
      const gid = g.gene_id.toUpperCase();
      if (sym === q) t0.push(g);
      else if (gid === q) t1.push(g);
      else if (sym.startsWith(q)) t2.push(g);
      else if (gid.startsWith(q)) t3.push(g);
      else if (sym.includes(q) || (g.mouse || '').toUpperCase().includes(q)) t4.push(g);
    }
    return [...t0, ...t1, ...t2, ...t3, ...t4].slice(0, limit);
  }

  const get_gene_detail = (i) => S.byIdx[i] || null;
  const get_gene_by_any = (key) => S.byGene.get(key) || S.byGene.get('sym:' + String(key).toUpperCase()) || null;

  /**
   * Filter the full universe, sort GLOBALLY, then split.
   *
   * The charts must be drawn from the entire filtered set, not from whatever page the
   * table happens to be showing — otherwise the volcano and the histogram silently
   * describe only the first N rows. Returns:
   *   total       true number of matching nodes (before paging)
   *   allRows     the full filtered + globally sorted set  -> charts
   *   tableRows   the current page only                    -> table
   */
  function get_de_results(cohort, opts = {}) {
    const { q = '', minAbsLfc = 0, maxFdr = 1, onlyEligible = false,
            page = 1, pageSize = 100, sort = 'padj', asc = true } = opts;
    const isV = cohort === 'validation';
    const keyL = isV ? 'lv' : 'lp', keyF = isV ? 'fv' : 'fp',
          keyB = isV ? 'bv' : 'bp', keyP = isV ? 'pv' : 'pp', keyE = isV ? 'eligV' : 'eligP';
    const qq = q.trim().toUpperCase();

    const allRows = S.byIdx.filter(Boolean).filter(g => {
      if (onlyEligible && !g[keyE]) return false;
      if (g[keyL] !== null && Math.abs(g[keyL]) < minAbsLfc) return false;
      if (g[keyF] !== null && g[keyF] > maxFdr) return false;
      if (qq && !(g.symbol || '').toUpperCase().includes(qq) &&
          !g.gene_id.toUpperCase().includes(qq) &&
          !(g.mouse || '').toUpperCase().includes(qq)) return false;
      return true;
    });

    // Global sort — applied to every matching row, before any paging.
    //
    // `sort` must name a field that actually exists on the row. A key that does not —
    // the caller passing 'padj' when the row field is 'fp' — makes every comparison
    // `undefined - undefined` = NaN, and a NaN comparator leaves the array untouched:
    // the table silently shows node order while appearing to be sorted. Fall back to
    // this cohort's FDR column rather than trusting an unknown key.
    const sortKey = (S.byIdx.find(Boolean) && sort in S.byIdx.find(Boolean)) ? sort : keyF;
    const dir = asc ? 1 : -1;
    allRows.sort((a, b) => {
      const x = a[sortKey], y = b[sortKey];
      if (x === null && y === null) return 0;
      if (x === null) return 1;
      if (y === null) return -1;
      return (typeof x === 'string' ? String(x).localeCompare(String(y)) : x - y) * dir;
    });

    const total = allRows.length;
    const pages = Math.max(1, Math.ceil(total / pageSize));
    const p = Math.min(Math.max(1, page), pages);
    const start = (p - 1) * pageSize;
    return {
      total, allRows, tableRows: allRows.slice(start, start + pageSize),
      page: p, pageSize, pages, sortKey,
    };
  }

  function get_rankings(model) {
    // `rankKey`/`scoreKey` are the FIELD NAMES on the gene record; the returned `rank`
    // and `score` are the values. Keeping both explicitly distinct avoids indexing a
    // gene record with a rank number (which yields undefined and silently defeats
    // the null filter).
    const rankKey = model === 'STAT-DE-v1' ? 'statRank' : 'rwrRank';
    const scoreKey = model === 'STAT-DE-v1' ? 'statScore' : 'rwrScore';
    return S.byIdx.filter(Boolean)
      .map(g => ({ g, rank: g[rankKey], score: g[scoreKey] }))
      .filter(x => x.rank !== null && x.rank !== undefined && !Number.isNaN(x.rank))
      .sort((a, b) => a.rank - b.rank);
  }

  /* Two different rank footprints. Both models report ranks for the same 12,577
   * analysis-eligible nodes, but over different ranking universes:
   *
   *   STAT-DE-v1    ranked among the 12,577 eligible nodes          -> 1..12,577, dense
   *   STRING-RWR-v1 ranked among the 13,858 score-positive nodes,   -> 1..13,858 with
   *                 reported only for the eligible ones               1,281 NA holes
   *
   * So Δrank = STAT − RWR compares two different denominators. That is a property of the
   * frozen baselines, not a display choice, and the UI states it wherever Δrank appears.
   */
  function get_rank_denominators() {
    const out = {};
    for (const model of ['STAT-DE-v1', 'STRING-RWR-v1']) {
      const assigned = Object.values(S.rank[model] || {}).filter(r => r.rank !== null);
      const ranks = assigned.map(r => r.rank).sort((a, b) => a - b);
      const holes = ranks.length ? (ranks[ranks.length - 1] - ranks.length) : 0;
      out[model] = {
        model,
        assigned: ranks.length,
        min: ranks.length ? ranks[0] : null,
        max: ranks.length ? ranks[ranks.length - 1] : null,
        holes,
        universe: model === 'STAT-DE-v1'
          ? 'analysis-eligible nodes (12,577)'
          : 'nodes with a positive RWR score (13,858); rank reported for the 12,577 eligible ones',
      };
    }
    return out;
  }

  /* ---------------------------------------------------------------- network guard
   *
   * A 2-hop neighbourhood is cheap to *count* and expensive to *draw*: the largest in
   * this graph is 2,273 nodes / 25,760 induced edges, and 837 nodes exceed 5,000 induced
   * edges. Counting is exact and always done; drawing is budgeted.
   *
   * When a view exceeds the budget we cap the *rendered* edge list by descending weight
   * and say so in the result. The cap is a rendering limit only — it never changes which
   * nodes are in the neighbourhood, and it is never presented as a scientific filter.
   */
  const RENDER = { maxNodes: 1500, maxEdges: 4000 };

  function get_network_neighborhood(i, hops = 1, opts = {}) {
    const start = S.byIdx[i];
    if (!start) return null;
    const { confirmLarge = false } = opts;

    // exact BFS over nodes — no edge materialisation yet
    const seen = new Map([[i, 0]]);
    let frontier = [i];
    for (let h = 1; h <= hops; h++) {
      const next = [];
      for (const u of frontier) {
        for (const { to } of (S.adj.get(u) || [])) {
          if (!seen.has(to)) { seen.set(to, h); next.push(to); }
        }
      }
      frontier = next;
      if (!frontier.length) break;
    }

    const ids = [...seen.keys()];
    const set = new Set(ids);
    const fullEdges = S.edges.filter(e => set.has(e.u) && set.has(e.v));

    const size = { nodes: ids.length, edges: fullEdges.length };
    const overBudget = size.nodes > RENDER.maxNodes || size.edges > RENDER.maxEdges;
    if (overBudget && !confirmLarge) {
      // Report the true size and let the caller decide; do not draw silently.
      return { center: start, hops, isolated: start.degree === 0, size,
               overBudget: true, truncated: false, nodes: [], edges: [],
               renderLimit: RENDER };
    }

    let edges = fullEdges;
    let truncated = false;
    if (overBudget) {
      edges = fullEdges.slice().sort((a, b) => b.w - a.w).slice(0, RENDER.maxEdges);
      truncated = true;
    }

    return {
      center: start, hops, isolated: start.degree === 0,
      size,
      overBudget,
      truncated,
      renderLimit: RENDER,
      nodes: ids.map(k => ({ ...S.byIdx[k], hop: seen.get(k) })),
      edges: edges.map(e => ({ u: e.u, v: e.v, w: e.w })),
    };
  }

  /* ------------------------------------------------------------------ validation
   *
   * Three different denominators are in play and they were previously conflated into a
   * single `n`, which made "0 sign-concordant" look like it was measured over the full
   * top-k when part of that top-k has no validation measurement at all:
   *
   *   requestedK   the k the protocol asked for              -> 10 / 20 / 50 / 100
   *   comparableN  of those k, nodes measurable in BOTH     ->  9 / 17 / 43 /  84
   *   concordantN  of those comparable, same effect sign    ->  0 /  0 /  0 /   0
   *
   * `requestedK` and `concordantN` come from the authoritative artifacts
   * (validation_pff_metrics.csv / baseline_comparison.json). `comparableN` is not stored
   * in any artifact, so it is derived here from the frozen per-node effect sizes and is
   * pinned by tests to the 9/17/43/84 the gate report cites.
   */
  const NEAR_ZERO = 0.05;          // |log2FC| below this is numerically arbitrary for sign()

  function _bothCohorts() {
    return S.byIdx.filter(Boolean).filter(g => g.lp !== null && g.lv !== null);
  }

  function get_validation_summary() {
    const cmp = S.baselineCmp;
    const pff = cmp.validation_pff;
    const both = _bothCohorts();
    const bothSet = new Set(both.map(g => g.i));

    const byStatRank = S.byIdx.filter(Boolean)
      .filter(g => g.statRank !== null)
      .sort((a, b) => a.statRank - b.statRank);

    const perK = pff.per_k.map((r) => {
      const top = byStatRank.slice(0, r.k);
      const comparable = top.filter(g => bothSet.has(g.i));
      const concordant = comparable.filter(g => Math.sign(g.lp) === Math.sign(g.lv));
      const csvRow = (cmp.validation_pff_csv || []).find(c => c.k === r.k);
      return {
        k: r.k,
        requestedK: r.primary_topk,
        comparableN: comparable.length,
        concordantN: concordant.length,
        // authoritative sign concordance over the requested k
        authoritativeConcordant: r.sign_concordant,
        authoritativeConcordance: r.sign_concordance,
        topKOverlap: r.primary_vs_validation_topk_overlap,
        topKOverlapCsv: csvRow ? csvRow.primary_vs_validation_topk_overlap : null,
      };
    });

    // Sign concordance is a sign() applied to shrunken estimates. Within the primary
    // top-100 restricted to nodes measurable in both cohorts, most of the strongest
    // primary effects are essentially absent in PFF; sign() of those is arbitrary.
    const nearUniverse = both.slice().sort((a, b) => Math.abs(b.lp) - Math.abs(a.lp)).slice(0, 100);
    const nearZero = nearUniverse.filter(g => Math.abs(g.lv) < NEAR_ZERO);
    const asIs = nearUniverse.filter(g => Math.sign(g.lp) === Math.sign(g.lv));

    const genomeAsIs = both.filter(g => Math.sign(g.lp) === Math.sign(g.lv)).length / both.length;

    return {
      universe: { usableBoth: pff.usable_nodes_both_cohorts, derivedUsableBoth: both.length,
                  nodes: S.n },
      // authoritative signed-effect correlations: copied, never recomputed here
      effect: { spearman: pff.signed_effect_spearman,
                kendall: pff.signed_effect_kendall_tau_b },
      perK,
      nearZero: {
        threshold: NEAR_ZERO,
        k: nearUniverse.length,
        universe: 'primary top-k by |log2FC| restricted to nodes measurable in both cohorts',
        nearZeroN: nearZero.length,
        asIsConcordantN: asIs.length,
        flippedConcordantN: nearUniverse.length - asIs.length,
      },
      genomeWide: { n: both.length, asIs: genomeAsIs, flipped: 1 - genomeAsIs },
      statVsRwr: {
        spearman: cmp.stat_vs_rwr.spearman_rho,
        kendall: cmp.stat_vs_rwr.kendall_tau_b,
        universe: cmp.common_ranked_universe,
        topk: cmp.stat_vs_rwr.topk.map(t => ({ k: t.k, overlap: t.overlap, jaccard: t.jaccard })),
      },
      source: cmp.source,
    };
  }

  /* --------------------------------------------------- presentation classification
   *
   * Everything below DERIVES LABELS from values that are already frozen. It computes no
   * statistic, applies no new biological threshold, and never touches a rank or a score.
   *
   * The only numeric cut used is the near-zero threshold |log2FC| < 0.05, which is the
   * one recorded in VALIDATION_METRIC_CLARIFICATION.md as part of the existing validation
   * analysis definition. Nothing else here introduces a cutoff.
   */

  const NEAR_ZERO_LFC = 0.05;

  /** Magnitude of a log2 fold change, stated as a plain multiple. No verdict. */
  function foldPhrase(lfc) {
    // `|` here was a bitwise OR, not `||`: it coerced the NaN check to an integer and
    // would have let a NaN through as a valid fold change.
    if (lfc === null || lfc === undefined || Number.isNaN(lfc)) return null;
    const mult = Math.pow(2, Math.abs(lfc));
    const dir = lfc > 0 ? 'up' : (lfc < 0 ? 'down' : 'flat');
    // `lfc` is returned alongside the phrase because every caller compares against it.
    // Omitting it made `p.lfc > 0` compare undefined and report "close to control" for
    // a gene that had more than doubled.
    return { lfc, dir, multiple: mult };
  }

  /**
   * Explanation tags for one gene. `topK` is a range the READER chose — it is a view
   * filter, not a biological cutoff, and the caller must say so wherever it is shown.
   */
  function explain_gene(g, opts = {}) {
    const { topK = null } = opts;
    if (!g) return null;
    const tags = [];

    // Expression evidence — position within a reader-chosen range, never a threshold.
    if (topK && g.statRank !== null && g.statRank <= topK) {
      tags.push({ id: 'strong_expression', rank: g.statRank, topK });
    }
    // Network context — degree > 0 is a property of the frozen graph.
    if (g.degree > 0) tags.push({ id: 'network_supported', degree: g.degree });
    else tags.push({ id: 'isolated', degree: 0 });
    // Network promotion — authoritative reported ranks only, never a dense re-rank.
    const d = (g.statRank !== null && g.rwrRank !== null) ? g.statRank - g.rwrRank : null;
    if (d !== null && d > 0) tags.push({ id: 'network_promoted', delta: d });
    if (d !== null && d <= 0) tags.push({ id: 'not_promoted', delta: d });

    return { tags, deltaRank: d, topK };
  }

  /**
   * Validation state for one gene, using only the frozen near-zero definition.
   *
   * The names are deliberately descriptive of the effect size and nothing more. An
   * earlier version called the third state "signal present", which reads as a result —
   * as if the validation cohort had confirmed something. It has not: this is a magnitude
   * classification on one shrunken estimate, and it carries no claim about significance,
   * replication or biology. The FDR travels with it so the reader can see that for
   * themselves.
   */
  function validation_state(g) {
    if (!g) return null;
    if (g.lv === null || Number.isNaN(g.lv)) return { id: 'not_comparable', lv: null, fdr: null };
    if (Math.abs(g.lv) < NEAR_ZERO_LFC) return { id: 'near_zero', lv: g.lv, fdr: g.fv };
    return { id: 'non_near_zero', lv: g.lv, fdr: g.fv };
  }

  /**
   * Why is this gene interesting? Rule-generated from the fields above — no model, no
   * inference. Every clause names the field that produced it. The set of things this
   * function can never say is as important as what it says: it cannot call a gene a
   * target, a cause, or validated.
   */
  function why_interesting(g, opts = {}) {
    if (!g) return [];
    const { topK = null } = opts;
    const out = [];

    const p = foldPhrase(g.lp);
    if (p) {
      out.push({
        id: 'expr_change',
        data: { lfc: g.lp, multiple: p.multiple, dir: p.dir, fdr: g.fp },
      });
    }
    if (topK && g.statRank !== null && g.statRank <= topK) {
      out.push({ id: 'expr_rank', data: { rank: g.statRank, topK } });
    }
    if (g.degree > 0) {
      out.push({ id: 'network_edges', data: { degree: g.degree } });
    } else {
      out.push({ id: 'no_network_edges', data: { degree: 0 } });
    }
    const d = (g.statRank !== null && g.rwrRank !== null) ? g.statRank - g.rwrRank : null;
    if (d !== null && d > 0) out.push({ id: 'promoted', data: { delta: d } });
    if (d !== null && d < 0) out.push({ id: 'demoted', data: { delta: d } });

    const vs = validation_state(g);
    if (vs.id === 'non_near_zero') out.push({ id: 'val_signal', data: { lv: vs.lv, fdr: vs.fdr } });
    else if (vs.id === 'near_zero') out.push({ id: 'val_near_zero', data: { lv: vs.lv } });
    else out.push({ id: 'val_missing', data: {} });

    return out;
  }

  /** Rank position within the eligible set, as a fraction — context for "how far down". */
  function rank_context(g) {
    if (!g || g.statRank === null) return null;
    const n = S.byIdx.filter(Boolean).filter(x => x.statRank !== null).length;
    return { rank: g.statRank, of: n, pct: g.statRank / n };
  }

  /* The interface shades points at FDR < 0.05 in the volcano, which is a DISPLAY
   * convention only — the Expression page says so, and no gate depends on it. It is
   * named here so caution text can say which convention it is referring to instead of
   * quietly implying a significance test happened. */
  const FDR_DISPLAY = 0.05;

  /**
   * Why inspect this gene — the positive half of the interpretation, each clause tied to
   * a field. Same rule engine as why_interesting; kept as one function so the two cannot
   * drift.
   */
  const why_inspect = (g, opts) => why_interesting(g, opts);

  /**
   * What to be careful about. Every entry names the value that produced it. These are
   * limits on interpretation, not findings: nothing here says a gene is bad, and nothing
   * here is a threshold this app invented and applied.
   */
  function cautions(g, opts = {}) {
    if (!g) return [];
    const { topK = null } = opts;
    const out = [];

    if (g.statRank === null) {
      out.push({ id: 'not_ranked', data: {} });
    } else if (topK && g.statRank > topK) {
      out.push({ id: 'outside_topk', data: { rank: g.statRank, topK } });
    }
    out.push({ id: 'fdr_is_not_a_verdict', data: { fdr: g.fp, convention: FDR_DISPLAY } });

    const vs = validation_state(g);
    if (vs.id === 'near_zero') out.push({ id: 'val_near_zero', data: { lv: vs.lv } });
    else if (vs.id === 'not_comparable') out.push({ id: 'val_missing', data: {} });

    if (g.degree === 0) out.push({ id: 'isolated', data: {} });
    const d = (g.statRank !== null && g.rwrRank !== null) ? g.statRank - g.rwrRank : null;
    if (d !== null) out.push({ id: 'rank_universe_mismatch', data: { delta: d } });

    // A direction flip is only interpretable once the validation effect is meaningful.
    if (vs.id === 'non_near_zero' && g.lp !== null && g.lv !== null
        && Math.sign(g.lp) !== Math.sign(g.lv)) {
      out.push({ id: 'direction_opposite', data: { lp: g.lp, lv: vs.lv } });
    }
    return out;
  }

  /* ------------------------------------------------------- MPTP <-> PFF pairing
   *
   * The two cohorts are shown side by side, with a direction glyph. The glyph is NOT a
   * verdict: when the validation effect is near zero its sign is numerically arbitrary,
   * so the pairing carries an explicit agreement state that refuses to call a near-zero
   * pair "discordant".
   */
  function validation_pair(g) {
    if (!g) return null;
    const vs = validation_state(g);
    const dirOf = v => (v === null ? null : (v > 0 ? 'up' : (v < 0 ? 'down' : 'flat')));
    const mp = dirOf(g.lp), pf = dirOf(g.lv);
    let agreement;
    if (vs.id === 'not_comparable') agreement = 'not_comparable';
    else if (vs.id === 'near_zero') agreement = 'validation_near_zero';
    else if (mp === pf) agreement = 'same_direction';
    else agreement = 'opposite_direction';
    return {
      primary: { lfc: g.lp, fdr: g.fp, dir: mp, eligible: g.eligP },
      pff: { lfc: g.lv, fdr: g.fv, dir: pf, eligible: g.eligV },
      state: vs.id,
      agreement,
      // The glyph is only meaningful in these two states.
      directionInterpretable: agreement === 'same_direction' || agreement === 'opposite_direction',
    };
  }

  /**
   * Direct neighbours with their own evidence, so a reader can see WHY a node might
   * receive propagated signal rather than only that it has edges.
   */
  function neighbour_evidence(i) {
    const centre = S.byIdx[i];
    if (!centre) return null;
    return (S.adj.get(i) || []).map(({ to, w }) => {
      const n = S.byIdx[to];
      return {
        node_index: to, symbol: n.symbol, gene_id: n.gene_id,
        weight: w, degree: n.degree,
        lp: n.lp, fp: n.fp, statRank: n.statRank, rwrRank: n.rwrRank,
        rwrScore: n.rwrScore,
      };
    }).sort((a, b) => b.weight - a.weight);
  }

  /**
   * Candidate funnel. Every stage is a real count from frozen data; the last stage is
   * "research candidates", never "targets". A stage the reader has not reached yet is
   * reported as null rather than guessed.
   */
  function funnel(opts = {}) {
    const { topK = null, shortlistN = null, reviewedN = null } = opts;
    const all = S.byIdx.filter(Boolean);
    return [
      { id: 'universe', n: all.length, frozen: true },
      { id: 'eligible', n: all.filter(g => g.eligP).length, frozen: true },
      { id: 'ranked', n: all.filter(g => g.statRank !== null).length, frozen: true },
      { id: 'topk', n: topK, frozen: false },
      { id: 'network_review', n: reviewedN, frozen: false },
      { id: 'shortlist', n: shortlistN, frozen: false },
    ];
  }

  const get_provenance = () => S.provenance;
  const get_robustness = () => S.robustness;
  /** The top-ranked gene overall, regardless of network context. Never hidden. */
  const get_top_candidate = () => (get_rankings('STAT-DE-v1')[0] || {}).g || null;

  return { init, ready, load_overview, search_genes, get_gene_detail, get_gene_by_any,
           get_de_results, get_rankings, get_rank_denominators, get_network_neighborhood,
           get_validation_summary, get_provenance, get_robustness, get_top_candidate,
           explain_gene, validation_state, why_interesting, why_inspect, cautions,
           validation_pair, neighbour_evidence, funnel, rank_context, foldPhrase,
           NEAR_ZERO_LFC, FDR_DISPLAY,
           parseCSV, checkColumns, RENDER_LIMIT: RENDER,
           _internal: { num, bool } };
})();
