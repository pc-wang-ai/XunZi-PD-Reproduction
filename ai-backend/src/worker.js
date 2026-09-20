/* XunZi-PD AI evidence Q&A — deployment gate.
 *
 * This Worker intentionally does NOT call a model yet. It enforces the public
 * boundary before an evidence retriever and model adapter are attached: CORS,
 * input size, out-of-scope refusals, and required platform rate limiting.
 *
 * Never add OPENAI_API_KEY to this repository, wrangler.toml, or browser code.
 */

import { evidenceFor, loadFrozenEvidence } from './evidence.js';
import { askEvidenceModel, isAllowedResearchQuestion } from './model.js';

const MAX_QUESTION_CHARS = 600;
const ALLOWED_GENE = /^(?:ENSG\d{11}|ENSMUSG\d{11}|[A-Za-z][A-Za-z0-9-]{0,31})$/;
const MEDICAL_PATTERN = /\b(?:diagnos(?:is|e)|prognos(?:is|e)|treat(?:ment)?|drug|dose|medication|symptom|cure|prescri(?:be|ption))\b|诊断|治疗|药物|用药|剂量|症状|处方|治愈/i;
const INJECTION_PATTERN = /ignore (?:all |previous |the )?(?:rules|instructions)|system prompt|developer message|jailbreak|忽略.{0,12}(?:规则|指令)|系统提示/i;

const json = (body, status = 200, headers = {}) => new Response(JSON.stringify(body), {
  status,
  headers: { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store', ...headers },
});

function cors(request, env) {
  const origin = request.headers.get('Origin');
  const allowed = env.ALLOWED_ORIGIN;
  if (!origin) return { ok: true, headers: { vary: 'Origin' } };
  if (origin !== allowed) return { ok: false, headers: { vary: 'Origin' } };
  return {
    ok: true,
    headers: {
      'access-control-allow-origin': origin,
      'access-control-allow-methods': 'POST, OPTIONS',
      'access-control-allow-headers': 'content-type',
      'access-control-max-age': '600',
      vary: 'Origin',
    },
  };
}

async function rateKey(request) {
  // Used only by the rate-limit binding; never logged or returned to the browser.
  const ip = request.headers.get('CF-Connecting-IP') || 'unknown';
  const bytes = new TextEncoder().encode(`xunzi-pd-rate-limit:${ip}`);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(digest)).slice(0, 16).map(x => x.toString(16).padStart(2, '0')).join('');
}

function validateBody(body) {
  const question = typeof body?.question === 'string' ? body.question.trim() : '';
  const geneId = typeof body?.gene_id === 'string' ? body.gene_id.trim() : '';
  const language = body?.language === 'zh' ? 'zh' : 'en';
  if (!question || question.length > MAX_QUESTION_CHARS) {
    return { ok: false, status: 400, code: 'invalid_question' };
  }
  if (!geneId || !ALLOWED_GENE.test(geneId)) {
    return { ok: false, status: 400, code: 'invalid_gene_id' };
  }
  if (MEDICAL_PATTERN.test(question)) return { ok: false, status: 422, code: 'medical_out_of_scope' };
  if (INJECTION_PATTERN.test(question)) return { ok: false, status: 422, code: 'instruction_attack' };
  return { ok: true, question, geneId, language };
}

function refusal(code, language) {
  const zh = language === 'zh';
  const text = {
    medical_out_of_scope: zh
      ? 'XunZi-PD 仅供科研解读，不能提供诊断、治疗或用药建议。'
      : 'XunZi-PD is for research interpretation only and cannot provide diagnosis, treatment, or medication advice.',
    instruction_attack: zh
      ? '该请求不在证据问答范围内。只能根据已加载的冻结研究证据回答。'
      : 'That request is outside evidence Q&A scope. Answers may use only the loaded frozen research evidence.',
    question_out_of_scope: zh
      ? '只能询问此基因在已加载的 MPTP、PFF、排名、网络、通路或 PD 参考证据中的内容。'
      : 'Questions must concern the selected gene’s loaded MPTP, PFF, ranking, network, pathway, or PD-reference evidence.',
  }[code];
  return { status: 'out_of_scope', answer: text, evidence: [], boundary: zh
    ? '研究背景不能确立疾病因果关系或经过验证的治疗靶点。'
    : 'Research context does not establish disease causality or a validated therapeutic target.' };
}

