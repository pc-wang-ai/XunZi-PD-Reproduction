/* XunZi-PD — PD reference evidence (v1.6 extension layer).
 *
 * External context: which of these genes already appear in published Parkinson's disease
 * genetics (GWAS Catalog associations mapped to EFO_0002508 by the source itself).
 *
 * This layer answers one question — "does existing PD genetics already mention this
 * gene?" — and nothing else. It is never an input to STAT-DE-v1, STRING-RWR-v1,
 * analysis eligibility or any ranking, and the app never derives a score from it.
 *
 * Absence of evidence is reported as absence of evidence, not as novelty.
 */
const PdEvidence = (() => {
  const BASE = '../outputs/app_data_v1_6/';
  const FILE = 'pd_evidence.json';

  let DATA = null;       // { source, by_gene: {gene_id: {...}} }
  let READY = false;
  let ERR = null;

  async function init() {
    try {
      const res = await fetch(BASE + FILE, { cache: 'no-store' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      DATA = await res.json();
      READY = true;
    } catch (e) {
      // A missing PD reference is not a broken app. The pages that use it say so.
      ERR = e.message || String(e);
      READY = false;
    }
    return { ready: READY, error: ERR };
  }

  /** Evidence for one gene. Always returns an object; never throws. */
  function forGene(geneId) {
    if (!READY || !DATA.by_gene) return null;
    return DATA.by_gene[geneId] || { gwas_associations: 0, studies: [], associations: [], strongest_p: null };
  }

  const source = () => (READY && DATA.source) ? DATA.source : {};
  const ready = () => READY;
  const error = () => ERR;
  /** Genes with at least one association. */
  function knownGenes() {
    if (!READY) return [];
    return Object.keys(DATA.by_gene).filter(g => DATA.by_gene[g].gwas_associations > 0);
  }

  return { init, ready, error, forGene, source, knownGenes, _file: FILE, _base: BASE };
})();
