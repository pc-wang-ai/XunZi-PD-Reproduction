import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { validateBody } from '../src/worker.js';
import { evidenceFor } from '../src/evidence.js';
import { askEvidenceModel, isAllowedResearchQuestion } from '../src/model.js';

const env = {
  AI_ENABLED: 'false',
  ALLOWED_ORIGIN: 'https://pc-wang-ai.github.io',
  RATE_LIMITER: { limit: async () => ({ success: true }) },
};
const req = (body, extra = {}) => new Request('https://qa.example/v1/answer', {
  method: 'POST',
  headers: { Origin: 'https://pc-wang-ai.github.io', 'content-type': 'application/json', ...extra },
  body: JSON.stringify(body),
});

test('rejects medical questions before any model adapter could run', async () => {
  const response = await worker.fetch(req({ gene_id: 'SNCA', question: 'Should I take a drug for this?' }), env);
  assert.equal(response.status, 422);
  assert.equal((await response.json()).status, 'out_of_scope');
});

test('rejects a non-allowlisted browser origin', async () => {
  const response = await worker.fetch(new Request('https://qa.example/v1/answer', {
    method: 'POST', headers: { Origin: 'https://attacker.example', 'content-type': 'application/json' },
    body: JSON.stringify({ gene_id: 'SNCA', question: 'What happened in MPTP?' }),
  }), env);
  assert.equal(response.status, 403);
});

test('accepts only bounded question and gene identifier shapes', () => {
  assert.equal(validateBody({ gene_id: 'ENSG00000145335', question: 'What happened in MPTP?' }).ok, true);
  assert.equal(validateBody({ gene_id: '<script>', question: 'What happened?' }).code, 'invalid_gene_id');
  assert.equal(validateBody({ gene_id: 'SNCA', question: 'x'.repeat(601) }).code, 'invalid_question');
});

test('stays unavailable until an explicit deployment enablement and evidence retriever exist', async () => {
  const response = await worker.fetch(req({ gene_id: 'SNCA', question: 'What happened in MPTP?' }), env);
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, 'ai_not_enabled');
});

test('does not fetch evidence or call a model when AI configuration is incomplete', async () => {
  const response = await worker.fetch(req({ gene_id: 'SNCA', question: 'What happened in MPTP?' }), { ...env, AI_ENABLED: 'true' });
  assert.equal(response.status, 503);
  assert.equal((await response.json()).error, 'model_not_configured');
});

test('attaches backend-generated citations from a frozen evidence record', () => {
  const result = evidenceFor({
    byGene: new Map([['SNCA', {
      gene_id: 'ENSG00000145335', gene_symbol: 'SNCA', mouse_gene_id: 'ENSMUSG00000025889',
      lfc_shrunk_primary: '0.42', padj_primary: '0.01', stat_de_v1_rank: '8',
      string_rwr_v1_rank: '3', graph_degree: '5', lfc_shrunk_validation: 'NA', padj_validation: 'NA',
    }], ['sym:SNCA', {
      gene_id: 'ENSG00000145335', gene_symbol: 'SNCA', mouse_gene_id: 'ENSMUSG00000025889',
      lfc_shrunk_primary: '0.42', padj_primary: '0.01', stat_de_v1_rank: '8',
      string_rwr_v1_rank: '3', graph_degree: '5', lfc_shrunk_validation: 'NA', padj_validation: 'NA',
    }]]),
    pathways: new Map([['ENSG00000145335', { reactome: 'R-HSA-1', gobp: '' }]]),
    pathwayNames: new Map([['R-HSA-1', 'Example process']]),
    pd: { ENSG00000145335: { gwas_associations: 2, studies: ['GCST000001'] } },
  }, 'SNCA');
  assert.equal(result.gene.symbol, 'SNCA');
  assert.equal(result.evidence.find(x => x.label === 'MPTP log2FC').value, '0.42');
  assert.equal(result.pd_reference.studies[0], 'GCST000001');
  assert.match(result.boundary, /does not establish/);
});

test('model adapter is server-only, disables storage, and returns only model text', async () => {
  let request;
  const result = await askEvidenceModel({
    question: 'What happened in MPTP?', language: 'en',
    evidence: { gene: { gene_id: 'ENSG00000145335', symbol: 'SNCA' }, evidence: [], pathway_membership: [], pd_reference: null, boundary: 'boundary', source_snapshot: {} },
    env: { DEEPSEEK_API_KEY: 'test-secret', DEEPSEEK_MODEL: 'test-model' },
    fetchImpl: async (_url, init) => { request = init; return new Response(JSON.stringify({ output: [{ content: [{ type: 'output_text', text: 'Evidence-only answer. boundary' }] }] })); },
  });
  assert.equal(result.answer, 'Evidence-only answer. boundary');
  const body = JSON.parse(request.body);
  assert.equal(body.model, 'test-model');
  assert.equal(body.store, false);
  assert.equal(body.tools, undefined);
  assert.match(request.headers.authorization, /^Bearer test-secret$/);
  assert.equal(isAllowedResearchQuestion('What happened in MPTP?'), true);
  assert.equal(isAllowedResearchQuestion('Tell me a joke'), false);
});