export default {
  async fetch(request, env) {
    const c = cors(request, env);
    if (!c.ok) return json({ error: 'origin_not_allowed' }, 403, c.headers);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: c.headers });
    const url = new URL(request.url);
    if (url.pathname === '/health' && request.method === 'GET') {
      const status = env.AI_ENABLED !== 'true' ? 'disabled'
        : (!env.DEEPSEEK_API_KEY || !env.DEEPSEEK_MODEL ? 'not_ready' : 'ready');
      return json({ status }, 200, c.headers);
    }
    if (url.pathname === '/v1/evidence' && request.method === 'POST') {
      if (!env.RATE_LIMITER) return json({ error: 'rate_limit_not_configured' }, 503, c.headers);
      const limited = await env.RATE_LIMITER.limit({ key: await rateKey(request) });
      if (!limited.success) return json({ error: 'rate_limited' }, 429, c.headers);
      if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') return json({ error: 'json_required' }, 415, c.headers);
      let body;
      try { body = await request.json(); } catch { return json({ error: 'invalid_json' }, 400, c.headers); }
      const geneId = typeof body?.gene_id === 'string' ? body.gene_id.trim() : '';
      if (!geneId || !ALLOWED_GENE.test(geneId)) return json({ error: 'invalid_gene_id' }, 400, c.headers);
      try {
        const result = evidenceFor(await getSnapshot(), geneId);
        return result ? json({ status: 'evidence_loaded', ...result }, 200, c.headers)
          : json({ status: 'insufficient_evidence', evidence: [], boundary: 'The frozen public evidence bundle has no record for that gene.' }, 404, c.headers);
      } catch {
        return json({ error: 'frozen_evidence_unavailable' }, 503, c.headers);
      }
    }
    if (url.pathname !== '/v1/answer' || request.method !== 'POST') {
      return json({ error: 'not_found' }, 404, c.headers);
    }
    if (!env.RATE_LIMITER) return json({ error: 'rate_limit_not_configured' }, 503, c.headers);
    const limited = await env.RATE_LIMITER.limit({ key: await rateKey(request) });
    if (!limited.success) return json({ error: 'rate_limited' }, 429, c.headers);
    if (request.headers.get('content-type')?.split(';')[0] !== 'application/json') {
      return json({ error: 'json_required' }, 415, c.headers);
    }
    let body;
    try { body = await request.json(); } catch { return json({ error: 'invalid_json' }, 400, c.headers); }
    const check = validateBody(body);
    if (!check.ok) {
      if (check.code === 'medical_out_of_scope' || check.code === 'instruction_attack') {
        return json(refusal(check.code, body?.language), check.status, c.headers);
      }
      return json({ error: check.code }, check.status, c.headers);
    }
    if (!isAllowedResearchQuestion(check.question)) return json(refusal('question_out_of_scope', check.language), 422, c.headers);
    if (env.AI_ENABLED !== 'true') return json({ error: 'ai_not_enabled' }, 503, c.headers);
    if (!env.DEEPSEEK_API_KEY || !env.DEEPSEEK_MODEL) return json({ error: 'model_not_configured' }, 503, c.headers);
    let evidence;
    try { evidence = evidenceFor(await getSnapshot(), check.geneId); } catch { return json({ error: 'frozen_evidence_unavailable' }, 503, c.headers); }
    if (!evidence) return json({ status: 'insufficient_evidence', evidence: [], boundary: 'The frozen public evidence bundle has no record for that gene.' }, 404, c.headers);
    const result = await askEvidenceModel({ question: check.question, evidence, language: check.language, env });
    if (result.error) return json({ error: result.error }, 503, c.headers);
    return json({ status: 'answered', answer: result.answer, evidence: evidence.evidence, boundary: evidence.boundary }, 200, c.headers);
  },
};

export { validateBody, cors };

let snapshotPromise;
function getSnapshot() {
  snapshotPromise ||= loadFrozenEvidence();
  return snapshotPromise;
}
