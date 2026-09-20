/* Frozen public-evidence retriever.
 *
 * This module retrieves a small, fixed set of public data files from an immutable
 * Git commit. It verifies each SHA-256 before parsing, so a changed upstream file
 * becomes an error instead of a silently changed research answer.
 */
const SNAPSHOT_COMMIT = '45b653d06f4569139346adbaa00c0be78861228b';
const BASE = `https://raw.githubusercontent.com/pc-wang-ai/XunZi-PD-Reproduction/${SNAPSHOT_COMMIT}/`;

const SOURCES = {
  // This is the SHA-256 of the immutable Git raw-content bytes (LF line endings),
  // rather than the developer's platform-specific checkout bytes.
  gene: { path: 'outputs/app_data/app_gene_detail.csv', sha256: '79292cc21a58419bac7e4fcb82e6948098c6569dffcca85a9b0d4f1e775258f6', layer: 'frozen primary/MPTP, PFF and network evidence' },
  pathways: { path: 'outputs/app_data_v1_6/gene_pathway.tsv', sha256: 'fc25d3008de8ee577320227ddfbe7419ff5cf43d498505ec45ee145d79dba330', layer: 'frozen pathway membership annotation' },
  pathwayIndex: { path: 'outputs/app_data_v1_6/pathway_index.tsv', sha256: '21a10e032c467e3a07cdb33faf5912b04e98397b8150cd6110e45910797707be', layer: 'frozen pathway reference' },
  pd: { path: 'outputs/app_data_v1_6/pd_evidence.json', sha256: '7014d04e4c9eef925e4c8895d5832eee5fb94a2698b25f8bc5f2ac762747d94d', layer: 'frozen PD genetics reference context' },
};

function parseDelimited(text, separator) {
  const rows = text.trim().split(/\r?\n/).map(line => line.split(separator));
  const [head, ...body] = rows;
  return body.map(row => Object.fromEntries(head.map((h, i) => [h, row[i] ?? ''])));
}

async function digest(text) {
  const bytes = new TextEncoder().encode(text);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function readPinned(fetchImpl, spec) {
  const response = await fetchImpl(BASE + spec.path, { cf: { cacheTtl: 86400, cacheEverything: true } });
  if (!response.ok) throw new Error(`frozen source unavailable: ${spec.path}`);
  const text = await response.text();
  if (await digest(text) !== spec.sha256) throw new Error(`frozen source hash mismatch: ${spec.path}`);
  return text;
}

function numberOrNull(value) {
  return value === 'NA' || value === '' || value === undefined ? null : Number(value);
}

function makeCitation(label, source, value) {
  return { label, source, value: String(value) };
}

export async function loadFrozenEvidence(fetchImpl = fetch) {
  const [genesText, pathwaysText, pathwayIndexText, pdText] = await Promise.all([
    readPinned(fetchImpl, SOURCES.gene), readPinned(fetchImpl, SOURCES.pathways),
    readPinned(fetchImpl, SOURCES.pathwayIndex), readPinned(fetchImpl, SOURCES.pd),
  ]);
  const genes = parseDelimited(genesText, ',');
  const byGene = new Map();
  genes.forEach(gene => {
    byGene.set(gene.gene_id, gene);
    if (gene.gene_symbol) byGene.set(`sym:${gene.gene_symbol.toUpperCase()}`, gene);
  });
  const pathwayNames = new Map(parseDelimited(pathwayIndexText, '\t').map(row => [row.pathway_id, row.pathway_name]));
  const pathways = new Map(parseDelimited(pathwaysText, '\t').map(row => [row.gene_id, row]));
  return { byGene, pathways, pathwayNames, pd: JSON.parse(pdText).by_gene };
}

export function evidenceFor(snapshot, requestedGene) {
  const gene = snapshot.byGene.get(requestedGene) || snapshot.byGene.get(`sym:${requestedGene.toUpperCase()}`);
  if (!gene) return null;
  const evidence = [];
  const add = (label, source, value) => { if (value !== null && value !== undefined && value !== 'NA') evidence.push(makeCitation(label, source, value)); };
  add('MPTP log2FC', SOURCES.gene.layer, numberOrNull(gene.lfc_shrunk_primary));
  add('MPTP adjusted p-value', SOURCES.gene.layer, numberOrNull(gene.padj_primary));
  add('STAT-DE-v1 reported rank', SOURCES.gene.layer, numberOrNull(gene.stat_de_v1_rank));
  add('STRING-RWR-v1 reported rank', SOURCES.gene.layer, numberOrNull(gene.string_rwr_v1_rank));
  add('Protein-network degree', SOURCES.gene.layer, numberOrNull(gene.graph_degree));
  add('PFF log2FC', SOURCES.gene.layer, numberOrNull(gene.lfc_shrunk_validation));
  add('PFF adjusted p-value', SOURCES.gene.layer, numberOrNull(gene.padj_validation));

  const memberships = snapshot.pathways.get(gene.gene_id);
  const ids = memberships ? [memberships.reactome, memberships.gobp].filter(Boolean).flatMap(x => x.split('|')) : [];
  const pathwayMembership = ids.slice(0, 50).map(id => ({ id, name: snapshot.pathwayNames.get(id) || null }));
  // The complete identifiers remain in `pathway_membership`; keep the citation
  // compact so it remains readable on a phone and does not turn an ID list into a
  // new ranking or interpretation.
  if (pathwayMembership.length) add('Pathway membership annotations', SOURCES.pathways.layer, pathwayMembership.length);

  const pd = snapshot.pd[gene.gene_id] || null;
  if (pd) {
    add('PD genetics associations', SOURCES.pd.layer, pd.gwas_associations);
    add('PD genetics study accessions', SOURCES.pd.layer, pd.studies.join('|'));
  }
  return {
    gene: { gene_id: gene.gene_id, symbol: gene.gene_symbol, mouse_gene_id: gene.mouse_gene_id },
    evidence,
    pathway_membership: pathwayMembership,
    pd_reference: pd ? { gwas_associations: pd.gwas_associations, studies: pd.studies } : null,
    boundary: 'Research context only; this does not establish disease causality or a validated therapeutic target.',
    source_snapshot: { commit: SNAPSHOT_COMMIT, files: Object.values(SOURCES).map(({ path, sha256 }) => ({ path, sha256 })) },
  };
}
