/* XunZi-PD AI evidence Q&A — deployment gate.
 *
 * This Worker intentionally does NOT call a model yet. It enforces the public
 * boundary before an evidence retriever and model adapter are attached: CORS,
 * input size, out-of-scope refusals, and required platform rate limiting.
 *
 * Never add OPENAI_API_KEY to this repository, wrangler.toml, or browser code.
 */

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
      return json({ status: env.AI_ENABLED === 'true' ? 'not_ready' : 'disabled' }, 200, c.headers);
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
    if (env.AI_ENABLED !== 'true') return json({ error: 'ai_not_enabled' }, 503, c.headers);

    // Fail closed until an independently verified frozen-evidence retriever is added.
    // Do not use browser-supplied evidence here, and do not call a model without citations.
    return json({ error: 'evidence_retriever_not_configured' }, 503, c.headers);
  },
};

export { validateBody, cors };
