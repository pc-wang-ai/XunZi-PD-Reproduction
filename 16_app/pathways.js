/* XunZi-PD — pathway context (v1.6 extension layer).
 *
 * Two different things live here and must never be confused:
 *
 *   MEMBERSHIP   "which pathways contain this gene?"  — an annotation lookup, no
 *                statistics, no comparison against anything.
 *   ENRICHMENT   "are this gene set's pathways over-represented against a background?"
 *                — a statistical test, always labelled exploratory.
 *
 * The enrichment is a one-sided hypergeometric test with Benjamini-Hochberg correction
 * across every testable pathway. The background is the analysis-eligible genes present
 * in the reference (10,682), NOT the whole genome and NOT the whole universe — the
 * candidate set is drawn from the ranking, so the background has to be the genes the
 * ranking could have selected.
 *
 * The build writes frozen scipy values for K = 20/50/100. This module recomputes the
 * same statistic in the browser so an arbitrary gene set (a user shortlist) can be
 * tested, and a test asserts the two agree exactly on the frozen K values.
 *
 * Read-only context. Nothing here may feed STAT-DE-v1, STRING-RWR-v1 or any ranking.
 */
const Pathways = (() => {
  const BASE = '../outputs/app_data_v1_6/';
  const FILES = {
    index: 'pathway_index.tsv',
    genePathway: 'gene_pathway.tsv',
    frozen: 'enrichment_frozen.json',
    manifest: 'manifest.json',
  };

  let IDX = null;        // pathway_id -> {source, name, bg}
  let BY_GENE = null;    // gene_id -> {reactome:[ids], gobp:[ids]}
  let FROZEN = null;
  let READY = false;
  let N_BG = null;

  /* ---------------------------------------------------------------- lgamma
   * Lanczos approximation. Needed for the binomial coefficients in the hypergeometric
   * tail; a direct factorial overflows immediately at these sizes. */
  const LG = [676.5203681218851, -1259.1392167224028, 771.32342877765313,
    -176.61502916214059, 12.507343278686905, -0.13857109526572012,
    9.9843695780195716e-6, 1.5056327351493116e-7];
  function lgamma(z) {
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgamma(1 - z);
    z -= 1;
    let x = 0.99999999999980993;
    for (let i = 0; i < LG.length; i++) x += LG[i] / (z + i + 1);
    const t = z + LG.length - 0.5;
    return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }
  const logC = (n, k) => (k < 0 || k > n) ? -Infinity : lgamma(n + 1) - lgamma(k + 1) - lgamma(n - k + 1);

  /** P(X >= k) for X ~ Hypergeometric(N, K, n). Summed in log space. */
  function hypergeomSF(k, N, K, n) {
    if (k <= 0) return 1;
    const hi = Math.min(K, n);
    if (k > hi) return 0;
    const denom = logC(N, n);
    let sum = 0;
    for (let i = k; i <= hi; i++) sum += Math.exp(logC(K, i) + logC(N - K, n - i) - denom);
    return Math.min(1, sum);
  }

  /** Benjamini-Hochberg. Returns q-values in the input order. */
  function bh(ps) {
    const m = ps.length;
    const order = ps.map((p, i) => [p, i]).sort((a, b) => a[0] - b[0]);
    const q = new Array(m);
    let prev = 1;
    for (let rank = m; rank >= 1; rank--) {
      const [p, i] = order[rank - 1];
      prev = Math.min(prev, p * m / rank);
      q[i] = prev;
    }
    return q;
  }

  /* ------------------------------------------------------------------- load */
  async function init() {
    const [idxTxt, gpTxt, frozen, manifest] = await Promise.all([
      fetch(BASE + FILES.index, { cache: 'no-store' }).then(r => {
        if (!r.ok) throw new Error(`cannot read ${FILES.index} (HTTP ${r.status})`); return r.text();
      }),
      fetch(BASE + FILES.genePathway, { cache: 'no-store' }).then(r => {
        if (!r.ok) throw new Error(`cannot read ${FILES.genePathway} (HTTP ${r.status})`); return r.text();
      }),
      fetch(BASE + FILES.frozen, { cache: 'no-store' }).then(r => r.json()),
      fetch(BASE + FILES.manifest, { cache: 'no-store' }).then(r => r.json()),
    ]);

    IDX = new Map();
    idxTxt.split('\n').slice(1).forEach(line => {
      if (!line) return;
      const [source, id, name, bg] = line.split('\t');
      if (!id) return;
      IDX.set(id, { source, id, name, bg: +bg });
    });

    BY_GENE = new Map();
    const lines = gpTxt.split('\n');
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i];
      if (!line) continue;
      const [gid, rea, gobp] = line.split('\t');
      BY_GENE.set(gid, {
        reactome: rea ? rea.split('|') : [],
        gobp: gobp ? gobp.split('|') : [],
      });
    }

    FROZEN = frozen;
    N_BG = frozen.background ? frozen.background.genes : null;
    READY = true;
    return { pathways: IDX.size, genes: BY_GENE.size, manifest };
  }

  /** Membership lookup. NOT enrichment — no statistic is computed here. */
  function forGene(geneId) {
    if (!READY) return null;
    const hit = BY_GENE.get(geneId);
    if (!hit) return { reactome: [], gobp: [], inReference: false };
    const named = ids => ids.map(id => {
      const m = IDX.get(id);
      return m ? { id, name: m.name, source: m.source, bg: m.bg } : { id, name: id, source: '', bg: null };
    }).sort((a, b) => a.name.localeCompare(b.name));
    return { reactome: named(hit.reactome), gobp: named(hit.gobp), inReference: true };
  }

  const background = () => N_BG;
  const testablePathways = () => (IDX ? IDX.size : 0);
  const frozenFor = (k) => (FROZEN && FROZEN.by_k ? FROZEN.by_k[String(k)] || null : null);
  const definition = () => (FROZEN ? FROZEN.definition : null);
  const schema = () => (FROZEN ? FROZEN.schema_version : null);
  const ready = () => READY;

  /**
   * Exploratory over-representation for an arbitrary gene set.
   * `geneIds` must be Ensembl ids; anything not in the universe is ignored, and the
   * effective candidate count is reported so the caller can show what was actually
   * tested rather than what was requested.
   */
  function enrich(geneIds) {
    if (!READY || !N_BG) return null;
    const uniq = [...new Set(geneIds)].filter(g => BY_GENE.has(g));
    const n = uniq.length;
    if (!n) return { candidate_n: 0, tested_pathways: IDX.size, rows: [], requested: geneIds.length };

    // Count candidate hits per pathway by walking the candidates, so the full
    // pathway -> genes map never has to be held in memory.
    const hits = new Map();
    uniq.forEach(g => {
      const m = BY_GENE.get(g);
      m.reactome.forEach(p => hits.set(p, (hits.get(p) || 0) + 1));
      m.gobp.forEach(p => hits.set(p, (hits.get(p) || 0) + 1));
    });

    const ids = [...IDX.keys()];
    const ps = new Array(ids.length);
    ids.forEach((pid, j) => {
      const k = hits.get(pid) || 0;
      ps[j] = k === 0 ? 1 : hypergeomSF(k, N_BG, IDX.get(pid).bg, n);
    });
    const qs = bh(ps);

    const rows = [];
    ids.forEach((pid, j) => {
      const k = hits.get(pid) || 0;
      if (!k) return;
      const meta = IDX.get(pid);
      rows.push({
        source: meta.source, pathway_id: pid, pathway_name: meta.name,
        candidate_hits: k, pathway_bg_genes: meta.bg, background_genes: N_BG,
        candidate_genes: n, p_value: ps[j], fdr_bh: qs[j],
      });
    });
    rows.sort((a, b) => a.p_value - b.p_value);
    return { candidate_n: n, tested_pathways: ids.length, rows, requested: geneIds.length,
             not_in_reference: geneIds.length - n };
  }

  /** Convenience: enrich the top-K of the frozen STAT ranking. */
  function enrichTopK(k, rankingFn) {
    const ids = rankingFn().slice(0, k).map(x => x.g.gene_id);
    return enrich(ids);
  }

  return { init, ready, forGene, enrich, enrichTopK, background, testablePathways,
           frozenFor, definition, schema, hypergeomSF, bh, lgamma,
           _files: FILES, _base: BASE };
})();
