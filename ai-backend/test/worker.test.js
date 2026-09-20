import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { validateBody } from '../src/worker.js';

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
